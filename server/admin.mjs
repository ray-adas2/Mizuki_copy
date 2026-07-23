/**
 * 管理后台 API 服务器
 * 独立于 Astro 构建，处理文章管理、认证、构建等
 *
 * 用法: node server/admin.mjs
 * 默认端口: 3001 (通过 ADMIN_PORT 环境变量修改)
 */

import { createServer } from "node:http";
import {
	createHash,
	randomBytes,
	timingSafeEqual,
} from "node:crypto";
import {
	readFile,
	writeFile,
	unlink,
	readdir,
	mkdir,
} from "node:fs/promises";
import { join, basename, dirname } from "node:path";
import { existsSync } from "node:fs";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

// ============================================================
// 配置
// ============================================================
const PORT = parseInt(process.env.ADMIN_PORT || "3001", 10);
const ROOT_DIR = join(import.meta.dirname, "..");
const POSTS_DIR = join(ROOT_DIR, "src", "content", "posts");
const PUBLIC_DIR = join(ROOT_DIR, "public");
const TRASH_DIR = join(POSTS_DIR, ".trash");
const TOKEN_MAX_AGE = 24 * 60 * 60 * 1000;

const VALID_TOKENS = new Map();

// ============================================================
// 认证
// ============================================================
function hashPassword(password) {
	const salt = randomBytes(16).toString("hex");
	const hash = createHash("sha256").update(salt + password).digest("hex");
	return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
	const [salt, hash] = stored.split(":");
	if (!salt || !hash) return false;
	const expected = createHash("sha256").update(salt + password).digest("hex");
	return timingSafeEqual(Buffer.from(hash), Buffer.from(expected));
}

function createToken() {
	const token = "mzk_" + randomBytes(32).toString("hex");
	VALID_TOKENS.set(token, Date.now() + TOKEN_MAX_AGE);
	return token;
}

function verifyToken(token) {
	if (!token?.startsWith("mzk_")) return false;
	const expiresAt = VALID_TOKENS.get(token);
	if (!expiresAt) return false;
	if (Date.now() > expiresAt) {
		VALID_TOKENS.delete(token);
		return false;
	}
	if (expiresAt - Date.now() < TOKEN_MAX_AGE - 3600_000) {
		VALID_TOKENS.set(token, Date.now() + TOKEN_MAX_AGE);
	}
	return true;
}

function deleteToken(token) {
	VALID_TOKENS.delete(token);
}

function getStoredHash() {
	// 尝试从各位置读取
	const hash = process.env.ADMIN_PASSWORD_HASH;
	if (!hash) {
		// 尝试从 .env 文件读取
		const envPath = join(ROOT_DIR, ".env");
		if (existsSync(envPath)) {
			try {
				const envContent = readFileSync(envPath, "utf-8");
				const match = envContent.match(/ADMIN_PASSWORD_HASH=(.+)/);
				if (match) return match[1].trim();
			} catch {}
		}
	}
	return hash || null;
}

// 需要用 readFileSync 读取 .env
import { readFileSync, writeFileSync } from "node:fs";

// ============================================================
// 文章管理
// ============================================================
function slugify(title) {
	return title
		.toLowerCase()
		.replace(/[\s]+/g, "-")
		.replace(/[^\w一-鿿\-]/g, "")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 80) || "untitled";
}

function slugFromFile(filename) {
	return filename.replace(/\.(md|mdx)$/, "");
}

function fileFromSlug(slug) {
	return `${slug}.md`;
}

