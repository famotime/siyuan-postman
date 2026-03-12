import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('attachment menu uses a valid built-in icon', () => {
  const source = readFileSync(new URL('./index.ts', import.meta.url), 'utf8')

  const iconDownloadMatches = source.match(/icon:\s*'iconDownload'/g) || []
  assert.equal(iconDownloadMatches.length >= 1, true)
  assert.doesNotMatch(source, /icon:\s*'iconAttachment'/)
})

test('top bar click branches by successful send state', () => {
  const source = readFileSync(new URL('./index.ts', import.meta.url), 'utf8')

  assert.match(source, /callback:\s*\(event:\s*MouseEvent\)\s*=>\s*this\.onTopBarClick\(event\)/)
  assert.match(source, /if\s*\(!configState\.value\.accounts\.length\)\s*\{\s*this\.openSetting\(\)/)
  assert.match(source, /const\s+menu\s*=\s*new\s+Menu\('siyuan-postman-topbar-send'\)/)
  assert.match(source, /this\.addSendModeMenuItems\(menu,\s*docId\)/)
  assert.match(source, /const\s+activeEditor\s*=\s*getActiveEditor\(\)/)
})

test('event handlers are bound once and removed with the same reference', () => {
  const source = readFileSync(new URL('./index.ts', import.meta.url), 'utf8')

  assert.match(source, /docTreeMenuHandler\s*=\s*this\.onDocTreeMenu\.bind\(this\)/)
  assert.match(source, /editorTitleMenuHandler\s*=\s*this\.onEditorTitleMenu\.bind\(this\)/)
  assert.match(source, /eventBus\.on\('open-menu-doctree',\s*this\.docTreeMenuHandler\)/)
  assert.match(source, /eventBus\.on\('click-editortitleicon',\s*this\.editorTitleMenuHandler\)/)
  assert.match(source, /eventBus\.off\('open-menu-doctree',\s*this\.docTreeMenuHandler\)/)
  assert.match(source, /eventBus\.off\('click-editortitleicon',\s*this\.editorTitleMenuHandler\)/)
})
