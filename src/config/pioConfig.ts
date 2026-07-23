import type { PioConfig } from "../types/config";

// Pio 看板娘配置
export const pioConfig: PioConfig = {
	enable: true, // 启用看板娘
	models: ["/pio/models/NOIR/noir.model3.json"], // 默认模型路径
	position: "left", // 模型位置
	width: 280, // 默认宽度
	height: 250, // 默认高度
	mode: "draggable", // 默认为可拖拽模式
	hiddenOnMobile: true, // 默认在移动设备上隐藏
	hideAboutMenu: false, // 隐藏内置 About 菜单按钮
	dialog: {
		welcome: "欢迎来到我的博客！", // 欢迎词
		touch: [
			"你在干嘛呢？",
			"别碰我啦！",
			"变态！",
			"不要欺负我!",
		], // 触摸提示
		home: "点这里回到首页哦~", // 首页提示
		skin: ["想看我的新衣服吗？", "新衣服好看吗~"], // 换装提示
		close: "QWQ 下次见~", // 关闭提示
		link: "https://github.com/LyraVoid/Mizuki", // 关于链接
	},
};
