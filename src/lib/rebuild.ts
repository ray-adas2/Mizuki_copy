/**
 * 触发博客重新构建
 */
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

let isBuilding = false;
let lastBuildLog = "";
let lastBuildTime = 0;
let lastBuildError = "";

export interface BuildStatus {
	building: boolean;
	lastBuildTime: number;
	lastBuildLog: string;
	lastBuildError: string;
	success: boolean;
}

/** 获取当前构建状态 */
export function getBuildStatus(): BuildStatus {
	return {
		building: isBuilding,
		lastBuildTime,
		lastBuildLog,
		lastBuildError,
		success: !lastBuildError && lastBuildTime > 0,
	};
}

/** 触发构建 */
export async function triggerBuild(): Promise<BuildStatus> {
	if (isBuilding) {
		return getBuildStatus();
	}

	isBuilding = true;
	lastBuildLog = "构建开始...\n";
	lastBuildError = "";

	try {
		const cwd = process.cwd();
		const { stdout, stderr } = await execAsync("pnpm build", {
			cwd,
			timeout: 300_000, // 5 分钟超时
			env: { ...process.env, NODE_ENV: "production" },
		});

		lastBuildLog = stdout + (stderr ? `\n[stderr]\n${stderr}` : "");
		lastBuildTime = Date.now();
	} catch (err: unknown) {
		const execErr = err as { stdout?: string; stderr?: string; message?: string };
		lastBuildLog = execErr.stdout || "";
		lastBuildError = execErr.stderr || execErr.message || "未知错误";
		lastBuildTime = Date.now();
	} finally {
		isBuilding = false;
	}

	return getBuildStatus();
}
