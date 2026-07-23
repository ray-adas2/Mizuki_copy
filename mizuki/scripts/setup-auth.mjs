/**
 * 初始化管理后台密码
 * 用法: node scripts/setup-auth.mjs <your-password>
 *
 * 生成 ADMIN_PASSWORD_HASH 并写入 .env 文件
 */
import { createHash, randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const envPath = join(rootDir, ".env");

function hashPassword(password) {
	const salt = randomBytes(16).toString("hex");
	const hash = createHash("sha256")
		.update(salt + password)
		.digest("hex");
	return `${salt}:${hash}`;
}

const password = process.argv[2];

if (!password) {
	console.log("用法: node scripts/setup-auth.mjs <你的密码>");
	console.log("示例: node scripts/setup-auth.mjs MySecret123");
	process.exit(1);
}

if (password.length < 6) {
	console.error("❌ 密码长度至少 6 位");
	process.exit(1);
}

const hash = hashPassword(password);

// 读取现有 .env 或创建
let envContent = "";
if (existsSync(envPath)) {
	envContent = await readFile(envPath, "utf-8");
	// 替换已有的 ADMIN_PASSWORD_HASH
	if (envContent.includes("ADMIN_PASSWORD_HASH=")) {
		envContent = envContent.replace(
			/ADMIN_PASSWORD_HASH=.*/,
			`ADMIN_PASSWORD_HASH=${hash}`,
		);
	} else {
		envContent += `\nADMIN_PASSWORD_HASH=${hash}\n`;
	}
} else {
	envContent = `# 管理后台密码哈希 (由 setup-auth.mjs 自动生成)\nADMIN_PASSWORD_HASH=${hash}\n`;
}

await writeFile(envPath, envContent, "utf-8");
console.log("✅ 密码已设置！");
console.log(`   哈希已写入: ${envPath}`);
console.log("   请记住你的密码，哈希值无法反推。");
