import assert from 'node:assert/strict'
import test from 'node:test'

import { markdownToEmailHtml, sanitizeMarkdownForEmail } from './markdownToEmailHtml.ts'

test('markdownToEmailHtml renders headings, emphasis, and lists for email body', () => {
  const markdown = [
    '# 项目周报',
    '',
    '本周完成 **核心功能** 开发。',
    '',
    '- 支持正文发送',
    '- 支持附件发送',
    '',
    '1. 本地测试',
    '2. 提交发布',
  ].join('\n')

  const html = markdownToEmailHtml(markdown)

  assert.match(html, /<h1[^>]*>项目周报<\/h1>/)
  assert.match(html, /<strong>核心功能<\/strong>/)
  assert.match(html, /<ul[^>]*>[\s\S]*<li[^>]*>支持正文发送[\s\S]*?<\/li>[\s\S]*<\/ul>/)
  assert.match(html, /<ol[^>]*>[\s\S]*<li[^>]*>本地测试[\s\S]*?<\/li>[\s\S]*<\/ol>/)
  assert.doesNotMatch(html, />\s*-\s*支持正文发送/)
})

test('markdownToEmailHtml keeps nested list hierarchy', () => {
  const markdown = [
    '- 一级任务',
    '  - 二级任务 A',
    '    - 三级任务 A-1',
    '  - 二级任务 B',
    '- 一级任务二',
    '  1. 二级编号 1',
    '  2. 二级编号 2',
  ].join('\n')

  const html = markdownToEmailHtml(markdown)

  assert.match(html, /<ul[^>]*>[\s\S]*<li[^>]*>一级任务[\s\S]*<ul[^>]*>[\s\S]*<li[^>]*>二级任务 A[\s\S]*<ul[^>]*>[\s\S]*三级任务 A-1[\s\S]*<\/ul>[\s\S]*<\/li>[\s\S]*<li[^>]*>二级任务 B[\s\S]*<\/li>[\s\S]*<\/ul>[\s\S]*<\/li>/)
  assert.match(html, /<li[^>]*>一级任务二[\s\S]*<ol[^>]*>[\s\S]*<li[^>]*>二级编号 1[\s\S]*<\/li>[\s\S]*<li[^>]*>二级编号 2[\s\S]*<\/li>[\s\S]*<\/ol>[\s\S]*<\/li>/)
})

test('markdownToEmailHtml keeps nested list hierarchy when list items are separated by blank lines', () => {
  const markdown = [
    '- 一级项',
    '',
    '  - 二级项 A',
    '',
    '    - 三级项 A-1',
    '',
    '  - 二级项 B',
    '',
    '- 一级项二',
  ].join('\n')

  const html = markdownToEmailHtml(markdown)

  assert.match(html, /<ul[^>]*>[\s\S]*<li[^>]*>一级项[\s\S]*<ul[^>]*>[\s\S]*<li[^>]*>二级项 A[\s\S]*<ul[^>]*>[\s\S]*三级项 A-1[\s\S]*<\/ul>[\s\S]*<\/li>[\s\S]*<li[^>]*>二级项 B[\s\S]*<\/li>[\s\S]*<\/ul>[\s\S]*<\/li>/)
})

test('markdownToEmailHtml keeps link text but removes clickable targets', () => {
  const markdown = '参考链接：[OpenAI 官方站点](https://openai.com/)'

  const html = markdownToEmailHtml(markdown)

  assert.match(html, /OpenAI 官方站点/)
  assert.doesNotMatch(html, /https:\/\/openai\.com/)
  assert.doesNotMatch(html, /<a\s+href=/)
})

test('sanitizeMarkdownForEmail removes backlink sections', () => {
  const markdown = [
    '# 正文标题',
    '',
    '正文内容',
    '',
    '## 反向链接',
    '- [[文档 A]]',
    '- [[文档 B]]',
    '',
    '## 后续章节',
    '继续正文',
  ].join('\n')

  const sanitized = sanitizeMarkdownForEmail(markdown)

  assert.doesNotMatch(sanitized, /反向链接/)
  assert.doesNotMatch(sanitized, /\[\[文档 A\]\]/)
  assert.match(sanitized, /后续章节/)
  assert.match(sanitized, /继续正文/)
})

test('sanitizeMarkdownForEmail removes english backlink heading', () => {
  const markdown = [
    '# Weekly Report',
    '',
    'Summary content',
    '',
    '## Backlinks',
    '- [[Linked note]]',
    '',
    '## Next Section',
    'Main content continues',
  ].join('\n')

  const sanitized = sanitizeMarkdownForEmail(markdown)

  assert.doesNotMatch(sanitized, /Backlinks/)
  assert.doesNotMatch(sanitized, /\[\[Linked note\]\]/)
  assert.match(sanitized, /Next Section/)
})

