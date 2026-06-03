# 重构计划

## 1. 项目快照

- 生成日期：2026-06-03
- 范围：siyuan-postman 全仓
- 目标：消除上一轮重构后遗留的死代码与重复逻辑，降低维护成本

## 2. 架构与模块分析

| 模块 | 关键文件 | 当前职责 | 主要痛点 | 测试覆盖情况 |
| --- | --- | --- | --- | --- |
| 邮件组合（旧） | `src/services/emailComposer.ts` | 桌面端专用的邮件组装（同步 fs/path） | 已被 `emailComposerShared.ts` 完全替代，无任何引用，属于死代码 | `src/services/emailComposer.test.ts`（对应旧模块，也应清理） |
| 邮件组合（新） | `src/services/emailComposerShared.ts` | 通过适配器模式支持桌面端+移动端的邮件组装 | 与旧文件中的 `AssetReaderResult` 接口重复定义 | `src/services/emailComposerShared.test.ts` |
| 资源读取 | `src/services/assetReader.ts` | 平台无关的资源文件读取 | `isElectronEnv()` 与 `postSiyuanApi()` 与其他文件重复 | 无直接测试 |
| 邮件发送服务 | `src/services/emailService.ts` | SMTP 发送路由 | `isElectronEnv()` 与 `assetReader.ts` 重复 | 无直接测试 |
| HTTP 邮件服务 | `src/services/httpEmailService.ts` | 移动端 HTTP API 发送 | `postSiyuanApi()` 与 `assetReader.ts` 实现不一致 | `src/services/httpEmailService.test.ts` |
| 入口与生命周期 | `src/index.ts`、`src/main.ts` | 插件生命周期、菜单注入、弹窗挂载 | 上轮已重构，无新问题 | `src/index.test.ts` |
| 配置状态 | `src/composables/useEmailConfig.ts` | SMTP 配置、预置数据、持久化 | 无新问题 | `src/composables/useEmailConfig.test.ts` |
| UI 组件 | `src/components/SettingPanel.vue`、`src/components/SendMailDialog.vue` | 设置面板、发送弹窗 | 无新问题 | `src/components/*.test.ts` |
| 思源 API | `src/services/siyuanApi.ts` | 文档导出 API | 无新问题 | 无 |
| Markdown 转 HTML | `src/services/markdownToEmailHtml.ts` | Markdown 清洗与 HTML 渲染 | 无新问题 | `src/services/markdownToEmailHtml.test.ts` |

## 3. 按优先级排序的重构待办

| ID | 优先级 | 模块/场景 | 涉及文件 | 重构目标 | 风险等级 | 重构前测试清单 | 状态 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| RF-004 | P0 | 删除死代码 `emailComposer.ts` | `src/services/emailComposer.ts`、`src/services/emailComposer.test.ts` | 移除无引用的旧组合模块及其测试，消除维护歧义 | 低 | - [x] `grep -r "emailComposer[^S]" src/` 确认无引用 | done |
| RF-005 | P1 | 提取共享 `isElectronEnv()` | `src/services/assetReader.ts`、`src/services/emailService.ts`、`src/components/SendMailDialog.vue`、新增 `src/utils/env.ts` | 将重复的 Electron 环境检测提取到共享工具模块 | 低 | - [x] `npx tsx --test src/services/httpEmailService.test.ts` pass<br>- [x] `npx tsx --test src/services/emailComposerShared.test.ts` pass | done |
| RF-006 | P1 | 统一 `postSiyuanApi()` | `src/services/assetReader.ts`、`src/services/httpEmailService.ts`、新增 `src/utils/siyuanFetch.ts` | 统一 SDK 加载方式为动态 import（替代 window.require）；`assetReader.ts` 使用共享版本，`httpEmailService.ts` 保留本地版本（代理降级需返回 null） | 中 | - [x] `npx tsx --test src/services/httpEmailService.test.ts` pass | done |
| RF-007 | P2 | 统一 `AssetReaderResult` 类型定义 | `src/services/assetReader.ts`、`src/services/emailComposerShared.ts` | 将重复的接口定义统一到 `assetReader.ts`，`emailComposerShared.ts` 改为 re-export | 低 | - [x] `npx tsx --test src/services/emailComposerShared.test.ts` pass<br>- [x] `npx tsx --test src/services/httpEmailService.test.ts` pass<br>- [x] `npx vite build` pass | done |

优先级说明：
- `P0`：价值和风险都最高，优先执行
- `P1`：价值或风险中等，放在 `P0` 之后
- `P2`：低风险清理项，最后执行

状态说明：
- `pending`
- `in_progress`
- `done`
- `blocked`

## 4. 执行日志

| ID | 开始日期 | 结束日期 | 验证命令 | 结果 | 备注 |
| --- | --- | --- | --- | --- | --- |
| RF-001 | 2026-03-12 | 2026-03-12 | `node --test src/index.test.ts` | pass | 新增 handler 复用测试 |
| RF-002 | 2026-03-12 | 2026-03-12 | `node --test src/services/emailComposer.test.ts` | pass | 用 emailComposer 替代直接测试 emailService |
| RF-003 | 2026-03-12 | 2026-03-12 | `rg -n "from '@/api'" src` | pass | 无引用后删除 src/api.ts |
| RF-004 | 2026-06-03 | 2026-06-03 | `grep -r "emailComposer[^S]" src/` + 全量测试 | pass | 删除死代码 emailComposer.ts 及其测试（42 tests pass） |
| RF-005 | 2026-06-03 | 2026-06-03 | 全量测试 | pass | 新增 src/utils/env.ts，更新 emailService.ts、assetReader.ts、SendMailDialog.vue |
| RF-006 | 2026-06-03 | 2026-06-03 | 全量测试 | pass | 新增 src/utils/siyuanFetch.ts，assetReader.ts 使用共享版本；httpEmailService.ts 保留本地版本但改用动态 import |
| RF-007 | 2026-06-03 | 2026-06-03 | 全量测试 + `npx vite build` | pass | emailComposerShared.ts 改为从 assetReader.ts re-export AssetReaderResult |

## 5. 决策与确认

- 用户批准的条目：RF-004、RF-005、RF-006、RF-007（2026-06-03）
- 延后的条目：无
- 阻塞条目及原因：无

## 6. 下一步

1. 如需进一步优化，可考虑将 `httpEmailService.ts` 中的本地 `postSiyuanApi` 也迁移到共享模块（需先解决代理降级返回 null 的模式差异）
2. 如需补充测试，可为 `assetReader.ts` 和 `src/utils/env.ts` 添加单元测试
