/**
 * 邮件发送服务
 * 在 Electron 环境下通过 nodemailer + SMTP 发送邮件
 * nodemailer 以静态 import 方式引入，由 Rollup + @rollup/plugin-commonjs 打包进 bundle
 */
import { normalizeEmailConfig } from '@/composables/useEmailConfig'
import type { EmailConfig } from '@/composables/useEmailConfig'
import PluginInfoString from '@/../plugin.json'
import { composeAttachmentEmail, composeBodyEmail } from './emailComposer'

/** 发送模式 */
export type SendMode = 'body' | 'attachment'

/** 发送参数 */
export interface SendEmailOptions {
  config: EmailConfig
  to: string[]         // 收件人列表
  subject: string      // 邮件主题
  mode: SendMode
  docTitle: string     // 用于附件文件名
  htmlContent?: string // 正文模式使用
  mdContent?: string   // 附件模式使用
}

/**
 * 检测是否在 Electron 环境运行
 * 使用 process.versions.electron 进行可靠判断
 */
function isElectronEnv(): boolean {
  try {
    return (
      typeof process !== 'undefined'
      && typeof process.versions === 'object'
      && !!process.versions.electron
    )
  }
  catch {
    return false
  }
}

/**
 * 动态加载 Node 模块
 * 在 Electron 的沙盒环境中（electron/js2c/renderer_init），__dirname 实际上指向了 electron 内部资源。
 * 必须通过 window.siyuan.config.system.workspaceDir 拿到思源工作空间的绝对物理路径，结合插件目录精准 require。
 */
function requireNodeModule(moduleName: string): any {
  if (!isElectronEnv()) {
    throw new Error('ELECTRON_ONLY')
  }
  try {
    if (moduleName === 'fs' || moduleName === 'path') {
      return (window as any).require(moduleName)
    }
    // 获取真正的 NodeJS API
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
 * 获取思源 assets 目录物理路径
 */
function getWorkspacePath(relativePath: string): string {
  const path = requireNodeModule('path')
  const wsDir = (window as any).siyuan.config.system.workspaceDir
  return path.join(wsDir, 'data', relativePath)
}

/**
 * 发送邮件（核心函数）
 */
export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const { config, to, subject, mode, docTitle, htmlContent, mdContent } = options
  const normalizedConfig = normalizeEmailConfig(config)

  // 非 Electron 环境（浏览器）无法使用 SMTP
  const nodemailer = requireNodeModule('nodemailer')
  const fs = requireNodeModule('fs')
  const path = requireNodeModule('path')

  // 校验配置完整性
  if (!normalizedConfig.host || !normalizedConfig.user || !normalizedConfig.password) {
    throw new Error('NO_CONFIG')
  }

  // 创建 SMTP 传输
  const transporter = nodemailer.createTransport({
    host: normalizedConfig.host,
    port: normalizedConfig.port,
    secure: true,
    auth: {
      user: normalizedConfig.user,
      pass: normalizedConfig.password,
    },
    // 连接超时 15 秒
    connectionTimeout: 15000,
    greetingTimeout: 10000,
  })

  const fromAddress = normalizedConfig.fromName
    ? `"${normalizedConfig.fromName}" <${normalizedConfig.user}>`
    : normalizedConfig.user

  let mailOptions: any

  if (mode === 'body') {
    // 正文模式：处理 HTML 内容并提取内嵌图片
    const { html, attachments } = composeBodyEmail(htmlContent, { fs, path, getWorkspacePath })
    mailOptions = {
      from: fromAddress,
      to: to.join(', '),
      subject,
      html,
      attachments: attachments.length > 0 ? attachments : undefined,
    }
  }
  else {
    // 附件模式：将 Markdown 和图片打包为 .zip，或者仅发送 .md（无图片时）
    const { text, attachments } = await composeAttachmentEmail(docTitle, mdContent, { fs, path, getWorkspacePath })
    mailOptions = {
      from: fromAddress,
      to: to.join(', '),
      subject,
      text,
      attachments,
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
