import JSZip from 'jszip'

import type { AssetReaderResult } from './assetReader.ts'
export type { AssetReaderResult }

export interface EmailComposerAssetAdapter<InlineAttachment, ArchiveContent, TextContent> {
  getWorkspacePath: (assetPath: string) => string
  basename: (assetPath: string) => string
  assetExists: (absPath: string) => Promise<boolean>
  readAsset: (absPath: string) => Promise<AssetReaderResult>
  createInlineAttachment: (input: {
    assetPath: string
    absPath: string
    cid: string
    asset: AssetReaderResult
  }) => Promise<InlineAttachment>
  createArchiveContent: (zip: JSZip) => Promise<ArchiveContent>
  createTextContent: (text: string) => TextContent
}

export interface BodyComposeResult<InlineAttachment> {
  html: string
  attachments: InlineAttachment[]
}

export interface AttachmentComposeResult<Content> {
  text: string
  attachments: Array<{ filename: string, content: Content, contentType: string }>
}

const HTML_SRC_REGEX = /src\s*=\s*(["'])([^"']+)\1/g
const MD_IMAGE_REGEX = /!\[.*?\]\(([^)]+)\)/g

function sanitizeDocTitle(title: string): string {
  return title.replace(/[\\/:*?"<>|]/g, '_')
}

export function normalizeSiyuanAssetPath(src: string): string | null {
  const trimmed = src.trim()
  if (!trimmed || /^(https?:|data:|blob:|cid:)/i.test(trimmed)) {
    return null
  }

  const cleanPath = trimmed.split(/[?#]/, 1)[0].replace(/\\/g, '/').replace(/^\/+/, '')
  if (cleanPath.startsWith('data/assets/')) {
    return cleanPath.slice('data/'.length)
  }
  if (cleanPath.startsWith('assets/')) {
    return cleanPath
  }
  return null
}

function collectMarkdownAssetPaths(markdown: string): Set<string> {
  const assets = new Set<string>()
  let match: RegExpExecArray | null
  while ((match = MD_IMAGE_REGEX.exec(markdown)) !== null) {
    const assetPath = normalizeSiyuanAssetPath(match[1])
    if (assetPath) assets.add(assetPath)
  }
  return assets
}

function collectHtmlAssetPaths(html: string): Set<string> {
  const assets = new Set<string>()
  let match: RegExpExecArray | null
  while ((match = HTML_SRC_REGEX.exec(html)) !== null) {
    const assetPath = normalizeSiyuanAssetPath(match[2])
    if (assetPath) assets.add(assetPath)
  }
  return assets
}

function toZipBuffer(buffer: ArrayBuffer | Buffer): ArrayBuffer {
  if (buffer instanceof ArrayBuffer) {
    return buffer
  }

  const view = new Uint8Array(buffer)
  return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength)
}

export async function composeBodyEmailWithAdapter<InlineAttachment, ArchiveContent, TextContent>(
  htmlContent: string | undefined,
  adapter: EmailComposerAssetAdapter<InlineAttachment, ArchiveContent, TextContent>,
): Promise<BodyComposeResult<InlineAttachment>> {
  const finalHtml = htmlContent || '<p>（无内容）</p>'
  const attachments: InlineAttachment[] = []
  const assetMap = new Map<string, string>()
  let cidCounter = 0

  const matches: Array<{ full: string, quote: string, assetPath: string }> = []
  let match: RegExpExecArray | null
  while ((match = HTML_SRC_REGEX.exec(finalHtml)) !== null) {
    const assetPath = normalizeSiyuanAssetPath(match[2])
    if (assetPath) {
      matches.push({ full: match[0], quote: match[1], assetPath })
    }
  }

  let resultHtml = finalHtml
  for (const item of matches) {
    const existingCid = assetMap.get(item.assetPath)
    if (existingCid) {
      resultHtml = resultHtml.replace(item.full, `src=${item.quote}cid:${existingCid}${item.quote}`)
      continue
    }

    const absPath = adapter.getWorkspacePath(item.assetPath)
    if (!await adapter.assetExists(absPath)) {
      continue
    }

    const cid = `img_${cidCounter++}@siyuan.postman`
    assetMap.set(item.assetPath, cid)
    const asset = await adapter.readAsset(absPath)
    attachments.push(await adapter.createInlineAttachment({
      assetPath: item.assetPath,
      absPath,
      cid,
      asset,
    }))
    resultHtml = resultHtml.replace(item.full, `src=${item.quote}cid:${cid}${item.quote}`)
  }

  return { html: resultHtml, attachments }
}

export async function composeAttachmentEmailWithAdapter<InlineAttachment, ArchiveContent, TextContent>(
  docTitle: string,
  mdContent: string | undefined,
  adapter: EmailComposerAssetAdapter<InlineAttachment, ArchiveContent, TextContent>,
): Promise<AttachmentComposeResult<ArchiveContent | TextContent>> {
  const attachContent = mdContent || ''
  const safeTitle = sanitizeDocTitle(docTitle)
  const allAssets = new Set<string>([
    ...collectMarkdownAssetPaths(attachContent),
    ...collectHtmlAssetPaths(attachContent),
  ])

  if (allAssets.size > 0) {
    const zip = new JSZip()
    zip.file(`${safeTitle}.md`, attachContent)

    for (const assetPath of allAssets) {
      const absPath = adapter.getWorkspacePath(assetPath)
      if (await adapter.assetExists(absPath)) {
        const asset = await adapter.readAsset(absPath)
        zip.file(assetPath, toZipBuffer(asset.buffer))
      }
    }

    return {
      text: `请查阅附件：${safeTitle}.zip`,
      attachments: [
        {
          filename: `${safeTitle}.zip`,
          content: await adapter.createArchiveContent(zip),
          contentType: 'application/zip',
        },
      ],
    }
  }

  return {
    text: `请查阅附件：${safeTitle}.md`,
    attachments: [
      {
        filename: `${safeTitle}.md`,
        content: adapter.createTextContent(attachContent),
        contentType: 'text/markdown; charset=utf-8',
      },
    ],
  }
}
