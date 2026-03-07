# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**siyuan-postman** is a SiYuan Note plugin that sends documents as email via SMTP. It supports sending documents as inline HTML body (with embedded images) or as Markdown/ZIP attachments. Desktop-only (Electron) — requires `nodemailer` loaded at runtime via `window.require()`.

Primary language is Chinese (zh_CN is the default locale); English (en_US) is also supported.

## Build & Dev Commands

```bash
pnpm install          # Install dependencies
pnpm build            # Production build → ./dist/ + package.zip
pnpm dev              # Watch mode → builds to SiYuan workspace plugin dir (set VITE_SIYUAN_WORKSPACE_PATH in .env)
```

### Testing

Tests use Node.js built-in test runner (`node:test` + `node:assert/strict`). No test framework dependency.

```bash
# Run all tests (use --import to handle TypeScript)
npx tsx --test src/**/*.test.ts

# Run a single test file
npx tsx --test src/composables/useEmailConfig.test.ts
```

### Linting

```bash
npx eslint .          # Uses @antfu/eslint-config with Vue + TypeScript
```

### Release

```bash
pnpm release          # Interactive version bump → git tag → push (triggers GitHub Actions release)
pnpm release:patch    # Auto patch bump
```

## Architecture

### Plugin Lifecycle (`src/index.ts`)

`PostmanPlugin` extends SiYuan's `Plugin` class. On load:
1. Binds the plugin instance to `useEmailConfig` composable via `bindPlugin()`
2. Loads saved SMTP config from plugin storage
3. Initializes a hidden Vue app mount (`src/main.ts` → `App.vue`)
4. Adds top-bar icon and context menu items on doc tree / editor title

All UI is rendered through SiYuan's `Dialog` API — Vue components are dynamically mounted into dialog containers and cleaned up via `MutationObserver`.

### Key Modules

- **`src/composables/useEmailConfig.ts`** — Reactive SMTP configuration state. Manages presets (QQ, 163, 189, 139, Gmail, custom), load/save via `plugin.loadData()`/`plugin.saveData()`. Config is stored as `postman-smtp-config.json`.
- **`src/services/emailService.ts`** — Core email sending. Dynamically loads `nodemailer` and `fs`/`path` via `window.require()` with absolute paths resolved from `window.siyuan.config.system.workspaceDir`. Two modes:
  - **body**: Exports doc as HTML, replaces `assets/` image references with CID-embedded inline attachments
  - **attachment**: Exports as Markdown; if images exist, bundles into ZIP via `jszip`; otherwise sends raw `.md`
- **`src/services/siyuanApi.ts`** — Wraps SiYuan kernel APIs (`fetchSyncPost`) for doc title, Markdown export, and HTML preview export
- **`src/components/SettingPanel.vue`** — SMTP configuration UI
- **`src/components/SendMailDialog.vue`** — Send email dialog with recipient input, subject, and mode selection

### Build Details

- **Output format**: CJS (required by SiYuan plugin system)
- **Externals**: `siyuan` (provided by SiYuan runtime), `nodemailer` (shipped as raw node_modules via `vite-plugin-static-copy`, loaded at runtime via absolute path require), `process`
- **Path alias**: `@` → `./src`
- Watch mode outputs to `${VITE_SIYUAN_WORKSPACE_PATH}/data/plugins/siyuan-postman/`

### i18n

Three JSON files in `src/i18n/`: `default.json` (= zh_CN), `zh_CN.json`, `en_US.json`. All keys must stay synchronized. The `default.json` must mirror `zh_CN.json` content. Components use a local `t(key, fallback)` pattern, not a global i18n library.

### CSS Architecture

Shared styles in `src/index.scss` define CSS custom properties prefixed with `--pm-*` that map to SiYuan's `--b3-*` theme variables. BEM-like class naming with `postman-` prefix. Component-scoped styles are in `<style lang="scss">` blocks within `.vue` files.

### SiYuan Theme Components (`src/components/SiyuanTheme/`)

Reusable Vue wrappers (SyButton, SyInput, SySelect, etc.) that apply SiYuan's native `b3-*` CSS classes. Currently not used by the main plugin UI (which uses custom `postman-*` styles directly).
