export type AIToolCategory =
	| "chat"
	| "coding"
	| "image"
	| "audio"
	| "video"
	| "writing"
	| "search"
	| "other";

export type AIToolFrequency =
	| "daily"
	| "weekly"
	| "occasional"
	| "experimental";

export type LocaleString = Partial<
	Record<"en" | "zh_CN" | "zh_TW" | "ja", string>
>;

export function getLocaleString(value: LocaleString, lang: string): string {
	return value[lang as keyof LocaleString] ?? value["en"] ?? "";
}

export interface AITool {
	id: string;
	name: string;
	description: LocaleString;
	icon: string;
	category: AIToolCategory;
	frequency: AIToolFrequency;
	url?: string;
	usage?: LocaleString;
	tags?: string[];
	color?: string;
}

// Replace the examples below with your own AI tools
export const aiToolsData: AITool[] = [
	{
		id: "claude-code",
		name: "Claude Code",
		description: {
			zh_CN: "Anthropic 推出的命令行 AI 编程助手，可在终端中直接生成和修改代码。",
		},
		icon: "material-symbols:terminal",
		category: "coding",
		frequency: "daily",
		url: "https://claude.ai",
		tags: ["编程", "CLI"],
		color: "#D97757",
	},
	{
		id: "trae",
		name: "Trae",
		description: {
			zh_CN: "字节跳动推出的 AI IDE，集成 Claude 模型，支持智能代码生成和项目级重构。",
		},
		icon: "material-symbols:deployed-code",
		category: "coding",
		frequency: "daily",
		url: "https://www.trae.ai",
		tags: ["编程", "IDE"],
		color: "#3B82F6",
	},
	{
		id: "copilot",
		name: "GitHub Copilot",
		description: {
			zh_CN: "GitHub 推出的 AI 代码补全工具，深度集成 VS Code 和 JetBrains。",
		},
		icon: "fa7-brands:github",
		category: "coding",
		frequency: "daily",
		url: "https://github.com/features/copilot",
		tags: ["编程", "补全"],
		color: "#2DA44E",
	},
	{
		id: "cursor",
		name: "Cursor",
		description: {
			zh_CN: "AI 驱动的代码编辑器，基于 VS Code，集成智能对话和代码生成。",
		},
		icon: "material-symbols:code",
		category: "coding",
		frequency: "daily",
		url: "https://cursor.sh",
		tags: ["编程", "编辑器"],
		color: "#6C5CE7",
	},
];
