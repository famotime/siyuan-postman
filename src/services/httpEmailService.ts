/**
 * HTTP 邮件发送服务（移动端）
 * 通过 Resend REST API 发送邮件，不依赖 Node.js 模块
 */
import type { EmailConfig } from '../composables/useEmailConfig.ts'
import { assetExists, readAsset } from './assetReader.ts'
import { composeAttachmentEmailWithAdapter, composeBodyEmailWithAdapter, type EmailComposerAssetAdapter } from './emailComposerShared.ts'

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
const DEFAULT_RESEND_FROM = '"SiYuan Postman" <onboarding@resend.dev>'

interface HttpEmailAttachment {
  filename: string
  content: string
  contentType?: string
  contentId?: string
}

function getEmailDomain(value: unknown): string {
  const text = typeof value === 'string' ? value : ''
  const match = text.match(/<([^>]+)>$/)
  const email = (match?.[1] || text).trim()
  return email.includes('@') ? email.split('@').pop() || '' : ''
}

function logForwardProxyRequest(
  endpoint: string,
  body: Record<string, any>,
  proxyPayload: Record<string, any>,
  via: 'fetchSyncPost' | 'nativeFetch',
) {
  console.info('[Postman] HTTP 邮件代理请求参数', {
    via,
    endpoint,
    payloadType: typeof proxyPayload.payload,
    contentType: 'application/json',
    hasInnerContentTypeHeader: Array.isArray(proxyPayload.headers)
      && proxyPayload.headers.some((header: Record<string, string>) => header['Content-Type'] === 'application/json'),
    fromDomain: getEmailDomain(body.from),
    toCount: Array.isArray(body.to) ? body.to.length : 0,
    hasHtml: typeof body.html === 'string' && body.html.length > 0,
    hasText: typeof body.text === 'string' && body.text.length > 0,
    attachmentCount: Array.isArray(body.attachments) ? body.attachments.length : 0,
  })
}

function logForwardProxyResponse(response: any, via: 'fetchSyncPost' | 'nativeFetch') {
  console.info('[Postman] HTTP 邮件代理响应摘要', {
    via,
    code: response?.code,
    status: response?.data?.status,
    contentType: response?.data?.contentType,
    bodyPreview: typeof response?.data?.body === 'string'
      ? response.data.body.slice(0, 300)
      : '',
  })
}

function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const mimeMap: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    bmp: 'image/bmp',
  }
  return mimeMap[ext] || 'application/octet-stream'
}

/**
 * 构建移动端可用的邮件组装资源适配器
 * 通过思源内核 API 读取资源文件
 */
function createMobileComposerAdapter(): EmailComposerAssetAdapter<HttpEmailAttachment, string, string> {
  const wsDir = (window as any).siyuan?.config?.system?.workspaceDir || ''
  const toWorkspaceRelativePath = (absPath: string) => {
    return absPath.startsWith(wsDir)
      ? absPath.slice(wsDir.length)
      : absPath
  }

  return {
    getWorkspacePath: relativePath => `${wsDir}/data/${relativePath}`,
    basename: assetPath => assetPath.split('/').pop() || assetPath,
    assetExists: async absPath => assetExists(absPath, toWorkspaceRelativePath(absPath)),
    readAsset: async absPath => readAsset(absPath, toWorkspaceRelativePath(absPath)),
    createInlineAttachment: async ({ assetPath, cid, asset }) => {
      const filename = assetPath.split('/').pop() || 'image'
      return {
        filename,
        content: asset.base64,
        contentId: cid,
        contentType: getMimeType(filename),
      }
    },
    createArchiveContent: zip => zip.generateAsync({ type: 'base64' }),
    createTextContent: text => btoa(unescape(encodeURIComponent(text))),
  }
}

/**
 * 调用思源笔记 Kernel API
 * 优先使用测试钩子，其次尝试动态加载 siyuan SDK。
 * 返回 null 表示 SDK 不可用，由调用方决定降级策略。
 */
async function postSiyuanApi(url: string, data: unknown): Promise<any> {
  const testFetchSyncPost = (globalThis as any).__POSTMAN_FETCH_SYNC_POST__
  if (typeof testFetchSyncPost === 'function') {
    return testFetchSyncPost(url, data)
  }

  try {
    const siyuan = await import('siyuan')
    if (typeof siyuan.fetchSyncPost === 'function') {
      return siyuan.fetchSyncPost(url, data)
    }
  }
  catch {
    // siyuan SDK 不可用
  }
  return null
}

/**
 * 通过思源服务端（Kernel）的网络中转接口转发请求至 Resend API。
 * 如果官方 SDK 方法不可用，则通过原生 fetch 进行降级转发。
 */
