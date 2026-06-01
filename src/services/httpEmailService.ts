/**
 * HTTP 邮件发送服务（移动端）
 * 通过 Resend REST API 发送邮件，不依赖 Node.js 模块
 */
import JSZip from 'jszip'
import { normalizeEmailConfig } from '../composables/useEmailConfig.ts'
import type { EmailConfig } from '../composables/useEmailConfig.ts'
import { composeAttachmentEmail, composeBodyEmail, type EmailComposerDeps } from './emailComposer.ts'
import { assetExists, readAsset } from './assetReader.ts'

export type HttpEmailProvider = 'resend'

export interface HttpEmailConfig {
  httpProvider: HttpEmailProvider
  httpApiKey: string
  httpEndpoint?: string // 可选自定义 endpoint
}

export interface SendEmailOptions {
  config: EmailConfig
  httpConfig: HttpEmailConfig
  to: string[]
  subject: string
  mode: 'body' | 'attachment'
  docTitle: string
  htmlContent?: string
  mdContent?: string
}

const DEFAULT_ENDPOINT = 'https://api.resend.com/emails'

/**
 * 构建移动端可用的 assetReader 依赖
 * 通过思源内核 API 读取资源文件
 */
function createMobileDeps(): EmailComposerDeps {
  const wsDir = (window as any).siyuan?.config?.system?.workspaceDir || ''

  return {
    existsSync: (_absPath: string) => {
      // 同步接口不适用于移动端，composeBodyEmail 中的 existsSync 调用需要改为异步
      // 这里返回 false，由异步路径处理
      return false
    },
    readFileSync: (_absPath: string) => {
      throw new Error('Use readAssetAsync on mobile')
    },
    readAssetAsync: async (absPath: string) => {
      // 从绝对路径推导出工作空间相对路径
      const wsRelativePath = absPath.startsWith(wsDir)
        ? absPath.slice(wsDir.length)
        : absPath
      return readAsset(absPath, wsRelativePath)
    },
    assetExistsAsync: async (absPath: string) => {
      const wsRelativePath = absPath.startsWith(wsDir)
        ? absPath.slice(wsDir.length)
        : absPath
      return assetExists(absPath, wsRelativePath)
    },
    getWorkspacePath: (relativePath: string) => {
      return `${wsDir}/data/${relativePath}`
    },
  }
}

/**
 * 通过 Resend API 发送邮件
 */
async function postSiyuanApi(url: string, data: unknown): Promise<any> {
  const testFetchSyncPost = (globalThis as any).__POSTMAN_FETCH_SYNC_POST__
  if (typeof testFetchSyncPost === 'function') {
    return testFetchSyncPost(url, data)
  }

  const siyuan = await import('siyuan')
  return siyuan.fetchSyncPost(url, data)
}

async function postJsonViaSiyuanForwardProxy(
  endpoint: string,
  apiKey: string,
  body: Record<string, any>,
): Promise<void> {
  const response = await postSiyuanApi('/api/network/forwardProxy', {
    url: endpoint,
    method: 'POST',
    timeout: 30000,
    contentType: 'application/json',
    headers: [
      { Authorization: `Bearer ${apiKey}` },
    ],
    payload: body,
    payloadEncoding: 'text',
    responseEncoding: 'text',
  })

  if (response?.code !== 0) {
    throw new Error(`HTTP_EMAIL_PROXY: ${response?.msg || 'forwardProxy failed'}`)
  }

  const status = Number(response?.data?.status || 0)
  if (status < 200 || status >= 300) {
    throw new Error(`HTTP_EMAIL_${status || 'PROXY'}: ${response?.data?.body || response?.msg || ''}`)
  }
}

/**
 * 通过 Resend API 发送邮件。
 *
 * 移动端 WebView 直接请求 https://api.resend.com 往往会被 CORS 拦截并抛出
 * “Failed to fetch”，因此优先走思源内核的 /api/network/forwardProxy。
 */
async function sendViaResend(
  endpoint: string,
  apiKey: string,
  payload: {
    from: string
    to: string[]
    subject: string
    html?: string
    text?: string
    attachments?: Array<{ filename: string, content: string, contentType?: string }>
  },
): Promise<void> {
  const body: Record<string, any> = {
    from: payload.from,
    to: payload.to,
    subject: payload.subject,
  }

  if (payload.html) body.html = payload.html
  if (payload.text) body.text = payload.text
  if (payload.attachments?.length) {
    body.attachments = payload.attachments.map(att => ({
      filename: att.filename,
      content: att.content, // base64
    }))
  }

  try {
    await postJsonViaSiyuanForwardProxy(endpoint, apiKey, body)
  }
  catch (error: any) {
    if (error?.message?.startsWith?.('HTTP_EMAIL_')) {
      throw error
    }

    throw new Error(`HTTP_EMAIL_PROXY_UNAVAILABLE: ${error?.message || String(error)}`)
  }
}

/**
 * 发送邮件（移动端入口）
 */
