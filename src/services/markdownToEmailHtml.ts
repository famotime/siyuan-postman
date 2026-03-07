function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function isBacklinkHeading(text: string): boolean {
  const normalized = text
    .replace(/[*_`~#[\](){}<>"'|:：]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

  return /(反向链接|反链|反向提及|关联文档|关联引用|提及|被提及|backlinks?|linked references?|linked mentions?|referenced by|mentions?)/i.test(normalized)
}

function stripKramdownInlineAttribute(line: string): string {
  let cleaned = line
    .replace(/^(\s*(?:[-+*]|\d+\.)\s+)\{:[^}]+\}\s*/g, '$1')
    .replace(/^(\s*#{1,6}\s+.+?)\s+\{:[^}]+\}\s*$/g, '$1')
    .replace(/\s+\{:[^}]+\}\s*$/g, '')

  if (/^\s*\{:[^}]+\}\s*$/.test(cleaned)) {
    return ''
  }

  cleaned = cleaned
    .replace(/\(\(([0-9A-Za-z-]+)\s+"[^"]*"\)\)/g, '(($1))')
    .replace(/\(\(([0-9A-Za-z-]+)\s+'[^']*'\)\)/g, '(($1))')

  return cleaned
}

function removeAssociatedFootnoteSections(lines: string[]): string[] {
  type FootnoteBlock = {
    id: string
    start: number
    end: number
    content: string
  }

  const blocks: FootnoteBlock[] = []

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^\[\^([^\]]+)\]:\s*(.*)$/)
    if (!match) {
      continue
    }

    const id = match[1]
    const blockLines = [lines[i]]
    let end = i

    for (let j = i + 1; j < lines.length; j++) {
      if (/^\[\^[^\]]+\]:/.test(lines[j])) {
        break
      }
      if (lines[j].trim() === '' || /^\s+/.test(lines[j])) {
        blockLines.push(lines[j])
        end = j
        continue
      }
      break
    }

    blocks.push({
      id,
      start: i,
      end,
      content: blockLines.join('\n'),
    })

    i = end
  }

  if (blocks.length === 0) {
    return lines
  }

  const blockById = new Map<string, FootnoteBlock>()
  const refsById = new Map<string, Set<string>>()
  for (const block of blocks) {
    blockById.set(block.id, block)
    const refs = new Set<string>()
    const regex = /\[\^([^\]]+)\]/g
    let matched: RegExpExecArray | null = null
    while ((matched = regex.exec(block.content))) {
      if (matched[1] !== block.id) {
        refs.add(matched[1])
      }
    }
    refsById.set(block.id, refs)
  }

  const shouldRemoveSeeds = blocks
    .filter(({ content }) => {
      return /(反向链接文档|反向链接|反链|关联文档|关联引用|backlinks?|linked references?|linked mentions?|referenced by)/i.test(content)
        || /^\[\^[^\]]+\]:\s*#{1,6}\s+\S+/.test(content)
    })
    .map(block => block.id)

  if (shouldRemoveSeeds.length === 0) {
    return lines
  }

  const removedIds = new Set<string>(shouldRemoveSeeds)
  const queue = [...shouldRemoveSeeds]
  while (queue.length > 0) {
    const currentId = queue.shift()!
    const refs = refsById.get(currentId)
    if (!refs) {
      continue
    }
    for (const refId of refs) {
      if (!removedIds.has(refId) && blockById.has(refId)) {
        removedIds.add(refId)
        queue.push(refId)
      }
    }
  }

  const skippedLineNumbers = new Set<number>()
  for (const block of blocks) {
    if (!removedIds.has(block.id)) {
      continue
    }
    for (let lineNo = block.start; lineNo <= block.end; lineNo++) {
      skippedLineNumbers.add(lineNo)
    }
  }

  const sanitized: string[] = []
  for (let i = 0; i < lines.length; i++) {
    if (skippedLineNumbers.has(i)) {
      continue
    }
    const line = lines[i].replace(/\[\^([^\]]+)\]/g, (fullMatch, id) => {
      return removedIds.has(id) ? '' : fullMatch
    })
    sanitized.push(line)
  }

  return sanitized
}

export function sanitizeMarkdownForEmail(markdown: string): string {
  const strippedLines = markdown
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(stripKramdownInlineAttribute)

  const lines = removeAssociatedFootnoteSections(strippedLines)
  const sanitized: string[] = []
  let skippingBacklinkSection = false
  let backlinkHeadingLevel = 0

  for (const line of lines) {
    const headingMatch = line.match(/^\s{0,3}(#{1,6})\s+(.+)$/)

    if (skippingBacklinkSection) {
      if (headingMatch && headingMatch[1].length <= backlinkHeadingLevel) {
        skippingBacklinkSection = false
      }
      else {
        continue
      }
    }

    if (headingMatch && isBacklinkHeading(headingMatch[2])) {
      skippingBacklinkSection = true
      backlinkHeadingLevel = headingMatch[1].length
      while (sanitized.length > 0 && sanitized[sanitized.length - 1].trim() === '') {
        sanitized.pop()
      }
      continue
    }

    sanitized.push(line)
  }

  const compacted = sanitized.join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return compacted
}

function parseInlineMarkdown(line: string): string {
  const codeTokens: string[] = []
  let tokenIndex = 0

  let parsed = line.replace(/`([^`]+)`/g, (_, code: string) => {
    const token = `@@CODE_TOKEN_${tokenIndex++}@@`
    codeTokens.push(`<code style="font-family: Consolas, monospace; background: #f4f6f8; border-radius: 4px; padding: 2px 6px;">${escapeHtml(code)}</code>`)
    return token
  })

  parsed = escapeHtml(parsed)

  parsed = parsed
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; height: auto; border-radius: 4px;" />')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" style="color: #0f62fe; text-decoration: underline;">$1</a>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,!?:;]|$)/g, '$1<em>$2</em>')
    .replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,!?:;]|$)/g, '$1<em>$2</em>')

  for (let i = 0; i < codeTokens.length; i++) {
    parsed = parsed.replace(`@@CODE_TOKEN_${i}@@`, codeTokens[i])
  }

  return parsed
}