async function postJsonViaSiyuanForwardProxy(
  endpoint: string,
  apiKey: string,
  body: Record<string, any>,
): Promise<void> {
  const resendBody = {
    ...body,
    from: DEFAULT_RESEND_FROM,
  }

  const payload = {
    url: endpoint,
    method: 'POST',
    timeout: 30000,
    contentType: 'application/json',
    headers: [
      { Authorization: `Bearer ${apiKey}` },
      { 'Content-Type': 'application/json' },
    ],
    payload: JSON.stringify(resendBody),
  }

  // 1. 优先尝试使用思源官方 SDK 的 fetchSyncPost 方法发送代理请求
  let response: any = null
  try {
    logForwardProxyRequest(endpoint, resendBody, payload, 'fetchSyncPost')
    response = await postSiyuanApi('/api/network/forwardProxy', payload)
  }
  catch (error) {
    console.warn('[Postman] fetchSyncPost 接口调用失败，准备使用原生 fetch 转发降级方案。', error)
  }

  // 2. 如果官方 SDK 返回了有效响应，则直接处理该响应（一般用于桌面端或支持官方 API 调用环境）
  if (response !== null) {
    logForwardProxyResponse(response, 'fetchSyncPost')
    if (response?.code !== 0) {
      throw new Error(`HTTP_EMAIL_PROXY: ${response?.msg || 'forwardProxy failed'}`)
    }

    const status = Number(response?.data?.status || 0)
    if (status < 200 || status >= 300) {
      throw new Error(`HTTP_EMAIL_${status || 'PROXY'}: ${response?.data?.body || response?.msg || ''}`)
    }
    return
  }

  // 3. 降级方案：在移动端 WebView 中使用原生 fetch 直接访问本机的 /api/network/forwardProxy 中转接口。
  // 原生 fetch 发送相对路径请求时，会自动携带浏览器当前的 Session Cookie，从而安全通过思源服务端的鉴权，无需暴露 apiToken。
  console.info('[Postman] 正在启动原生 fetch 转发降级方案。')

  let baseUrl = ''
  if (window.location && window.location.origin && window.location.origin !== 'file://') {
    baseUrl = window.location.origin
  }

  const proxyApiUrl = `${baseUrl}/api/network/forwardProxy`

  const fetchRes = await fetch(proxyApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!fetchRes.ok) {
    const errorText = await fetchRes.text()
    throw new Error(`HTTP_EMAIL_PROXY: 网络请求错误 ${fetchRes.status} ${fetchRes.statusText} - ${errorText}`)
  }

  const responseJson = await fetchRes.json()
  logForwardProxyResponse(responseJson, 'nativeFetch')

  if (responseJson?.code !== 0) {
    throw new Error(`HTTP_EMAIL_PROXY: ${responseJson?.msg || 'forwardProxy failed'}`)
  }

  const status = Number(responseJson?.data?.status || 0)
  if (status < 200 || status >= 300) {
    throw new Error(`HTTP_EMAIL_${status || 'PROXY'}: ${responseJson?.data?.body || responseJson?.msg || ''}`)
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
    attachments?: HttpEmailAttachment[]
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
    // Resend REST API 使用 snake_case 字段名（区别于 Node.js SDK 的 camelCase）
    body.attachments = payload.attachments.map((att) => {
      const entry: Record<string, string> = {
        filename: att.filename,
        content: att.content, // base64
      }
      if (att.contentType) entry.contentType = att.contentType
      // contentId 用于将附件与 HTML 中 cid: 引用关联，实现内联显示
      if (att.contentId) entry.contentId = att.contentId
      return entry
    })
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
  const { httpConfig, to, subject, mode, docTitle, htmlContent, mdContent } = options

  if (!httpConfig.httpApiKey) {
    throw new Error('NO_HTTP_API_KEY')
  }

  const endpoint = httpConfig.httpEndpoint
    || (httpConfig.httpProvider === 'resend' ? DEFAULT_ENDPOINT : '')

  if (!endpoint) {
    throw new Error('NO_ENDPOINT')
  }

  const composerAdapter = createMobileComposerAdapter()
  const fromAddress = DEFAULT_RESEND_FROM

  if (mode === 'body') {
    const { html, attachments } = await composeBodyEmailWithAdapter(htmlContent, composerAdapter)
    await sendViaResend(endpoint, httpConfig.httpApiKey, {
      from: fromAddress,
      to,
      subject,
      html,
      attachments: attachments.length > 0 ? attachments : undefined,
    })
  }
  else {
    const { text, attachments } = await composeAttachmentEmailWithAdapter(docTitle, mdContent, composerAdapter)
    await sendViaResend(endpoint, httpConfig.httpApiKey, {
      from: fromAddress,
      to,
      subject,
      text,
      attachments,
    })
  }
}
