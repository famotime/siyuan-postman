# Repository Guidelines

## 项目结构与模块组织
本仓库是基于 Vue 3、TypeScript 和 Vite 的思源笔记桌面插件。`src/index.ts` 是插件入口，`src/main.ts` 负责挂载 Vue 应用。界面组件放在 `src/components/`，状态与复用逻辑放在 `src/composables/`，SMTP 与思源接口封装放在 `src/services/`，工具函数放在 `src/utils/`，多语言资源放在 `src/i18n/`，类型声明放在 `src/types/`。`plugin-sample-vite-vue/` 是开发模板目录，`reference_docs/` 是开发参考文档目录。打包输出位于 `dist/`，发布压缩包为 `package.zip`。

## 构建、测试与开发命令
- `pnpm install`：安装依赖，并与 GitHub Actions 的环境保持一致。
- `pnpm dev`：监听构建到本地思源插件目录；先在 `.env` 中配置 `VITE_SIYUAN_WORKSPACE_PATH`。
- `pnpm build`：生成生产构建到 `dist/`，并重新打包 `package.zip`。
- `pnpm release:patch`、`pnpm release:minor`、`pnpm release:major`：通过 `release.js` 升级版本并打包发布。

当前没有独立的自动化测试命令，提交前至少执行一次 `pnpm build`。

## 代码风格与命名规范
遵循 `.editorconfig`：2 空格缩进、UTF-8 编码、保留文件末尾换行。Lint 配置位于 `eslint.config.mjs`，基于 `@antfu/eslint-config`。优先使用 TypeScript、单引号和现有 Vue 单文件组件写法。组件使用 `PascalCase`，如 `SendMailDialog.vue`；组合式函数与服务使用 `camelCase`，如 `useEmailConfig.ts`、`emailService.ts`。涉及文案变更时，同时更新 `src/i18n/en_US.json` 与 `src/i18n/zh_CN.json`。

## 测试说明
本项目目前以手动验证为主。修改后请在思源桌面端完成冒烟测试：打开设置面板、保存 SMTP 配置、以正文方式发送文档、再以附件方式发送。若涉及 UI 或多语言，请同时验证中英文，并在 PR 中附截图或录屏。

## 提交与合并请求
提交信息建议使用简短祈使句，优先采用 Conventional Commits，例如 `feat: 支持正文内联图片`、`fix: 修复附件导出失败`。PR 应包含变更摘要、关联问题或背景、手动验证步骤；如果修改菜单、弹窗或邮件展示效果，请附截图或 GIF。

## 安全与配置提示
本地开发请由 `.env.example` 复制生成 `.env`。不要提交真实邮箱、SMTP 授权码或本机专用路径。修改发布相关配置时，请同步检查 `plugin.json`、README 和打包资源是否一致。
