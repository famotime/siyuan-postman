import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('attachment menu uses a valid built-in icon', () => {
  const source = readFileSync(new URL('./index.ts', import.meta.url), 'utf8')

  const iconDownloadMatches = source.match(/icon:\s*'iconDownload'/g) || []
  assert.equal(iconDownloadMatches.length >= 2, true)
  assert.doesNotMatch(source, /icon:\s*'iconAttachment'/)
})
