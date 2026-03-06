# siyuan-postman — Send SiYuan Documents as Email

A [SiYuan](https://b3log.org/siyuan) plugin that lets you send documents as email with one click — either as **HTML body** or as **Markdown attachment**.

## Features

- 📧 **Send as Email Body** — renders the document as HTML email content
- 📎 **Send as Attachment** — exports document as `.md` file attachment
- ⚙️ **Preset SMTP Providers** — QQ Mail, 163 Mail, 189 Mail, 139 Mail, Outlook, Gmail
- 🔧 **Custom SMTP** — configure any SMTP server (host, port, SSL/TLS, credentials)
- 🖱️ **Context Menu** — accessible from document tree and editor title right-click menu

## Requirements

- SiYuan Note desktop client (Electron) — **browser mode is not supported** due to SMTP network restrictions
- SiYuan `v2.10.14` or later

## Setup

1. Enable the plugin from **Settings → Marketplace → Plugins**
2. Click the ✉️ icon in the top bar, or go to plugin settings
3. Select a preset email provider (e.g., QQ Mail) or choose **Custom**
4. Fill in your SMTP credentials:
   - **SMTP Host** — e.g., `smtp.qq.com`
   - **Port** — `465` (SSL) or `587` (STARTTLS)
   - **Username** — your full email address
   - **Authorization Code** — QQ/163/189 use app-specific auth codes, not login passwords
5. Save settings

## Usage

Right-click any document in the **document tree** or **editor title bar**:

- **Send as Email Body** → opens a dialog to enter recipient and subject, sends HTML email
- **Send as Attachment** → sends the document as a `.md` file attachment

## Common Email Provider Settings

| Provider | Host | Port | SSL |
|----------|------|------|-----|
| QQ Mail | `smtp.qq.com` | 465 | ✅ |
| 163 Mail | `smtp.163.com` | 465 | ✅ |
| 189 Mail | `smtp.189.cn` | 465 | ✅ |
| 139 Mail | `smtp.139.com` | 465 | ✅ |
| Outlook | `smtp.office365.com` | 587 | ❌ (STARTTLS) |
| Gmail | `smtp.gmail.com` | 465 | ✅ |

> **Note for QQ/163/189 users**: You must enable SMTP in your email account settings and use the **authorization code** (授权码), not your login password.

## License

MIT
