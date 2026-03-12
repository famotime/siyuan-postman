# 思源邮递员（siyuan-postman）—— 一键将思源文档发送为邮件

[思源笔记](https://b3log.org/siyuan)插件，支持将文档一键发送为邮件——可作为 **HTML 正文**或 **Markdown 附件**发送。

## 使用场景

当前要通过邮件分享思源笔记文档，需要导出后再以附件发送的方式，略显繁琐。本插件可以一键将思源笔记文档作为正文或附件发送为邮件，方便快捷。

## 功能特性

- 📧 **作为正文发 Email** — 将文档渲染为 HTML 格式发送
- 📎 **作为附件发 Email** — 将文档导出为 `.md` 文件发送，含资源时自动打包 `.zip`
- ⚙️ **预置常用邮箱** — QQ 邮箱、163 邮箱、189 邮箱、139 邮箱、Gmail

## 运行要求

- 思源笔记**桌面客户端**（Electron 环境）— 浏览器模式不支持，因 SMTP 网络限制
- 思源笔记 `v2.10.14` 及以上

## 配置步骤

1. 启用本插件，点击顶栏的图标，或进入插件设置
2. 选择预置邮箱（如 QQ 邮箱），或选择**自定义**
3. 填写 SMTP 信息：

   - **SMTP 服务器** — 如 `smtp.qq.com`
   - **端口** — 推荐 `465`（SSL/TLS）
   - **用户名** — 填写完整邮箱地址
   - **授权码/密码** — QQ/163/189 等邮箱需使用专用**授权码**，非登录密码
4. 点击**保存设置**

> 当前版本仅支持 **SSL/TLS** 加密连接；如 SMTP 服务仅提供 **STARTTLS**，则暂不支持。

![image](https://raw.githubusercontent.com/famotime/siyuan-postman/main/assets/image-20260311195229-e5zv4rr.png)

**常用邮箱配置参考：**

|邮箱|服务器|端口|SSL|
| --------| ------| ----| ---|
|QQ 邮箱|`smtp.qq.com`|465|✅|
|163 邮箱|`smtp.163.com`|465|✅|
|189 邮箱|`smtp.189.cn`|465|✅|
|139 邮箱|`smtp.139.com`|465|✅|
|Gmail|`smtp.gmail.com`|465|✅|

> **QQ / 163 / 189 用户注意**：需在邮箱账号设置中开启 SMTP 服务，并使用**授权码**（非登录密码）。

## 使用方法

安装插件后点击**顶栏按钮**，或者在**文档树**或**编辑器标题栏**右键点击进入插件菜单：

- **作为正文发 Email** → 填写收件人和主题，一键发送 HTML 邮件
- **作为附件发 Email** → 将文档打包为 `.md` 附件发送

![image-20260307133820393](https://raw.githubusercontent.com/famotime/siyuan-postman/main/assets/image-20260307133820393-20260307134820-2afhs4w.png)

![image](https://raw.githubusercontent.com/famotime/siyuan-postman/main/assets/image-20260311195335-fo7n0qt.png)

![image-20260307134302551](https://raw.githubusercontent.com/famotime/siyuan-postman/main/assets/image-20260307134302551-20260307134820-elngq5o.png)

## 开发与构建

- `pnpm install` 安装依赖
- `pnpm dev` 监听构建到本地思源插件目录（需在 `.env` 中配置 `VITE_SIYUAN_WORKSPACE_PATH`）
- `pnpm build` 生成生产构建到 `dist/`，并重新打包 `package.zip`
- `pnpm release:patch`/`release:minor`/`release:major` 通过 `release.js` 升级版本并打包发布
