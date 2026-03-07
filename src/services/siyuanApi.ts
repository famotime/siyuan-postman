/**
 * 思源笔记 Kernel API 封装
 * 用于获取文档内容、标题、导出等
 */
import { fetchSyncPost } from 'siyuan'

import { markdownToEmailHtml } from './markdownToEmailHtml'

/**
 * 统一 API 调用封装
 */
async function request<T = any>(url: string, data?: any): Promise<T> {
  const res = await fetchSyncPost(url, data)
  if (res.code !== 0) {
    throw new Error(res.msg || `API 调用失败: ${url}`)
  }
  return res.data as T
}

/**
 * 通过块 ID 获取文档标题（human-readable path）
 */
export async function getDocTitle(blockId: string): Promise<string> {
  try {
    const path = await request<string>('/api/filetree/getHPathByID', { id: blockId })
    // 取最后一段作为文档标题
    const parts = path.split('/')
    return parts[parts.length - 1] || '未命名文档'
  }
  catch {
    return '未命名文档'
  }
}

/**
 * 导出文档为 Markdown 内容
 */
export async function exportDocAsMarkdown(docId: string): Promise<{ hPath: string, content: string }> {
  const res = await request<{ hPath: string, content: string }>(
    '/api/export/exportMdContent',
    { id: docId },
  )
  return res
}

/**
 * 导出文档并转换为邮件正文 HTML
 */
export async function exportDocAsHtml(docId: string): Promise<string> {
  try {
    const { content } = await exportDocAsMarkdown(docId)
    return markdownToEmailHtml(content)
  }
  catch {
    // 降级：使用思源渲染后的 HTML 预览内容
    const res = await request<{ content: string }>(
      '/api/export/exportPreviewHTML',
      { id: docId },
    )
    return res.content || ''
  }
}
