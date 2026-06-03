/**
 * 邮件发送服务
 * 自动选择后端：桌面端走 SMTP (nodemailer)，移动端走 HTTP API (Resend)
 */
import { normalizeEmailConfig } from '@/composables/useEmailConfig'
import type { EmailConfig } from '@/composables/useEmailConfig'
import { isElectronEnv } from '@/utils/env'
import PluginInfoString from '@/../plugin.json'
import { composeAttachmentEmailWithAdapter, composeBodyEmailWithAdapter } from './emailComposerShared'
import { sendEmailViaHttp, type HttpEmailConfig } from './httpEmailService'

/** 发送模式 */
export type SendMode = 'body' | 'attachment'

/** 发送参数 */
export interface SendEmailOptions {
  config: EmailConfig
  httpConfig?: HttpEmailConfig
  to: string[]         // 收件人列表
  subject: string      // 邮件主题
  mode: SendMode
  docTitle: string     // 用于附件文件名
  htmlContent?: string // 正文模式使用
  mdContent?: string   // 附件模式使用
}

/**
 * 动态加载 Node 模块（仅桌面端）
 */
function requireNodeModule(moduleName: string): any {
  if (!isElectronEnv()) {
    throw new Error('ELECTRON_ONLY')
  }
  try {
    if (moduleName === 'fs' || moduleName === 'path') {
      return (window as any).require(moduleName)
    }
    const path = (window as any).require('path')
    const wsDir = (window as any).siyuan.config.system.workspaceDir
    const pluginName = PluginInfoString.name || 'siyuan-postman'
    const modPath = path.join(wsDir, 'data', 'plugins', pluginName, 'node_modules', moduleName)
    return (window as any).require(modPath)
  }
  catch {
    throw new Error(`${moduleName.toUpperCase()}_NOT_FOUND`)
  }
}

/**
 * 获取思源 assets 目录物理路径（桌面端）
 */
function getWorkspacePath(relativePath: string): string {
  const path = requireNodeModule('path')
  const wsDir = (window as any).siyuan.config.system.workspaceDir
  return path.join(wsDir, 'data', relativePath)
}

/**
 * 通过 SMTP 发送邮件（桌面端）
 */
async function sendEmailViaSmtp(options: SendEmailOptions): Promise<void> {
  const { config, to, subject, mode, docTitle, htmlContent, mdContent } = options
  const normalizedConfig = normalizeEmailConfig(config)

  const nodemailer = requireNodeModule('nodemailer')
  const fs = requireNodeModule('fs')
  const path = requireNodeModule('path')
  const composerAdapter = {
    getWorkspacePath,
    basename: (assetPath: string) => path.basename(assetPath),
    assetExists: async (absPath: string) => fs.existsSync(absPath),
    readAsset: async (absPath: string) => {
      const buffer: Buffer = fs.readFileSync(absPath)
      return {
        base64: buffer.toString('base64'),
        buffer,
      }
    },
    createInlineAttachment: async ({ assetPath, absPath, cid }: { assetPath: string, absPath: string, cid: string }) => ({
      filename: path.basename(assetPath),
      path: absPath,
      cid,
    }),
    createArchiveContent: (zip: any) => zip.generateAsync({ type: 'nodebuffer' }),
    createTextContent: (text: string) => text,
  }

  if (!normalizedConfig.host || !normalizedConfig.user || !normalizedConfig.password) {
    throw new Error('NO_CONFIG')
  }

  const transporter = nodemailer.createTransport({
    host: normalizedConfig.host,
    port: normalizedConfig.port,
    secure: true,
    auth: {
      user: normalizedConfig.user,
      pass: normalizedConfig.password,
    },
    connectionTimeout: 15000,
    greetingTimeout: 10000,
  })

  const fromAddress = normalizedConfig.fromName
    ? `"${normalizedConfig.fromName}" <${normalizedConfig.user}>`
    : normalizedConfig.user

  let mailOptions: any

  if (mode === 'body') {
    const { html, attachments } = await composeBodyEmailWithAdapter(htmlContent, composerAdapter)
    mailOptions = {
      from: fromAddress,
      to: to.join(', '),
      subject,
      html,
      attachments: attachments.length > 0 ? attachments : undefined,
    }
  }
  else {
    const { text, attachments } = await composeAttachmentEmailWithAdapter(docTitle, mdContent, composerAdapter)
    mailOptions = {
      from: fromAddress,
      to: to.join(', '),
      subject,
      text,
      attachments,
    }
  }

  await new Promise<void>((resolve, reject) => {
    transporter.sendMail(mailOptions, (err: Error | null) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

/**
 * 发送邮件（自动路由）
 * 桌面端：SMTP (nodemailer)
 * 移动端：HTTP API (Resend)
 */
export async function sendEmail(options: SendEmailOptions): Promise<void> {
  if (isElectronEnv()) {
    return sendEmailViaSmtp(options)
  }

  // 移动端：走 HTTP API
  if (!options.httpConfig) {
    throw new Error('NO_HTTP_CONFIG')
  }

  return sendEmailViaHttp({
    config: options.config,
    httpConfig: options.httpConfig,
    to: options.to,
    subject: options.subject,
    mode: options.mode,
    docTitle: options.docTitle,
    htmlContent: options.htmlContent,
    mdContent: options.mdContent,
  })
}
