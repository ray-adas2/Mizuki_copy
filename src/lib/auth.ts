/**
 * 简易认证模块 - 单用户密码认证
 * 密码存 .env 的 ADMIN_PASSWORD_HASH (bcrypt)
 * 登录后设置 httpOnly cookie
 */
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const TOKEN_PREFIX = "mzk_";
// 24小时过期
const TOKEN_MAX_AGE = 24 * 60 * 60 * 1000;

// 内存中存储有效 token (生产环境单实例足够)
const validTokens = new Map<string, number>(); // token -> expiresAt

/** 生成 bcrypt 风格的简易密码哈希 (无外部依赖) */
export function hashPassword(password: string): string {
	const salt = randomBytes(16).toString("hex");
	const hash = createHash("sha256")
		.update(salt + password)
		.digest("hex");
	return `${salt}:${hash}`;
}

/** 验证密码 */
export function verifyPassword(password: string, stored: string): boolean {
	const [salt, hash] = stored.split(":");
	if (!salt || !hash) return false;
	const expected = createHash("sha256")
		.update(salt + password)
		.digest("hex");
	return timingSafeEqual(Buffer.from(hash), Buffer.from(expected));
}

/** 创建登录 token */
export function createToken(): string {
	const token = TOKEN_PREFIX + randomBytes(32).toString("hex");
	validTokens.set(token, Date.now() + TOKEN_MAX_AGE);
	return token;
}

/** 验证 token，返回 true 表示有效 */
export function verifyToken(token: string): boolean {
	if (!token?.startsWith(TOKEN_PREFIX)) return false;
	const expiresAt = validTokens.get(token);
	if (!expiresAt) return false;
	if (Date.now() > expiresAt) {
		validTokens.delete(token);
		return false;
	}
	// 续期：使用超过 1 小时后自动续期
	if (expiresAt - Date.now() < TOKEN_MAX_AGE - 3600_000) {
		validTokens.set(token, Date.now() + TOKEN_MAX_AGE);
	}
	return true;
}

/** 删除 token (登出) */
export function deleteToken(token: string): void {
	validTokens.delete(token);
}

/** Cookie 名称 */
export const AUTH_COOKIE = "admin_token";

/** 从请求中提取认证 token */
export function extractToken(request: Request): string | null {
	const cookie = request.headers.get("cookie");
	if (!cookie) return null;
	const match = cookie.match(
		new RegExp(`(?:^|;\\s*)${AUTH_COOKIE}=([^;]*)`),
	);
	return match ? match[1] : null;
}

/** 生成 Set-Cookie 头 */
export function setAuthCookie(token: string): string {
	return `${AUTH_COOKIE}=${token}; HttpOnly; Path=/; Max-Age=${TOKEN_MAX_AGE / 1000}; SameSite=Lax`;
}

/** 清除 Cookie */
export function clearAuthCookie(): string {
	return `${AUTH_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`;
}
