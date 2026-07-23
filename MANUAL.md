# 博客使用手册

## 快速入口

| 操作 | 地址 |
|------|------|
| 访问博客 | `http://你的IP/` |
| 管理后台 | `http://你的IP/admin/login` |
| 服务器连接 | XShell / XFtp |

---

## 一、文章管理

### 写文章
1. 打开 `/admin/login` → 输入密码登录
2. 点右上角 **＋ 写文章**
3. 填标题 → 点 **▼ 展开详情** → 填分类、标签、封面图
4. 编辑区写 Markdown 内容（支持拖拽图片上传）
5. **💾 保存文章** → 右上角 **🚀 发布更新**

### 编辑/删除文章
- 左侧文章列表点击文章 → 右侧编辑
- 鼠标悬停文章 → 右边出现 🗑️ 删除按钮

### 文章封面图
- XFtp 上传图片到 `/opt/mizuki/public/images/`
- 编辑文章时「封面图」填 `/images/xxx.jpg`

---

## 二、站点设置（管理后台 → ⚙️ 设置）

| 设置项 | 说明 | 改完后 |
|--------|------|--------|
| 站点标题 | 浏览器标签栏和首页显示的标题 | 保存设置 → 发布更新 |
| 副标题 | 首页副标题 | 同上 |
| 语言 | `zh_CN` 中文 / `en` 英文 / `ja` 日语 | 同上 |
| 主题色 | 色调 0-360，拖滑块 | 同上 |
| 头像路径 | XFtp 上传后填 `/images/avatar.webp` | 同上 |
| 昵称 | 个人信息卡上的名字 | 同上 |
| 个人简介 | 头像下方的简短介绍 | 同上 |
| 首页大标题 | Banner 上方的「わたしの部屋」 | 同上 |
| 关于页面 | 导航栏 → 关于 | 保存关于页面 → 发布更新 |

---

## 三、图片资源

### 首页轮播图
- XFtp 上传替换：`/opt/mizuki/public/assets/desktop-banner/1.webp` ~ `4.webp`
- 手机端：`/opt/mizuki/public/assets/mobile-banner/1.webp` ~ `4.webp`
- 替换后 `npx astro build`

### 头像
- XFtp 上传到 `/opt/mizuki/public/images/avatar.webp`
- 设置面板填 `/images/avatar.webp`

### Banner 副标题
- 直接编辑 `/opt/mizuki/src/config/siteConfig.ts`
- 搜 `subtitle`，改那几行日文

---

## 四、社交链接

编辑 `/opt/mizuki/src/config/profileConfig.ts`，改 `links` 数组：

```ts
links: [
    { name: "GitHub", icon: "fa7-brands:github", url: "https://github.com/你的用户名" },
    { name: "Bilibili", icon: "fa7-brands:bilibili", url: "https://space.bilibili.com/你的ID" },
],
```

不需要的直接删掉整段（包括花括号和逗号）。改完 `npx astro build`。

---

## 五、导航栏链接

编辑 `/opt/mizuki/src/config/navBarConfig.ts`，找 `url:` 字段替换。

改外部链接：
```bash
sed -i 's|旧链接|新链接|g' /opt/mizuki/src/config/navBarConfig.ts
```

改完 `npx astro build`。

---

## 六、相册

### 添加相册
```bash
mkdir -p /opt/mizuki/public/images/albums/相册名

cat > /opt/mizuki/public/images/albums/相册名/info.json << 'EOF'
{
    "title": "相册标题",
    "description": "相册描述",
    "date": "2026-07-23",
    "location": "地点",
    "tags": ["标签1", "标签2"],
    "layout": "masonry",
    "columns": 3
}
EOF
```

XFtp 上传图片到该目录，第一张照片同时作为封面的话额外放一个 `cover.jpg`。

### 删除相册
```bash
rm -rf /opt/mizuki/public/images/albums/相册名
```