export async function sendEmailViaHttp(options: SendEmailOptions): Promise<void> {
  const { config, httpConfig, to, subject, mode, docTitle, htmlContent, mdContent } = options
  const normalizedConfig = normalizeEmailConfig(config)

  if (!httpConfig.httpApiKey) {
    throw new Error('NO_HTTP_API_KEY')
  }

  const endpoint = httpConfig.httpEndpoint
    || (httpConfig.httpProvider === 'resend' ? DEFAULT_ENDPOINT : '')

  if (!endpoint) {
    throw new Error('NO_ENDPOINT')
  }

  const deps = createMobileDeps()
  const fromAddress = normalizedConfig.fromName
    ? `"${normalizedConfig.fromName}" <${normalizedConfig.user || 'onboarding@resend.dev'}>`
    : (normalizedConfig.user || 'onboarding@resend.dev')

  if (mode === 'body') {
    const { html, attachments } = await composeBodyEmailAsync(htmlContent, deps)
    await sendViaResend(endpoint, httpConfig.httpApiKey, {
      from: fromAddress,
      to,
      subject,
      html,
      attachments: attachments.length > 0 ? attachments : undefined,
    })
  }
  else {
    const { text, attachments } = await composeAttachmentEmailAsync(docTitle, mdContent, deps)
    await sendViaResend(endpoint, httpConfig.httpApiKey, {
      from: fromAddress,
      to,
      subject,
      text,
      attachments,
    })
  }
}

/**
 * 异步版本的 composeBodyEmail —— 适配移动端无 fs 场景
 */
async function composeBodyEmailAsync(
  htmlContent: string | undefined,
  deps: EmailComposerDeps,
) {
  const finalHtml = htmlContent || '<p>（无内容）</p>'
  const attachments: Array<{ filename: string, content: string, contentType?: string }> = []

  if (!deps.readAssetAsync || !deps.assetExistsAsync) {
    // 回退到同步模式（桌面端）
    return composeBodyEmail(htmlContent, deps)
  }

  const HTML_ASSET_REGEX = /src="(assets\/[^"]+)"/g
  const assetMap = new Map<string, string>()
  let cidCounter = 0

  // 收集所有 asset 引用
  const matches: Array<{ full: string, assetPath: string }> = []
  let match: RegExpExecArray | null
  while ((match = HTML_ASSET_REGEX.exec(finalHtml)) !== null) {
    matches.push({ full: match[0], assetPath: match[1] })
  }

  let resultHtml = finalHtml

  for (const m of matches) {
    if (assetMap.has(m.assetPath)) {
      resultHtml = resultHtml.replace(m.full, `src="cid:${assetMap.get(m.assetPath)}"`)
      continue
    }

    const absPath = deps.getWorkspacePath(m.assetPath)
    const exists = await deps.assetExistsAsync(absPath)
    if (exists) {
      const cid = `img_${cidCounter++}@siyuan.postman`
      assetMap.set(m.assetPath, cid)
      const asset = await deps.readAssetAsync(absPath)
      attachments.push({
        filename: m.assetPath.split('/').pop() || 'image',
        content: asset.base64,
      })
      resultHtml = resultHtml.replace(m.full, `src="cid:${cid}"`)
    }
  }

  return { html: resultHtml, attachments }
}

/**
 * 异步版本的 composeAttachmentEmail —— 适配移动端无 fs 场景
 */
async function composeAttachmentEmailAsync(
  docTitle: string,
  mdContent: string | undefined,
  deps: EmailComposerDeps,
) {
  if (!deps.readAssetAsync || !deps.assetExistsAsync) {
    return composeAttachmentEmail(docTitle, mdContent, deps)
  }

  const attachContent = mdContent || ''
  const safeTitle = docTitle.replace(/[\\/:*?"<>|]/g, '_')
  const allAssets = new Set<string>()

  const MD_ASSET_REGEX = /!\[.*?\]\((assets\/[^)]+)\)/g
  const HTML_ASSET_REGEX = /src="(assets\/[^"]+)"/g

  let m: RegExpExecArray | null
  while ((m = MD_ASSET_REGEX.exec(attachContent)) !== null) allAssets.add(m[1])
  while ((m = HTML_ASSET_REGEX.exec(attachContent)) !== null) allAssets.add(m[1])

  if (allAssets.size > 0) {
    const zip = new JSZip()
    zip.file(`${safeTitle}.md`, attachContent)

    for (const assetPath of allAssets) {
      const absPath = deps.getWorkspacePath(assetPath)
      const exists = await deps.assetExistsAsync(absPath)
      if (exists) {
        const asset = await deps.readAssetAsync(absPath)
        const buf = asset.buffer instanceof ArrayBuffer
          ? asset.buffer
          : new Uint8Array(asset.buffer as Buffer).buffer
        zip.file(assetPath, buf)
      }
    }

    const zipBase64 = await zip.generateAsync({ type: 'base64' })
    return {
      text: `请查阅附件：${safeTitle}.zip`,
      attachments: [
        { filename: `${safeTitle}.zip`, content: zipBase64, contentType: 'application/zip' },
      ],
    }
  }

  return {
    text: `请查阅附件：${safeTitle}.md`,
    attachments: [
      { filename: `${safeTitle}.md`, content: btoa(unescape(encodeURIComponent(attachContent))), contentType: 'text/markdown; charset=utf-8' },
    ],
  }
}
