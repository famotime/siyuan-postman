import assert from 'node:assert/strict'
import test from 'node:test'

import JSZip from 'jszip'
import {
  composeAttachmentEmailWithAdapter,
  composeBodyEmailWithAdapter,
  type EmailComposerAssetAdapter,
} from './emailComposerShared.ts'

function createAdapter(existingPaths: Set<string>): EmailComposerAssetAdapter<any, Buffer | string, string> {
  return {
    getWorkspacePath: assetPath => `/workspace/data/${assetPath}`,
    basename: assetPath => assetPath.split('/').pop() || assetPath,
    assetExists: async absPath => existingPaths.has(absPath),
    readAsset: async () => ({
      base64: Buffer.from([1, 2, 3]).toString('base64'),
      buffer: Buffer.from([1, 2, 3]),
    }),
    createInlineAttachment: async ({ assetPath, absPath, cid, asset }) => ({
      filename: assetPath.split('/').pop(),
      path: absPath,
      cid,
      content: asset.base64,
      contentId: cid,
    }),
    createArchiveContent: zip => zip.generateAsync({ type: 'nodebuffer' }),
    createTextContent: text => text,
  }
}

test('composeBodyEmailWithAdapter normalizes SiYuan image paths and creates cid attachments', async () => {
  const adapter = createAdapter(new Set([
    '/workspace/data/assets/foo.png',
    '/workspace/data/assets/bar.png',
  ]))

  const result = await composeBodyEmailWithAdapter(
    '<p><img src="/assets/foo.png"><img src="assets/bar.png"></p>',
    adapter,
  )

  assert.match(result.html, /src="cid:img_0@siyuan\.postman"/)
  assert.match(result.html, /src="cid:img_1@siyuan\.postman"/)
  assert.deepEqual(
    result.attachments.map(item => item.filename),
    ['foo.png', 'bar.png'],
  )
})

test('composeAttachmentEmailWithAdapter packages markdown and normalized assets into zip', async () => {
  const adapter = createAdapter(new Set([
    '/workspace/data/assets/foo.png',
    '/workspace/data/assets/bar.png',
  ]))

  const result = await composeAttachmentEmailWithAdapter(
    'Doc/Title',
    '正文\n\n![](/assets/foo.png)\n\n<img src="assets/bar.png">',
    adapter,
  )

  assert.equal(result.text, '请查阅附件：Doc_Title.zip')
  assert.equal(result.attachments[0].filename, 'Doc_Title.zip')

  const zip = await JSZip.loadAsync(result.attachments[0].content as Buffer)
  assert.ok(zip.file('Doc_Title.md'))
  assert.ok(zip.file('assets/foo.png'))
  assert.ok(zip.file('assets/bar.png'))
})
