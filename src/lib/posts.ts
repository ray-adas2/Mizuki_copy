/**
 * 文章 CRUD 操作 - 读写 src/content/posts/*.md
 */
import { readFile, writeFile, unlink, readdir, mkdir } from "node:fs/promises";
import { join, basename, dirname } from "node:path";
import { existsSync } from "node:fs";

const POSTS_DIR = join(process.cwd(), "src", "content", "posts");
const TRASH_DIR = join(POSTS_DIR, ".trash");

export interface PostFrontmatter {
	title: string;
	published: string; // YYYY-MM-DD
	updated?: string;
	description?: string;
	image?: string;
	tags?: string[];
	category?: string;
	lang?: string;
	draft?: boolean;
	pinned?: boolean;
	comment?: boolean;
	alias?: string;
	permalink?: string;
}

export interface Post {
	slug: string;
	frontmatter: PostFrontmatter;
	content: string;
	filePath: string;
}

/** 从文件名提取 slug (去掉 .md/.mdx 后缀) */
export function slugFromFile(filename: string): string {
	return filename.replace(/\.(md|mdx)$/, "");
}

/** 从 slug 生成文件名 */
export function fileFromSlug(slug: string): string {
	// slug 可能包含路径分隔符 (如 guide/getting-started)
	return `${slug}.md`;
}

/** 生成安全的 slug (标题 → 文件名) */
export function slugify(title: string): string {
	return title
		.toLowerCase()
		.replace(/[\s]+/g, "-")
		.replace(/[^\w一-鿿\-]/g, "")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 80) || "untitled";
}

/** 解析 Markdown 文件的 frontmatter 和正文 */
function parseFrontmatter(raw: string): {
	frontmatter: PostFrontmatter;
	content: string;
} {
	const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
	if (!match) {
		// 没有 frontmatter，返回默认值
		return {
			frontmatter: {
				title: "Untitled",
				published: new Date().toISOString().slice(0, 10),
			},
			content: raw,
		};
	}

	const yamlBlock = match[1];
	const content = match[2];

	// 简易 YAML 解析 (不引入依赖，只解析我们需要的类型)
	const frontmatter: Record<string, unknown> = {};
	const lines = yamlBlock.split("\n");

	for (const line of lines) {
		const kv = line.match(/^(\w[\w-]*):\s*(.*)$/);
		if (!kv) continue;
		const [, key, rawValue] = kv;
		const value = rawValue.trim();

		// 数组格式 [a, b, c]
		if (value.startsWith("[") && value.endsWith("]")) {
			frontmatter[key] = value
				.slice(1, -1)
				.split(",")
				.map((s) => s.trim().replace(/^['"](.*)['"]$/, "$1"))
				.filter(Boolean);
		}
		// 布尔值
		else if (value === "true") frontmatter[key] = true;
		else if (value === "false") frontmatter[key] = false;
		// 引用字符串
		else if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			frontmatter[key] = value.slice(1, -1);
		}
		// 空值
		else if (value === "" || value === "~") {
			frontmatter[key] = value === "" ? "" : undefined;
		}
		// 普通值
		else {
			frontmatter[key] = value;
		}
	}

	return {
		frontmatter: frontmatter as unknown as PostFrontmatter,
		content,
	};
}

/** 生成 frontmatter YAML 字符串 */
function serializeFrontmatter(fm: PostFrontmatter): string {
	const lines: string[] = [];

	for (const [key, value] of Object.entries(fm)) {
		if (value === undefined || value === null) continue;
		if (value === "") {
			lines.push(`${key}: ""`);
		} else if (Array.isArray(value)) {
			if (value.length === 0) {
				lines.push(`${key}: []`);
			} else {
				const items = value.map((v) => `"${v}"`).join(", ");
				lines.push(`${key}: [${items}]`);
			}
		} else if (typeof value === "boolean") {
			lines.push(`${key}: ${value}`);
		} else if (typeof value === "string") {
			// 包含特殊字符的字符串加引号
			if (/[:\n#\{\}\[\],&*!|>'"@`\s]/.test(value) || value === "") {
				lines.push(`${key}: "${value.replace(/"/g, '\\"')}"`);
			} else {
				lines.push(`${key}: ${value}`);
			}
		} else {
			lines.push(`${key}: ${value}`);
		}
	}

	return lines.join("\n");
}

/** 列出所有文章 */
export async function listPosts(): Promise<Post[]> {
	const posts: Post[] = [];

	async function walkDir(dir: string) {
		if (!existsSync(dir)) return;
		const entries = await readdir(dir, { withFileTypes: true });
		for (const entry of entries) {
			if (entry.name.startsWith(".")) continue;
			const fullPath = join(dir, entry.name);
			if (entry.isDirectory()) {
				await walkDir(fullPath);
			} else if (entry.name.endsWith(".md") || entry.name.endsWith(".mdx")) {
				const raw = await readFile(fullPath, "utf-8");
				const { frontmatter, content } = parseFrontmatter(raw);
				const relativePath = fullPath.replace(POSTS_DIR, "").replace(/^[/\\]/, "");
				const slug = slugFromFile(relativePath).replace(/\\/g, "/");
				posts.push({ slug, frontmatter, content, filePath: fullPath });
			}
		}
	}

	await walkDir(POSTS_DIR);
	// 按发布日期降序
	posts.sort((a, b) => {
		const da = a.frontmatter.published || "1970-01-01";
		const db = b.frontmatter.published || "1970-01-01";
		return db.localeCompare(da);
	});
	return posts;
}

/** 读取单篇文章 */
export async function getPost(slug: string): Promise<Post | null> {
	const filename = fileFromSlug(slug);
	const filePath = join(POSTS_DIR, filename);
	if (!existsSync(filePath)) return null;
	const raw = await readFile(filePath, "utf-8");
	const { frontmatter, content } = parseFrontmatter(raw);
	return { slug, frontmatter, content, filePath };
}

/** 创建/更新文章 */
export async function savePost(
	slug: string,
	frontmatter: PostFrontmatter,
	content: string,
): Promise<void> {
	const filename = fileFromSlug(slug);
	const filePath = join(POSTS_DIR, filename);

	// 确保目录存在
	const dir = dirname(filePath);
	if (!existsSync(dir)) {
		await mkdir(dir, { recursive: true });
	}

	const fmBlock = serializeFrontmatter(frontmatter);
	const markdown = `---\n${fmBlock}\n---\n\n${content}`;
	await writeFile(filePath, markdown, "utf-8");
}

/** 删除文章 (软删除到 .trash) */
export async function deletePost(slug: string): Promise<boolean> {
	const filename = fileFromSlug(slug);
	const filePath = join(POSTS_DIR, filename);
	if (!existsSync(filePath)) return false;

	// 确保回收站目录存在
	if (!existsSync(TRASH_DIR)) {
		await mkdir(TRASH_DIR, { recursive: true });
	}

	// 生成带时间戳的文件名避免冲突
	const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
	const trashName = `${timestamp}_${basename(filename)}`;
	const trashPath = join(TRASH_DIR, trashName);

	// 移动文件（复制后删除）
	const raw = await readFile(filePath, "utf-8");
	await writeFile(trashPath, raw, "utf-8");
	await unlink(filePath);
	return true;
}
