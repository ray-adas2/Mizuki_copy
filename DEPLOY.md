# 服务器部署操作手册

> 每一步都附带解释，让你知道为什么要执行这个命令

---

## 前提准备

你需要知道以下信息：
- **服务器公网 IP**：`x.x.x.x`（阿里云控制台能看到）
- **SSH 登录方式**：密码 或 密钥（阿里云创建时设置的 root 密码）
- **本地项目路径**：当前这个 `mizuki-blog/` 文件夹

---

## 第一步：把项目传到服务器

在你本地的 **Windows 终端**（PowerShell 或 CMD）执行：

```powershell
# 把整个项目文件夹上传到服务器的 /opt/mizuki 目录
# 替换 x.x.x.x 为你的服务器 IP
scp -r D:\Mizuku\mizuki-blog root@x.x.x.x:/opt/mizuki
```

> **解释**：`scp` 是安全复制命令，`-r` 递归复制整个文件夹。把本地的 `mizuki-blog` 文件夹完整传到服务器的 `/opt/mizuki` 位置。

如果文件大、网络慢，可以先在服务器上克隆原版 Mizuki，再只传修改过的文件：

```powershell
# 方式二：先只传修改的文件（更快）
# 以后管理后台更新时用这个就够了
scp -r D:\Mizuku\mizuki-blog\src\pages\admin root@x.x.x.x:/opt/mizuki/src/pages/
scp -r D:\Mizuku\mizuki-blog\src\components\admin root@x.x.x.x:/opt/mizuki/src/components/
scp -r D:\Mizuku\mizuki-blog\server root@x.x.x.x:/opt/mizuki/
scp D:\Mizuku\mizuki-blog\scripts\setup-auth.mjs root@x.x.x.x:/opt/mizuki/scripts/
```

---

## 第二步：SSH 登录服务器

```powershell
# 在 Windows 终端执行，输入密码后进入服务器
ssh root@x.x.x.x
```

之后的所有命令都在**服务器上**执行。

---

## 第三步：安装基础环境

```bash
# 1. 更新系统软件包
sudo apt update && sudo apt upgrade -y
```
> **解释**：更新 Ubuntu 软件包列表并升级已安装的软件。相当于给系统打个补丁。

```bash
# 2. 安装 Node.js 22
# 使用 NodeSource 官方源（比 apt 自带的版本新）
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# 验证安装
node --version   # 应该显示 v22.x.x
npm --version    # 应该显示 10.x.x
```
> **解释**：Node.js 是用来运行 JavaScript 的运行时。Mizuki（Astro）需要 Node.js 18+。

```bash
# 3. 安装 pnpm（包管理器，比 npm 更快更省空间）
npm install -g pnpm

# 验证
pnpm --version   # 应该显示 9.x 或更高
```
> **解释**：pnpm 是 Mizuki 项目使用的包管理器，用于安装项目依赖。

```bash
# 4. 安装 Nginx（Web 服务器）
sudo apt install -y nginx

# 启动 Nginx
sudo systemctl start nginx
sudo systemctl enable nginx   # 设置开机自启

# 验证：浏览器访问 http://你的服务器IP
# 应该看到 Nginx 欢迎页面
```
> **解释**：Nginx 是一个高性能的 Web 服务器，用来接收用户请求并返回网页。

```bash
# 5. 安装 PM2（进程守护工具）
npm install -g pm2

# 设置 PM2 开机自启
pm2 startup
# 执行上面命令输出的那行代码（通常以 sudo env 开头）
```
> **解释**：PM2 可以让你的 Node.js 程序在后台持续运行，崩溃自动重启，服务器重启后自动启动。

---

## 第四步：安装项目依赖并配置

```bash
# 1. 进入项目目录
cd /opt/mizuki
```

```bash
# 2. 安装项目依赖（可能需要几分钟）
pnpm install
```
> **解释**：下载 Mizuki 需要的所有第三方库到 `node_modules/` 目录。

```bash
# 3. 设置管理密码
# 把 "你的密码" 替换成你想用的密码
node scripts/setup-auth.mjs 你的密码
```
> **解释**：生成密码哈希，写入 `.env` 文件。之后你通过这个密码登录管理后台。

```bash
# 4. （可选）修改博客基本信息
# 用 nano 编辑器修改站点配置
nano src/config/siteConfig.ts
```
> **需要改的地方**：
> - `title`: 改成你的博客名 → `"我的博客"`
> - `siteURL`: 先用 IP → `"http://你的IP/"`
> - `lang`: → `"zh_CN"`（中文）

> **nano 快捷键**：
> - `Ctrl+O` 保存
> - `Ctrl+X` 退出
> - 上下箭头移动光标

```bash
# 5. 构建网站（生成静态文件）
pnpm build
```
> **解释**：把 Markdown 文章、模板、样式打包成纯 HTML/CSS/JS，输出到 `dist/` 目录。

---

## 第五步：启动管理后台 API 服务器

```bash
# 1. 先手动测试一下管理后台 API
node server/admin.mjs

# 看到 "管理后台 API 服务器已启动" 就对了
# 按 Ctrl+C 停止，接下来用 PM2 管理
```