function parseFrontmatter(raw) {
	const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
	if (!match) {
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
	const frontmatter = {};
	const lines = yamlBlock.split("\n");

	for (const line of lines) {
		const kv = line.match(/^(\w[\w-]*):\s*(.*)$/);
		if (!kv) continue;
		const [, key, rawValue] = kv;
		const value = rawValue.trim();

		if (value.startsWith("[") && value.endsWith("]")) {
			frontmatter[key] = value
				.slice(1, -1)
				.split(",")
				.map((s) => s.trim().replace(/^['"](.*)['"]$/, "$1"))
				.filter(Boolean);
		} else if (value === "true") {
			frontmatter[key] = true;
		} else if (value === "false") {
			frontmatter[key] = false;
		} else if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			frontmatter[key] = value.slice(1, -1);
		} else if (value === "" || value === "~") {
			frontmatter[key] = value === "" ? "" : undefined;
		} else {
			frontmatter[key] = value;
		}
	}

	return { frontmatter, content };
}

function serializeFrontmatter(fm) {
	const lines = [];
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

async function listPosts() {
	const posts = [];

	async function walkDir(dir) {
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
	posts.sort((a, b) => {
		const da = a.frontmatter.published || "1970-01-01";
		const db = b.frontmatter.published || "1970-01-01";
		return db.localeCompare(da);
	});
	return posts;
}

async function getPost(slug) {
	const filename = fileFromSlug(slug);
	const filePath = join(POSTS_DIR, filename);
	if (!existsSync(filePath)) return null;
	const raw = await readFile(filePath, "utf-8");
	const { frontmatter, content } = parseFrontmatter(raw);
	return { slug, frontmatter, content, filePath };
}

async function savePost(slug, frontmatter, content) {
	const filename = fileFromSlug(slug);
	const filePath = join(POSTS_DIR, filename);
	const dir = dirname(filePath);
	if (!existsSync(dir)) {
		await mkdir(dir, { recursive: true });
	}
	const fmBlock = serializeFrontmatter(frontmatter);
	const markdown = `---\n${fmBlock}\n---\n\n${content}`;
	await writeFile(filePath, markdown, "utf-8");
}

async function deletePost(slug) {
	const filename = fileFromSlug(slug);
	const filePath = join(POSTS_DIR, filename);
	if (!existsSync(filePath)) return false;

	if (!existsSync(TRASH_DIR)) {
		await mkdir(TRASH_DIR, { recursive: true });
	}

	const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
	const trashName = `${timestamp}_${basename(filename)}`;
	const trashPath = join(TRASH_DIR, trashName);

	const raw = await readFile(filePath, "utf-8");
	await writeFile(trashPath, raw, "utf-8");
	await unlink(filePath);
	return true;
}

// ============================================================
// 构建管理
// ============================================================
let isBuilding = false;
let lastBuildLog = "";
let lastBuildTime = 0;
let lastBuildError = "";

async function triggerBuild() {
	if (isBuilding) {
		return { building: true, lastBuildTime, lastBuildLog, lastBuildError, success: false };
	}

	isBuilding = true;
	lastBuildLog = "构建开始...\n";
	lastBuildError = "";

	try {
		const { stdout, stderr } = await execAsync("pnpm build", {
			cwd: ROOT_DIR,
			timeout: 300_000,
			env: { ...process.env, NODE_ENV: "production" },
		});
		lastBuildLog = stdout + (stderr ? `\n[stderr]\n${stderr}` : "");
		lastBuildTime = Date.now();
	} catch (err) {
		lastBuildLog = err.stdout || "";
		lastBuildError = err.stderr || err.message || "未知错误";
		lastBuildTime = Date.now();
	} finally {
		isBuilding = false;
	}

	return {
		building: false,
		lastBuildTime,
		lastBuildLog,
		lastBuildError,
		success: !lastBuildError && lastBuildTime > 0,
	};
}

// ============================================================
// HTTP 工具
// ============================================================
function json(res, data, status = 200, extraHeaders = {}) {
	res.writeHead(status, { "Content-Type": "application/json", ...extraHeaders });
	res.end(JSON.stringify(data));
}

function getBody(req) {
	return new Promise((resolve) => {
		let body = "";
		req.on("data", (chunk) => (body += chunk));
		req.on("end", () => {
			try {
				resolve(JSON.parse(body));
			} catch {
				resolve(null);
			}
		});
	});
}

function getCookie(req, name) {
	const cookie = req.headers.cookie;
	if (!cookie) return null;
	const match = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
	return match ? match[1] : null;
}

function setCookie(res, name, value, maxAge) {
	res.setHeader(
		"Set-Cookie",
		`${name}=${value}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax`,
	);
}

function clearCookie(res, name) {
	res.setHeader("Set-Cookie", `${name}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`);
}

// ============================================================
// 认证中间件
// ============================================================
function checkAuth(req, res) {
	const token = getCookie(req, "admin_token");
	if (!token || !verifyToken(token)) {
		json(res, { error: "未登录" }, 401);
		return false;
	}
	return true;
}

// ============================================================
// 路由处理
// ============================================================
async function handleAuth(req, res) {
	const method = req.method;

	// GET - 检查登录状态
	if (method === "GET") {
		const token = getCookie(req, "admin_token");
		const ok = token ? verifyToken(token) : false;
		return json(res, { ok });
	}

	// POST - 登录
	if (method === "POST") {
		const body = await getBody(req);
		if (!body?.password) {
			return json(res, { error: "请输入密码" }, 400);
		}

		const storedHash = getStoredHash();
		if (!storedHash) {
			return json(res, { error: "服务器未配置管理密码" }, 500);
		}

		if (!verifyPassword(body.password, storedHash)) {
			return json(res, { error: "密码错误" }, 401);
		}

		const token = createToken();
		setCookie(res, "admin_token", token, TOKEN_MAX_AGE / 1000);
		return json(res, { ok: true });
	}

	// DELETE - 登出
	if (method === "DELETE") {
		const token = getCookie(req, "admin_token");
		if (token) deleteToken(token);
		clearCookie(res, "admin_token");
		return json(res, { ok: true });
	}

	json(res, { error: "Method not allowed" }, 405);
}

async function handlePosts(req, res) {
	const method = req.method;
	// 解析 /api/admin/posts 或 /api/admin/posts/some-slug
	const url = new URL(req.url, "http://localhost");
	const path = url.pathname.replace(/^\/api\/admin\/posts\/?/, "");
	const slug = path ? decodeURIComponent(path) : null;

	// GET /api/admin/posts - 列表
	if (method === "GET" && !slug) {
		const posts = await listPosts();
		const result = posts.map((p) => ({
			slug: p.slug,
			frontmatter: p.frontmatter,
			excerpt: p.content.slice(0, 200),
		}));
		return json(res, result);
	}

	// GET /api/admin/posts/:slug - 单篇
	if (method === "GET" && slug) {
		const post = await getPost(slug);
		if (!post) return json(res, { error: "文章不存在" }, 404);
		return json(res, { slug: post.slug, frontmatter: post.frontmatter, content: post.content });
	}

	// POST /api/admin/posts - 创建
	if (method === "POST") {
		const body = await getBody(req);
		if (!body?.frontmatter?.title) {
			return json(res, { error: "标题不能为空" }, 400);
		}

		const fm = { ...body.frontmatter };
		if (!fm.published) fm.published = new Date().toISOString().slice(0, 10);

		const newSlug = slugify(fm.title);
		await savePost(newSlug, fm, body.content || "");

		return json(res, { ok: true, slug: newSlug }, 201);
	}

	// PUT /api/admin/posts/:slug - 更新
	if (method === "PUT" && slug) {
		const existing = await getPost(slug);
		if (!existing) return json(res, { error: "文章不存在" }, 404);

		const body = await getBody(req);
		if (!body?.frontmatter?.title) {
			return json(res, { error: "标题不能为空" }, 400);
		}

			await savePost(slug, body.frontmatter, body.content || "");
		return json(res, { ok: true, slug });
	}

	// DELETE /api/admin/posts/:slug - 删除
	if (method === "DELETE" && slug) {
		const ok = await deletePost(slug);
		if (!ok) return json(res, { error: "文章不存在" }, 404);
		return json(res, { ok: true });
	}

	json(res, { error: "Method not allowed" }, 405);
}

async function handleUpload(req, res) {
	if (req.method !== "POST") {
		return json(res, { error: "Method not allowed" }, 405);
	}

	// 解析 multipart/form-data
	const contentType = req.headers["content-type"] || "";
	if (!contentType.includes("multipart/form-data")) {
		return json(res, { error: "需要 multipart/form-data" }, 400);
	}

	const boundary = contentType.split("boundary=")[1];
	if (!boundary) return json(res, { error: "缺少 boundary" }, 400);

	const body = await new Promise((resolve) => {
		const chunks = [];
		req.on("data", (c) => chunks.push(c));
		req.on("end", () => resolve(Buffer.concat(chunks)));
	});

	// 简易 multipart 解析
	const bodyStr = body.toString("binary");
	const parts = bodyStr.split(`--${boundary}`);
	for (const part of parts) {
		if (!part.includes("Content-Disposition")) continue;

		const headerEnd = part.indexOf("\r\n\r\n");
		if (headerEnd === -1) continue;

		const headers = part.slice(0, headerEnd);
		const fileMatch = headers.match(/name="file"[^;]*;?\s*filename="([^"]*)"/);
		if (!fileMatch) continue;

		const originalName = fileMatch[1];
		const fileContent = part.slice(headerEnd + 4, part.lastIndexOf("\r\n") > -1 ? part.lastIndexOf("\r\n") : undefined);
		const buffer = Buffer.from(fileContent, "binary");

		// 验证文件类型
		const ext = originalName.split(".").pop()?.toLowerCase() || "png";
		const mimeTypes = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif", svg: "image/svg+xml" };
		if (!mimeTypes[ext]) {
			return json(res, { error: "仅支持 PNG/JPG/WebP/GIF/SVG 格式" }, 400);
		}
		if (buffer.length > 10 * 1024 * 1024) {
			return json(res, { error: "文件大小不能超过 10MB" }, 400);
		}

		// 保存文件
		const hash = randomBytes(8).toString("hex");
		const today = new Date().toISOString().slice(0, 10).replace(/-/g, "/");
		const filename = `${hash}.${ext}`;
		const uploadDir = join(PUBLIC_DIR, "images", today);

		if (!existsSync(uploadDir)) {
			await mkdir(uploadDir, { recursive: true });
		}

		await writeFile(join(uploadDir, filename), buffer);
		const url = `/images/${today}/${filename}`;
		return json(res, { ok: true, url, filename: `${today}/${filename}` });
	}

	json(res, { error: "未找到上传文件" }, 400);
}

async function handleRebuild(req, res) {
	if (req.method === "GET") {
		return json(res, {
			building: isBuilding,
			lastBuildTime,
			lastBuildLog,
			lastBuildError,
			success: !lastBuildError && lastBuildTime > 0,
		});
	}

	if (req.method === "POST") {
		const status = await triggerBuild();
		return json(res, status, status.success ? 200 : 500);
	}

	json(res, { error: "Method not allowed" }, 405);
}

// ============================================================
// 配置管理
// ============================================================
const CONFIG_FILES = {
	site: join(ROOT_DIR, "src", "config", "siteConfig.ts"),
	profile: join(ROOT_DIR, "src", "config", "profileConfig.ts"),
};

// 简单的字段读写：从 TS 源文件中提取/替换 export const 值
function readConfigField(content, fieldPath) {
	const parts = fieldPath.split(".");
	let section = content;

	for (let i = 0; i < parts.length - 1; i++) {
		const re = new RegExp(`${parts[i]}:\\s*\\{`, "m");
		const m = section.match(re);
		if (!m) return undefined;
		section = section.slice(m.index);
	}

	const key = parts[parts.length - 1];
	// 匹配整行：key: value
	const re = new RegExp(`${key}:\\s*(.+)`, "m");
	const m = section.match(re);
	if (!m) return undefined;
	let val = m[1].trim();
	// 顺序很重要：先删注释再删逗号，否则逗号被注释挡住删不掉
	val = val.replace(/\s+\/\/.*$/, ""); // 去掉行尾注释
	val = val.replace(/,\s*$/, "");        // 去掉尾随逗号
	// 去掉字符串引号
	if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
		val = val.slice(1, -1);
	}
	if (val === "true") return true;
	if (val === "false") return false;
	if (/^\d+$/.test(val)) return Number(val);
	return val;
}

function writeConfigField(content, fieldPath, value) {
	const parts = fieldPath.split(".");
	let section = content;
	let sectionOffset = 0;

	for (let i = 0; i < parts.length - 1; i++) {
		const re = new RegExp(`${parts[i]}:\\s*\\{`, "m");
		const m = section.match(re);
		if (!m) return null;
		sectionOffset += m.index;
		section = section.slice(m.index);
	}

	const key = parts[parts.length - 1];
	const lineRe = new RegExp(`^(\\s*)(${key}:\\s*)(.+)$`, "m");
	const m = section.match(lineRe);
	if (!m) return null;

	const indent = m[1];
	const prefix = m[2];
	const oldLine = m[0];
	const localIndex = m.index;

	let newVal;
	if (typeof value === "string") newVal = `"${value}"`;
	else if (typeof value === "boolean") newVal = String(value);
	else if (typeof value === "number") newVal = String(value);
	else return null;

	// 检测逗号：先去掉注释，再判断是否以逗号结尾
	const beforeComment = oldLine.replace(/\s*\/\/.*$/, "").trimEnd();
	const trailingComma = beforeComment.endsWith(",") ? "," : "";
	// 保留原行注释
	const commentMatch = oldLine.match(/\s+\/\/.*$/);
	const trailingComment = commentMatch ? commentMatch[0] : "";

	const newLine = `${indent}${prefix}${newVal}${trailingComma}${trailingComment}`;
	const globalIndex = sectionOffset + localIndex;
	return content.substring(0, globalIndex) + newLine + content.substring(globalIndex + oldLine.length);
}

// 预定义可编辑字段
const EDITABLE_FIELDS = [
	// siteConfig.ts
	{ file: "site", key: "title", label: "站点标题" },
	{ file: "site", key: "subtitle", label: "站点副标题" },
	{ file: "site", key: "banner.homeText.title", label: "首页大标题" },
	{ file: "site", key: "lang", label: "语言 (en/zh_CN/ja)" },
	{ file: "site", key: "themeColor.hue", label: "主题色 (0-360)" },
	// profileConfig.ts
	{ file: "profile", key: "avatar", label: "头像路径" },
	{ file: "profile", key: "name", label: "昵称" },
	{ file: "profile", key: "bio", label: "个人简介" },
];

async function handleConfig(req, res) {
	// GET - 读取配置
	if (req.method === "GET") {
		const result = {};
		for (const field of EDITABLE_FIELDS) {
			try {
				const content = readFileSync(CONFIG_FILES[field.file], "utf-8");
				result[field.key] = readConfigField(content, field.key);
			} catch { result[field.key] = null; }
		}
			return json(res, { fields: EDITABLE_FIELDS, values: result });
	}

	// PUT - 更新配置
	if (req.method === "PUT") {
		const body = await getBody(req);
		if (!body || typeof body !== "object") return json(res, { error: "无效数据" }, 400);

		const updatesByFile = {};
		for (const [key, value] of Object.entries(body)) {
			const field = EDITABLE_FIELDS.find(f => f.key === key) || { file: "profile", key };
			const fileKey = field.file;
			if (!updatesByFile[fileKey]) updatesByFile[fileKey] = {};
			updatesByFile[fileKey][key] = value;
		}

		try {
			for (const [fileKey, updates] of Object.entries(updatesByFile)) {
				let content = readFileSync(CONFIG_FILES[fileKey], "utf-8");
				for (const [key, value] of Object.entries(updates)) {
					const newContent = writeConfigField(content, key, value);
					if (newContent !== null) content = newContent;
				}
				writeFileSync(CONFIG_FILES[fileKey], content, "utf-8");
			}
			return json(res, { ok: true });
		} catch (err) {
			return json(res, { error: "保存失败: " + err.message }, 500);
		}
	}

	json(res, { error: "Method not allowed" }, 405);
}

// ============================================================
// 关于页面管理
// ============================================================
const ABOUT_PATH = join(ROOT_DIR, "src", "content", "spec", "about.md");

async function handleAbout(req, res) {
	if (req.method === "GET") {
		try {
			if (!existsSync(ABOUT_PATH)) return json(res, { content: "", frontmatter: { title: "关于" } });
			const raw = readFileSync(ABOUT_PATH, "utf-8");
			const { frontmatter, content } = parseFrontmatter(raw);
			return json(res, { frontmatter, content });
		} catch (err) {
			return json(res, { error: "读取失败" }, 500);
		}
	}

	if (req.method === "PUT") {
		const body = await getBody(req);
		if (!body) return json(res, { error: "无效数据" }, 400);
		const fm = { title: "关于", ...body.frontmatter };
		const fmBlock = serializeFrontmatter(fm);
		const md = `---\n${fmBlock}\n---\n\n${body.content || ""}`;
		await writeFile(ABOUT_PATH, md, "utf-8");
		return json(res, { ok: true });
	}

	json(res, { error: "Method not allowed" }, 405);
}

// ============================================================
// 路由分发
// ============================================================
function route(req, res) {
	// CORS (允许同源)
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
	res.setHeader("Access-Control-Allow-Headers", "Content-Type");

	if (req.method === "OPTIONS") {
		res.writeHead(204);
		return res.end();
	}

	const url = new URL(req.url, "http://localhost");
	const path = url.pathname;

	try {
		// 认证接口不需要鉴权
		if (path === "/api/admin/auth") {
			return handleAuth(req, res);
		}

		// 其他接口需要鉴权
		if (!checkAuth(req, res)) return;

		if (path.startsWith("/api/admin/posts")) {
			return handlePosts(req, res);
		}
		if (path === "/api/admin/upload") {
			return handleUpload(req, res);
		}
		if (path === "/api/admin/rebuild") {
			return handleRebuild(req, res);
		}
		if (path === "/api/admin/config") {
			return handleConfig(req, res);
		}
		if (path === "/api/admin/about") {
			return handleAbout(req, res);
		}

		json(res, { error: "Not found" }, 404);
	} catch (err) {
		console.error("API Error:", err);
		json(res, { error: err.message || "服务器错误" }, 500);
	}
}

// ============================================================
// 启动服务器
// ============================================================
const server = createServer(route);

server.listen(PORT, () => {
	console.log(`🔧 管理后台 API 服务器已启动: http://localhost:${PORT}`);
	console.log(`   API 端点: /api/admin/auth, posts, upload, rebuild, config`);

	const storedHash = getStoredHash();
	if (!storedHash) {
		console.log(`\n⚠️  尚未设置管理密码！请运行:`);
		console.log(`   node scripts/setup-auth.mjs <你的密码>`);
	} else {
		console.log(`   ✅ 管理密码已配置`);
	}
});