test('sanitizeMarkdownForEmail removes mention section and kramdown ial lines', () => {
  const markdown = [
    '# 文档标题',
    '',
    '- {: id="20260101"} 一级项',
    '  {: id="20260102"}',
    '  - {: id="20260103"} 二级项',
    '',
    '## 提及',
    '- [[关联文档]]',
    '',
    '## 正文续写',
    '继续内容',
  ].join('\n')

  const sanitized = sanitizeMarkdownForEmail(markdown)

  assert.doesNotMatch(sanitized, /\{:\s*id=/)
  assert.doesNotMatch(sanitized, /## 提及/)
  assert.doesNotMatch(sanitized, /\[\[关联文档\]\]/)
  assert.match(sanitized, /- 一级项/)
  assert.match(sanitized, /- 二级项/)
})

test('sanitizeMarkdownForEmail keeps user-authored "反向链接文档" section content', () => {
  const markdown = [
    '# ~OpenClaw',
    '',
    '## 反向链接文档',
    '- [Cloudflare官方出手!OpenClaw 云端部署保姆级教程](siyuan://blocks/20260207090016-xosnajd)',
    '- ((20260215060020-fivungd "鹿导：开箱即用：9个OpenClaw+飞书 Skills自动化 ***"))',
  ].join('\n')

  const sanitized = sanitizeMarkdownForEmail(markdown)

  assert.match(sanitized, /## 反向链接文档/)
  assert.match(sanitized, /Cloudflare官方出手!OpenClaw 云端部署保姆级教程/)
  assert.match(sanitized, /鹿导：开箱即用：9个OpenClaw\+飞书 Skills自动化 \*\*\*/)
  assert.doesNotMatch(sanitized, /siyuan:\/\/blocks/)
  assert.doesNotMatch(sanitized, /20260215060020-fivungd/)
})

test('sanitizeMarkdownForEmail keeps block-ref visible text but removes ref target', () => {
  const markdown = '关联块：((20200813131152-0wk5akh "在内容块中遨游"))，更多参考：[OpenAI](https://openai.com)'

  const sanitized = sanitizeMarkdownForEmail(markdown)

  assert.match(sanitized, /关联块：在内容块中遨游/)
  assert.match(sanitized, /更多参考：OpenAI/)
  assert.doesNotMatch(sanitized, /20200813131152-0wk5akh/)
  assert.doesNotMatch(sanitized, /https:\/\/openai\.com/)
})

test('sanitizeMarkdownForEmail removes backlink footnote sections and linked footnote documents', () => {
  const markdown = [
    '# OpenClaw 日常操作 2026-02-20',
    '',
    '~OpenClaw[^1]',
    '',
    '- 本地启动OpenClaw',
    '',
    '[^1]: # ~OpenClaw',
    '',
    '    ## 反向链接文档',
    '',
    '    - Cloudflare官方出手!OpenClaw 云端部署保姆级教程 **[^2]',
    '    - [OpenClaw 日常操作 2026-02-20](#20260220075025-ue88wkc)',
    '',
    '[^2]: # Cloudflare官方出手!OpenClaw 云端部署保姆级教程 **',
    '',
    '    这是关联文档正文，不应被发送。',
  ].join('\n')

  const sanitized = sanitizeMarkdownForEmail(markdown)

  assert.match(sanitized, /# OpenClaw 日常操作 2026-02-20/)
  assert.match(sanitized, /~OpenClaw/)
  assert.match(sanitized, /- 本地启动OpenClaw/)
  assert.doesNotMatch(sanitized, /\[\^1\]/)
  assert.doesNotMatch(sanitized, /\[\^1\]:/)
  assert.doesNotMatch(sanitized, /\[\^2\]:/)
  assert.doesNotMatch(sanitized, /反向链接文档/)
  assert.doesNotMatch(sanitized, /关联文档正文/)
})

test('sanitizeMarkdownForEmail removes expanded linked-doc footnotes defined by heading', () => {
  const markdown = [
    '# 当前文档',
    '',
    '安装说明见这里[^16]。',
    '',
    '[^16]: # OpenClaw 安装 Skills',
    '',
    '    这是被展开的说明正文。',
  ].join('\n')

  const sanitized = sanitizeMarkdownForEmail(markdown)

  assert.match(sanitized, /# 当前文档/)
  assert.match(sanitized, /安装说明见这里/)
  assert.doesNotMatch(sanitized, /\[\^16\]/)
  assert.doesNotMatch(sanitized, /OpenClaw 安装 Skills/)
  assert.doesNotMatch(sanitized, /被展开的说明正文/)
})