```bash
# 2. 用 PM2 正式启动（后台运行 + 自动重启）
pm2 start server/admin.mjs --name mizuki-admin

# 3. 保存 PM2 进程列表
pm2 save
```
> **解释**：PM2 会在后台运行管理 API 服务器，端口 3001。服务器重启后 PM2 会自动恢复。

```bash
# 常用 PM2 命令（备用）
pm2 status              # 查看所有进程状态
pm2 logs mizuki-admin   # 查看管理后台日志
pm2 restart mizuki-admin # 重启管理后台
```

---

## 第六步：配置 Nginx

Nginx 是"大门"，所有访问先到 Nginx，然后 Nginx 决定：
- 访问博客 → 返回 `dist/` 里的静态文件
- 访问 `/api/admin/` → 转发给管理 API 服务器（端口 3001）

```bash
# 1. 打开阿里云安全组（在阿里云网页控制台操作！）
# 入方向规则添加：
#   - 端口 80 (HTTP)
#   - 端口 443 (HTTPS)  
#   - 端口 22 (SSH，应该已经有了)
# 授权对象：0.0.0.0/0
```

> ⚠️ **这一步很关键！** 在阿里云网页控制台 → 轻量应用服务器 → 防火墙 → 添加规则。
> 如果只开了服务器防火墙但没开阿里云安全组，外网还是访问不了。

```bash
# 2. 创建 Nginx 配置文件
sudo nano /etc/nginx/sites-available/blog
```

把以下内容粘贴进去（右键粘贴）：

```nginx
# HTTP 服务器（先配 80 端口测试，后面再加 SSL）
server {
    listen 80;
    server_name _;   # _ 表示匹配所有域名/IP

    # 博客静态文件
    location / {
        root /opt/mizuki/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # 管理后台 API 转发
    location /api/admin/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```
> **解释**：
> - `location /` → 访问根路径时，返回 `/opt/mizuki/dist/` 里的静态文件
> - `location /api/admin/` → 访问 `/api/admin/xxx` 时，转发给本机的 3001 端口
> - `try_files` → 让 SPA 路由正常工作（找不到文件时返回 index.html）

```bash
# 3. 启用站点配置
sudo ln -s /etc/nginx/sites-available/blog /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default   # 删除默认站点

# 4. 检查配置是否正确
sudo nginx -t
# 看到 "syntax is ok" 和 "test is successful" 就对了
```

```bash
# 5. 重载 Nginx 使配置生效
sudo systemctl reload nginx
```

---

## 第七步：验证部署

在浏览器访问：

| 地址 | 预期结果 |
|------|----------|
| `http://你的IP/` | 🏠 博客首页 |
| `http://你的IP/admin/login` | 🔐 管理后台登录页 |
| `http://你的IP/api/admin/auth` | `{"ok":false}` (JSON) |

在管理后台登录页输入密码 → 进入文章管理界面 → 写文章 → 保存 → 点"重新构建" → 首页出现新文章 ✅

---

## 第八步：（可选）配置域名 + HTTPS

```bash
# 1. 先在阿里云 DNS 解析添加 A 记录
# 域名 → 你的服务器 IP
```

```bash
# 2. 配置 SSL 证书（自动免费！）
sudo apt install -y certbot python3-certbot-nginx

# 获取证书（替换成你的域名）
sudo certbot --nginx -d blog.你的域名.com
# 按提示输入邮箱，选 Y 同意条款
```

```bash
# 3. 证书会自动续期，不需要手动操作
# 验证自动续期
sudo certbot renew --dry-run
```

---

## 日常维护

```bash
# 更新博客配置或模板后
cd /opt/mizuki
pnpm build                    # 重新构建
# Nginx 直接读取 dist/ 新文件，不需要重启

# 管理后台挂了？
pm2 status                    # 查看状态
pm2 restart mizuki-admin      # 重启

# 查看管理后台出了什么问题
pm2 logs mizuki-admin --lines 50

# 服务器重启后
pm2 status                    # PM2 应该已经自动恢复了
# 如果没有，手动：
pm2 resurrect

# Nginx 相关的
sudo systemctl status nginx   # 查看状态
sudo systemctl restart nginx  # 重启
sudo nginx -t                 # 检查配置
```

---

## 常见问题

**Q: 浏览器访问 IP 没反应？**
1. 阿里云控制台 → 安全组 → 确保 80 端口已开放
2. `sudo systemctl status nginx` → 确保 Nginx 在运行
3. `curl http://localhost` → 在服务器内部测试是否正常

**Q: 管理后台登录不了？**
1. `pm2 status` → 确保 mizuki-admin 在运行
2. `pm2 logs mizuki-admin` → 查看错误日志
3. `node server/admin.mjs` → 手动启动看报错

**Q: 写文章后点"重新构建"没反应？**
1. 检查服务器磁盘空间：`df -h`
2. 检查内存：`free -h`
3. 查看构建日志：在管理后台点击构建后会弹出日志窗口

**Q: pnpm build 失败？**
```bash
cd /opt/mizuki
pnpm install    # 重新安装依赖
pnpm build      # 重试构建
```
