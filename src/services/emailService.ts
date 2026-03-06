/**
 * 邮件发送服务
 * 在 Electron 环境下通过 nodemailer + SMTP 发送邮件
 * 在非 Electron 环境下显示友好提示
 */
import type { EmailConfig } from '@/composables/useEmailConfig'

/** 发送模式 */
export type SendMode = 'body' | 'attachment'

/** 发送参数 */
export interface SendEmailOptions {
  config: EmailConfig
  to: string[]        // 收件人列表
  subject: string     // 邮件主题
  mode: SendMode
  docTitle: string    // 用于附件文件名
  htmlContent?: string // 正文模式使用
  mdContent?: string  // 附件模式使用
}

/**
 * 检测是否在 Electron 环境运行
 */
function isElectronEnv(): boolean {
  try {
    // 思源 Electron 环境下 window.require 存在
    return typeof (window as any).require === 'function'
  }
  catch {
    return false
  }
}

/**
 * 动态加载 nodemailer（仅 Electron 环境）
 * nodemailer 被标记为 external，由 Electron 的 Node.js 提供
 */
function loadNodemailer(): any {
  if (!isElectronEnv()) {
    throw new Error('ELECTRON_ONLY')
  }
  try {
    // Electron 环境中使用 window.require 访问 Node.js 模块
    return (window as any).require('nodemailer')
  }
  catch {
    throw new Error('NODEMAILER_NOT_FOUND')
  }
}

/**
 * 发送邮件（核心函数）
 */
export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const { config, to, subject, mode, docTitle, htmlContent, mdContent } = options

  // 校验配置完整性
  if (!config.host || !config.user || !config.password) {
    throw new Error('NO_CONFIG')
  }

  const nodemailer = loadNodemailer()

  // 创建 SMTP 传输
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,        // true = SSL/TLS (465), false = STARTTLS (587)
    auth: {
      user: config.user,
      pass: config.password,
    },
    // 连接超时 15 秒
    connectionTimeout: 15000,
    greetingTimeout: 10000,
  })

  const fromAddress = config.fromName
    ? `"${config.fromName}" <${config.user}>`
    : config.user

  let mailOptions: any

  if (mode === 'body') {
    // 正文模式：发送 HTML 内容
    mailOptions = {
      from: fromAddress,
      to: to.join(', '),
      subject,
      html: htmlContent || '<p>（无内容）</p>',
    }
  }
  else {
    // 附件模式：将 Markdown 内容作为 .md 文件附件
    const attachContent = mdContent || ''
    const safeTitle = docTitle.replace(/[\\/:*?"<>|]/g, '_')
    mailOptions = {
      from: fromAddress,
      to: to.join(', '),
      subject,
      text: `请查阅附件：${docTitle}`,
      attachments: [
        {
          filename: `${safeTitle}.md`,
          content: attachContent,
          contentType: 'text/markdown; charset=utf-8',
        },
      ],
    }
  }

  // 发送邮件（Promise 化）
  await new Promise<void>((resolve, reject) => {
    transporter.sendMail(mailOptions, (err: Error | null) => {
      if (err) reject(err)
      else resolve()
    })
  })
}