export function markdownToEmailHtml(markdown: string): string {
  const cleanedMarkdown = sanitizeMarkdownForEmail(markdown)
  const lines = cleanedMarkdown.split('\n')
  const htmlParts: string[] = []
  const paragraphBuffer: string[] = []
  const listStack: Array<{ type: 'ul' | 'ol', indent: number, liOpen: boolean }> = []
  let inCodeBlock = false
  const codeBuffer: string[] = []

  const flushParagraph = () => {
    if (paragraphBuffer.length === 0) {
      return
    }
    const content = paragraphBuffer.map(parseInlineMarkdown).join('<br>')
    htmlParts.push(`<p style="margin: 0 0 12px;">${content}</p>`)
    paragraphBuffer.length = 0
  }

  const openList = (type: 'ul' | 'ol', indent: number) => {
    const depth = listStack.length + 1
    const marginLeft = Math.max(0, (depth - 1) * 20)
    const listStyleType = type === 'ul'
      ? (depth === 1 ? 'disc' : depth === 2 ? 'circle' : 'square')
      : (depth === 1 ? 'decimal' : depth === 2 ? 'lower-alpha' : 'lower-roman')
    htmlParts.push(`<${type} style="margin: 0 0 12px ${marginLeft}px; padding-left: 20px; list-style-position: outside; list-style-type: ${listStyleType};">`)
    listStack.push({ type, indent, liOpen: false })
  }

  const closeTopListItem = () => {
    const top = listStack[listStack.length - 1]
    if (!top || !top.liOpen) {
      return
    }
    htmlParts.push('</li>')
    top.liOpen = false
  }

  const closeTopList = () => {
    const top = listStack[listStack.length - 1]
    if (!top) {
      return
    }
    closeTopListItem()
    htmlParts.push(`</${top.type}>`)
    listStack.pop()
  }

  const closeAllLists = () => {
    while (listStack.length > 0) {
      closeTopList()
    }
  }

  const pushListItem = (type: 'ul' | 'ol', indent: number, content: string) => {
    while (listStack.length > 0 && indent < listStack[listStack.length - 1].indent) {
      closeTopList()
    }

    if (listStack.length === 0) {
      openList(type, indent)
    }
    else {
      const top = listStack[listStack.length - 1]
      if (indent > top.indent) {
        if (!top.liOpen) {
          top.liOpen = true
          htmlParts.push('<li style="margin: 6px 0;">')
        }
        openList(type, indent)
      }
      else if (indent === top.indent) {
        if (top.type !== type) {
          closeTopList()
          if (listStack.length === 0 || listStack[listStack.length - 1].indent !== indent || listStack[listStack.length - 1].type !== type) {
            openList(type, indent)
          }
        }
        else {
          closeTopListItem()
        }
      }
      else {
        while (listStack.length > 0 && indent < listStack[listStack.length - 1].indent) {
          closeTopList()
        }
        if (listStack.length === 0 || listStack[listStack.length - 1].indent !== indent || listStack[listStack.length - 1].type !== type) {
          openList(type, indent)
        }
        else {
          closeTopListItem()
        }
      }
    }

    const current = listStack[listStack.length - 1]
    current.liOpen = true
    htmlParts.push(`<li style="margin: 6px 0;">${parseInlineMarkdown(content)}`)
  }

  const flushCodeBlock = () => {
    if (codeBuffer.length === 0) {
      return
    }
    const code = escapeHtml(codeBuffer.join('\n'))
    htmlParts.push(`<pre style="margin: 0 0 12px; padding: 12px; background: #f5f7fa; border-radius: 6px; overflow-x: auto;"><code style="font-family: Consolas, monospace;">${code}</code></pre>`)
    codeBuffer.length = 0
  }

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const rawLine = lines[lineIndex]
    const line = rawLine.trimEnd()

    if (/^```/.test(line)) {
      flushParagraph()
      closeAllLists()

      if (inCodeBlock) {
        flushCodeBlock()
        inCodeBlock = false
      }
      else {
        inCodeBlock = true
      }
      continue
    }

    if (inCodeBlock) {
      codeBuffer.push(rawLine)
      continue
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      flushParagraph()
      closeAllLists()
      const level = headingMatch[1].length
      const content = parseInlineMarkdown(headingMatch[2])
      htmlParts.push(`<h${level} style="margin: 18px 0 10px; line-height: 1.4;">${content}</h${level}>`)
      continue
    }

    const listMatch = rawLine.match(/^(\s*)([-+*]|\d+\.)\s+(.+)$/)
    if (listMatch) {
      flushParagraph()
      const indent = listMatch[1].replace(/\t/g, '    ').length
      const marker = listMatch[2]
      const content = listMatch[3]
      const listType = /\d+\./.test(marker) ? 'ol' : 'ul'
      pushListItem(listType, indent, content)
      continue
    }

    if (line.trim() === '') {
      flushParagraph()

      if (listStack.length > 0) {
        const top = listStack[listStack.length - 1]
        let nextIndex = lineIndex + 1
        while (nextIndex < lines.length && lines[nextIndex].trim() === '') {
          nextIndex++
        }

        if (nextIndex < lines.length) {
          const nextRawLine = lines[nextIndex]
          const nextListMatch = nextRawLine.match(/^(\s*)([-+*]|\d+\.)\s+(.+)$/)
          if (nextListMatch) {
            continue
          }
          const nextIndent = (nextRawLine.match(/^(\s*)/)?.[1] || '').replace(/\t/g, '    ').length
          if (nextIndent > top.indent) {
            continue
          }
        }
      }

      closeAllLists()
      continue
    }

    if (listStack.length > 0) {
      const top = listStack[listStack.length - 1]
      const currentIndent = (rawLine.match(/^(\s*)/)?.[1] || '').replace(/\t/g, '    ').length
      if (currentIndent > top.indent) {
        const continuation = line.trim()
        if (continuation.length > 0) {
          htmlParts.push(`<br>${parseInlineMarkdown(continuation)}`)
          continue
        }
      }
    }

    closeAllLists()
    paragraphBuffer.push(line)
  }

  if (inCodeBlock) {
    flushCodeBlock()
  }
  flushParagraph()
  closeAllLists()

  const body = htmlParts.length > 0
    ? htmlParts.join('\n')
    : '<p style="margin: 0;">（无内容）</p>'

  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.7; color: #1f2937; padding: 16px;">${body}</div>`
}
