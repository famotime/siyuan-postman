/**
 * 思源笔记 Kernel API 封装
 * 用于获取文档内容、标题、导出等
 */
import { fetchSyncPost } from 'siyuan'

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
 * 获取文档 HTML 渲染内容（通过 export/exportHTML API）
 * 思源笔记提供 /api/export/exportPreviewHTML 用于预览
 */
export async function exportDocAsHtml(docId: string): Promise<string> {
  try {
    const res = await request<{ content: string }>(
      '/api/export/exportPreviewHTML',
      { id: docId },
    )
    return res.content || ''
  }
  catch {
    // 降级：使用 Markdown
    const { content } = await exportDocAsMarkdown(docId)
    return markdownToSimpleHtml(content)
  }
}

/**
 * 将 Markdown 转换为简单 HTML（降级处理）
 * 仅做基础换行/代码块处理，不引入外部 markdown 库
 */
function markdownToSimpleHtml(md: string): string {
  const escaped = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // 标题
  let html = escaped
    .replace(/^#{1}\s+(.+)$/gm, '<h1>$1</h1>')
    .replace(/^#{2}\s+(.+)$/gm, '<h2>$1</h2>')
    .replace(/^#{3}\s+(.+)$/gm, '<h3>$1</h3>')
    .replace(/^#{4,6}\s+(.+)$/gm, '<h4>$1</h4>')
  // 加粗
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  // 斜体
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
  // 行内代码
    .replace(/`(.+?)`/g, '<code>$1</code>')
  // 链接
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
  // 换行
    .replace(/\n/g, '<br>\n')

  return `<div style="font-family: sans-serif; line-height: 1.6; padding: 16px;">${html}</div>`
}