### 修改相册
编辑 `/opt/mizuki/public/images/albums/相册名/info.json`。

每次改完都要 `npx astro build`。

---

## 七、项目展示

编辑 `/opt/mizuki/src/data/projects.ts`，改 `projectsData` 数组：

```ts
{
    id: "项目ID",
    title: "项目名",
    description: "项目简介",
    image: "/assets/projects/图片.webp",  // 图片放 public/assets/projects/
    category: "web",  // web / mobile / desktop / other
    techStack: ["技术1", "技术2"],
    status: "completed",  // completed / in-progress / planned
    sourceCode: "https://github.com/xxx",
    startDate: "2026-01-01",
    tags: ["标签"],
},
```

改完 `npx astro build`。

---

## 八、AI 工具

编辑 `/opt/mizuki/src/data/ai-tools.ts`，改 `aiToolsData` 数组：

```ts
{
    id: "工具ID",
    name: "工具名",
    description: { zh_CN: "中文简介" },
    icon: "material-symbols:图标名",
    category: "coding",  // chat / coding / image / audio / video / writing / search / other
    frequency: "daily",  // daily / weekly / occasional / experimental
    url: "https://xxx.com",
    tags: ["标签"],
    color: "#6366f1",
},
```

图标搜 https://icon-sets.iconify.design，格式 `集合名:图标名`。

---

## 九、公告

编辑 `/opt/mizuki/src/config/announcementConfig.ts`：

```ts
content: "你的公告内容",
enable: true,  // false 关闭
```

公告关闭一次后浏览器会记住，想重新看到：F12 → Application → Local Storage → 删 `announcementClosed`。

---

## 十、评论区

已启用 Giscus，基于 GitHub Discussions。无需维护。

---

## 十一、看板娘

修改对话文本：
```bash
nano /opt/mizuki/src/config/pioConfig.ts
```

改 `dialog` 部分，然后 `npx astro build`。

---

## 十二、已关闭的功能

以下功能当前关闭，在导航栏中不可见：

| 功能 | 开关位置 | 如何启用 |
|------|---------|----------|
| 追番 | `siteConfig.ts` | `anime: true` |
| 日记 | `siteConfig.ts` | `diary: true` |
| 技能 | `siteConfig.ts` | `skills: true` |
| 时间线 | `siteConfig.ts` | `timeline: true` |
| 设备 | `siteConfig.ts` | `devices: true` |

编辑：
```bash
nano /opt/mizuki/src/config/siteConfig.ts
```

找到 `featurePages`，把对应项改成 `true`。改完 `npx astro build`。

对应的数据文件：
- 追番：`/opt/mizuki/src/data/anime.ts`
- 日记：`/opt/mizuki/src/data/diary.ts`
- 技能：`/opt/mizuki/src/data/skills.ts`
- 时间线：`/opt/mizuki/src/data/timeline.ts`
- 设备：`/opt/mizuki/src/data/devices.ts`

---

## 十三、常用命令速查

```bash
# 重建网站（改配置/图片后）
cd /opt/mizuki && npx astro build

# 重启管理后台 API
pm2 restart mizuki-admin

# 查看管理后台日志
pm2 logs mizuki-admin --lines 20

# 从备份恢复
cp /opt/mizuki.backup/src/config/xxx.ts /opt/mizuki/src/config/xxx.ts

# 查看 PM2 状态
pm2 status

# 重启 Nginx
sudo systemctl reload nginx
```

---

## 十四、部署运维

### 远程同步（以后改代码时用）
```bash
# 服务器拉最新代码
cd /opt/mizuki && git pull origin main && npx astro build && pm2 restart mizuki-admin
```

### 修改流程总结
1. 图片/配置类 → XFtp 传文件或 SSH 编辑 → `npx astro build`
2. 文章/设置类 → 管理后台操作 → 发布更新
3. 代码类 → 本地编辑 → `git push` → 服务器 `git pull` → `npx astro build`
