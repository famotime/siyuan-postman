import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import JSZip from 'jszip'

import { composeAttachmentEmail, composeBodyEmail } from './emailComposer.ts'

function createDeps(existingPaths = new Set(), fileContents = new Map()) {
  return {
    fs: {
      existsSync: (filePath) => existingPaths.has(filePath),
      readFileSync: (filePath) => fileContents.get(filePath) || Buffer.from(''),
    },
    path,
    getWorkspacePath: (relativePath) => `/workspace/${relativePath}`,
  }
}

test('composeBodyEmail replaces asset src with cid and de-duplicates attachments', () => {
  const html = '<p><img src="assets/foo.png"><img src="assets/foo.png"><img src="assets/bar.png"></p>'
  const deps = createDeps()
  const fooPath = deps.getWorkspacePath('assets/foo.png')
  const barPath = deps.getWorkspacePath('assets/bar.png')
  deps.fs.existsSync = (filePath) => filePath === fooPath || filePath === barPath

  const result = composeBodyEmail(html, deps)

  assert.equal(result.attachments.length, 2)
  assert.match(result.html, /src="cid:img_0@siyuan\.postman"/)
  assert.match(result.html, /src="cid:img_1@siyuan\.postman"/)
  assert.equal(result.attachments[0].filename, 'foo.png')
  assert.equal(result.attachments[0].path, fooPath)
  assert.equal(result.attachments[0].cid, 'img_0@siyuan.postman')
  assert.equal(result.attachments[1].filename, 'bar.png')
})

test('composeBodyEmail keeps original src when asset is missing', () => {
  const html = '<img src="assets/missing.png">'
  const deps = createDeps()

  const result = composeBodyEmail(html, deps)

  assert.equal(result.attachments.length, 0)
  assert.match(result.html, /src="assets\/missing\.png"/)
})

test('composeAttachmentEmail packages markdown and assets into zip when assets exist', async () => {
  const markdown = [
    '# Title',
    '',
    '![Cover](assets/cover.png)',
    '<img src="assets/inline.jpg">',
  ].join('\n')
  const deps = createDeps()
  const coverPath = deps.getWorkspacePath('assets/cover.png')
  const inlinePath = deps.getWorkspacePath('assets/inline.jpg')
  deps.fs.existsSync = (filePath) => filePath === coverPath || filePath === inlinePath
  deps.fs.readFileSync = (filePath) => Buffer.from(`file:${filePath}`)

  const result = await composeAttachmentEmail('Doc/Title', markdown, deps)

  assert.equal(result.attachments.length, 1)
  assert.match(result.text, /请查阅附件：Doc_Title\.zip/)
  assert.match(result.attachments[0].filename, /Doc_Title\.zip/)

  const zip = await JSZip.loadAsync(result.attachments[0].content)
  const fileNames = Object.keys(zip.files)
  assert.equal(fileNames.includes('Doc_Title.md'), true)
  assert.equal(fileNames.includes('assets/cover.png'), true)
  assert.equal(fileNames.includes('assets/inline.jpg'), true)
})

test('composeAttachmentEmail sends markdown file when no assets are referenced', async () => {
  const markdown = '# No assets'
  const deps = createDeps()

  const result = await composeAttachmentEmail('Plain Doc', markdown, deps)

  assert.equal(result.attachments.length, 1)
  assert.match(result.text, /请查阅附件：Plain Doc\.md/)
  assert.equal(result.attachments[0].filename, 'Plain Doc.md')
  assert.equal(result.attachments[0].content, markdown)
  assert.equal(result.attachments[0].contentType, 'text/markdown; charset=utf-8')
})

test('composeAttachmentEmail keeps markdown links in exported attachment', async () => {
  const markdown = '更多参考：[OpenAI](https://openai.com/)'
  const deps = createDeps()

  const result = await composeAttachmentEmail('Linked Doc', markdown, deps)

  assert.equal(result.attachments.length, 1)
  assert.equal(result.attachments[0].filename, 'Linked Doc.md')
  assert.equal(result.attachments[0].content, markdown)
})
