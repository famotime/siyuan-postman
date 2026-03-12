import JSZip from 'jszip'

export interface EmailComposerDeps {
  fs: {
    existsSync: (path: string) => boolean
    readFileSync: (path: string) => Buffer
  }
  path: {
    basename: (path: string) => string
  }
  getWorkspacePath: (relativePath: string) => string
}

export interface BodyComposeResult {
  html: string
  attachments: Array<{ filename: string, path: string, cid: string }>
}

export interface AttachmentComposeResult {
  text: string
  attachments: Array<{ filename: string, content: Buffer | string, contentType: string }>
}

const HTML_ASSET_REGEX = /src="(assets\/[^"]+)"/g
const MD_ASSET_REGEX = /!\[.*?\]\((assets\/[^)]+)\)/g

function sanitizeDocTitle(title: string): string {
  return title.replace(/[\\/:*?"<>|]/g, '_')
}

export function composeBodyEmail(htmlContent: string | undefined, deps: EmailComposerDeps): BodyComposeResult {
  const { fs, path, getWorkspacePath } = deps
  let finalHtml = htmlContent || '<p>（无内容）</p>'
  const attachments: Array<{ filename: string, path: string, cid: string }> = []
  let cidCounter = 0
  const assetMap = new Map<string, string>()

  finalHtml = finalHtml.replace(HTML_ASSET_REGEX, (fullMatch, assetPath) => {
    if (assetMap.has(assetPath)) {
      return `src="cid:${assetMap.get(assetPath)}"`
    }

    const absPath = getWorkspacePath(assetPath)
    if (fs.existsSync(absPath)) {
      const cid = `img_${cidCounter++}@siyuan.postman`
      assetMap.set(assetPath, cid)
      attachments.push({
        filename: path.basename(assetPath),
        path: absPath,
        cid,
      })
      return `src="cid:${cid}"`
    }

    return fullMatch
  })

  return { html: finalHtml, attachments }
}

export async function composeAttachmentEmail(
  docTitle: string,
  mdContent: string | undefined,
  deps: EmailComposerDeps,
): Promise<AttachmentComposeResult> {
  const { fs, getWorkspacePath } = deps
  const attachContent = mdContent || ''
  const safeTitle = sanitizeDocTitle(docTitle)
  const allAssets = new Set<string>()

  let match: RegExpExecArray | null = null
  while ((match = MD_ASSET_REGEX.exec(attachContent)) !== null) {
    allAssets.add(match[1])
  }
  while ((match = HTML_ASSET_REGEX.exec(attachContent)) !== null) {
    allAssets.add(match[1])
  }

  if (allAssets.size > 0) {
    const zip = new JSZip()
    zip.file(`${safeTitle}.md`, attachContent)

    for (const assetPath of allAssets) {
      const absPath = getWorkspacePath(assetPath)
      if (fs.existsSync(absPath)) {
        zip.file(assetPath, fs.readFileSync(absPath))
      }
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })
    return {
      text: `请查阅附件：${safeTitle}.zip`,
      attachments: [
        {
          filename: `${safeTitle}.zip`,
          content: zipBuffer,
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
        content: attachContent,
        contentType: 'text/markdown; charset=utf-8',
      },
    ],
  }
}
