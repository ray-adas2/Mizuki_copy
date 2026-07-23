# 博客搭建日志

> 基于 Mizuki 主题 | Astro 7 + Svelte 5 | 阿里云 2核2G Ubuntu 22.04

## 2026-07-22 ~ 2026-07-23

### 架构决策

**为什么不用纯静态部署**
Mizuki 是 Astro 静态博客，原生只能 SSH 编辑 Markdown。我们加了管理后台 + API 服务器，浏览器就能管理博客。

**架构选择**
- Astro `output: "static"`（原样，不改 SSR）
- 管理 API 独立 Node.js 服务器，端口 3001
- Nginx 代理：`/api/admin/` → 3001，其余 → 静态文件
- 前端 Svelte 组件 + Astro 页面

### 踩坑记录

| # | 问题 | 原因 | 解决 |
|---|------|------|------|
| 1 | pnpm 需要 Node.js 22 | 服务器只有 v20 | 升级 Node.js 22 |
| 2 | `pnpm build` 图片优化卡死服务器 | Sharp 处理 1289KB 大图，2G 内存跑爆 | 用 `npx astro build` 跳过优化 |
| 3 | `output: "hybrid"` 不存在 | Astro 7 移除了 hybrid 模式 | 改回 `static`，用独立服务器处理 API |
| 4 | 管理后台 CSS 不生效 | `<style is:global>` 污染了全局样式，`overflow: hidden` 导致博客无法滚动；Svelte scoped CSS 阻止 `:root` 变量定义 | 去掉 `is:global`，CSS 变量用 `:global(:root)`；最终将所有样式集中在 Astro 页面的 `<style is:global>` 里，选择器前加 `#admin-root` 前缀隔离 |
| 5 | `<button>` 不能嵌套 `<button>` | HTML 规范限制 | 外层改为 `<div role="button" tabindex="0">` |
| 6 | 配置保存后网站不更新 | 保存只写源文件，没重新构建 | 点右上角「发布更新」触发 `pnpm build` |
| 7 | 配置 API 写坏 `siteConfig.ts` | 正则 `(\/\/.*)?$` 把 URL 中的 `//` 当成注释删掉了 | 改成 `\s+\/\/.*$`，只在空格后面配注释 |
| 8 | 配置 API 写坏数字字段 | 先删逗号后删注释，顺序反了 | 先删注释再删逗号 |
| 9 | `trailingComma` 检测失败 | `trimEnd().endsWith(",")` 被行尾注释挡住 | 先去注释再检查逗号 |
| 10 | 中文标题文章 404 | URL 编码 `%E6%B5%8B...` 没解码 | `decodeURIComponent()` 解码 |
| 11 | `updated` 字段导致构建失败 | YAML 把带引号的 `"2026-07-23T..."` 当字符串，Astro 要求 Date 类型；不带时间的 `2026-07-23` 被 YAML 解析为 UTC 0 点 | 移除 `updated` 字段写入 |
| 12 | 用户说保存了但设置没变 | 点了「保存关于页面」按钮而不是「保存设置」按钮 | 合并成一个保存按钮 |
| 13 | 社交链接保存后丢失/不显示 | 配置文件里是数组结构，简单键值读写搞不定 | 从设置面板移除，直接编辑文件 |
| 14 | 站点链接/二维码/分享都是官方地址 | `siteURL` 还是官方演示 | 改成 `http://8.148.12.5/` |
| 15 | 文章编辑时间显示 10 小时前 | `published` 只有日期没有时间，YAML 当 UTC 0 点，东八区差 8 小时 | 已知时区偏差，对博客影响不大 |

### 最终成果

- 博客主页正常运行
- 管理后台：写/改/删文章、上传图片、保存设置、关于页面编辑器
- 设置面板：站点标题/副标题/语言/主题色/头像/昵称/首页大标题
- 评论：Giscus 集成 GitHub Discussions
- 看板娘：Live2D NOIR 模型，中文对话
- 社交链接/导航栏/Banner/相册/项目/AI工具：已全部替换
- 多余功能已关闭
- 服务器备份 `/opt/mizuki.backup`
- GitHub 仓库同步 `ray-adas2/Mizuki_copy`
