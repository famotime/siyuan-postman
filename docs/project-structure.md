# 项目结构

## 根目录

- `package.json`：依赖与构建脚本
- `plugin.json`：思源插件元信息
- `vite.config.ts`：构建配置
- `release.js`：版本与打包流程
- `Readme.md`：用户与开发说明
- `dist/`：构建产物
- `package.zip`：发布压缩包
- `reference_docs/`：开发参考文档
- `plugin-sample-vite-vue/`：模板目录

## src

- `src/index.ts`：插件入口与生命周期管理
- `src/main.ts`：挂载 Vue 应用
- `src/App.vue`：插件根组件占位
- `src/index.scss`：全局样式与设计变量
- `src/components/`：设置面板与发送弹窗组件
- `src/components/SiyuanTheme/`：思源主题适配控件
- `src/composables/useEmailConfig.ts`：SMTP 配置状态与持久化
- `src/services/emailService.ts`：SMTP 发送流程
- `src/services/emailComposer.ts`：正文与附件的内容构建
- `src/services/markdownToEmailHtml.ts`：Markdown 清洗与 HTML 渲染
- `src/services/siyuanApi.ts`：思源 Kernel API 封装
- `src/utils/emailPresetUi.ts`：预置邮箱 UI 元数据
- `src/utils/dialogMount.ts`：Dialog 挂载与自动卸载
- `src/i18n/`：多语言资源
- `src/types/`：类型声明
- `src/assets/preset-icons/`：邮箱预置图标

## 测试

- `src/**/*.test.ts`：基于 `node --test` 的轻量测试
- `tests/`：保留的手动或拓展测试空间
