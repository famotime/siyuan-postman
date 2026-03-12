# 重构计划

## 1. 项目快照

- 生成日期：2026-03-12
- 范围：siyuan-postman 全仓
- 目标：降低插件生命周期与邮件发送逻辑的耦合度，提升可测试性与可维护性
- 文档刷新目标：`docs/project-structure.md`、`README.md`

## 2. 架构与模块分析

| 模块 | 关键文件 | 当前职责 | 主要痛点 | 测试覆盖情况 |
| --- | --- | --- | --- | --- |
| 入口与生命周期 | `src/index.ts`、`src/main.ts` | 插件生命周期、菜单注入、弹窗挂载 | Dialog 挂载逻辑重复；事件绑定使用 `bind` 后在 `off` 时无法移除（潜在泄露/重复触发） | `src/index.test.ts` 覆盖部分菜单文案与分支 |
| 邮件发送服务 | `src/services/emailService.ts` | SMTP 发送、正文/附件构建、资源打包 | 逻辑过长、依赖环境强（Electron+fs/path），缺少可单测的纯函数分层 | 无直接测试 |
| Markdown 转 HTML | `src/services/markdownToEmailHtml.ts` | 清洗反链/脚注、HTML 渲染 | 单文件职责偏大但已有测试；后续调整需谨慎 | `src/services/markdownToEmailHtml.test.ts` 覆盖核心规则 |
| 思源 API 封装 | `src/services/siyuanApi.ts`、`src/api.ts` | 文档导出与通用 API | `src/api.ts` 当前未被引用，存在冗余维护成本 | 无直接测试 |
| 配置状态 | `src/composables/useEmailConfig.ts` | SMTP 配置、预置数据、持久化 | 全局 `pluginRef` 难以 mock；已有基础测试 | `src/composables/useEmailConfig.test.ts` |
| UI 组件 | `src/components/*` | 设置面板、发送弹窗、主题控件 | 发送流程逻辑与 UI 紧耦合；可抽离为 composable | `src/components/*.test.ts` 覆盖结构约束 |
| UI 元信息 | `src/utils/emailPresetUi.ts` | 预置邮箱 UI 元数据 | 元数据与配置分离，容易不同步 | `src/utils/emailPresetUi.test.ts` |

## 3. 按优先级排序的重构待办

| ID | 优先级 | 模块/场景 | 涉及文件 | 重构目标 | 风险等级 | 重构前测试清单 | 文档影响 | 状态 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RF-001 | P0 | 插件事件绑定与弹窗挂载 | `src/index.ts`、`src/main.ts`、新增 `src/utils/dialogMount.ts` | 统一弹窗挂载/卸载流程；保存 eventBus handler 引用以确保 `off` 生效 | 中 | - [x] `node --test src/index.test.ts`<br>- [x] 新增/调整 `src/index.test.ts` 验证 handler 复用 | `docs/project-structure.md`、`README.md` | done |
| RF-002 | P1 | 邮件发送构建流程 | `src/services/emailService.ts`、新增 `src/services/emailComposer.ts` | 抽离正文/附件构建为纯函数，允许注入 fs/path；降低主函数复杂度 | 中 | - [x] `node --test src/services/markdownToEmailHtml.test.ts`<br>- [x] 新增 `src/services/emailComposer.test.ts` 覆盖正文/附件构建与资源收集 | `docs/project-structure.md` | done |
| RF-003 | P2 | 删除未使用的 API 模板 | `src/api.ts` | 评估无引用后移除或迁移到 `reference_docs/`，减少冗余 | 低 | - [x] `rg -n "from '@/api'" src` 确认无引用 | `docs/project-structure.md`、`README.md` | done |

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

| ID | 开始日期 | 结束日期 | 验证命令 | 结果 | 已刷新文档 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| RF-001 | 2026-03-12 | 2026-03-12 | `node --test src/index.test.ts` | pass | 待刷新 | 新增 handler 复用测试；仅改动后验证 |
| RF-002 | 2026-03-12 | 2026-03-12 | `node --test src/services/markdownToEmailHtml.test.ts`<br>`node --test src/services/emailComposer.test.ts` | pass | 待刷新 | 用 `emailComposer.test.ts` 替代直接测试 emailService |
| RF-003 | 2026-03-12 | 2026-03-12 | `rg -n "from '@/api'" src` | pass | 待刷新 | 无引用后删除 `src/api.ts` |

## 5. 决策与确认

- 用户批准的条目：RF-001、RF-002、RF-003（2026-03-12）
- 延后的条目：
- 阻塞条目及原因：

## 6. 文档刷新

- `docs/project-structure.md`：已新增并同步模块结构（2026-03-12）
- `README.md`：仓库实际为 `Readme.md`，已同步功能描述与开发命令（2026-03-12）
- 最终同步检查：已完成

## 7. 下一步

1. 如需补充 README 命名规范，可将 `Readme.md` 统一为 `README.md`。
2. 如需补充集成测试，可引入脚本化测试入口。
