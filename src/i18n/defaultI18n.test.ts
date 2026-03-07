import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

function readJson(url: URL) {
  return JSON.parse(readFileSync(url, 'utf8').replace(/^\uFEFF/, ''))
}

test('plugin metadata defaults to Chinese', () => {
  const plugin = readJson(new URL('../../plugin.json', import.meta.url))

  assert.equal(plugin.displayName.default, plugin.displayName.zh_CN)
  assert.equal(plugin.description.default, plugin.description.zh_CN)
  assert.equal(plugin.readme.default, plugin.readme.zh_CN)
})

test('default i18n resource uses Chinese strings', () => {
  const defaultI18n = readJson(new URL('./default.json', import.meta.url))
  const zhCnI18n = readJson(new URL('./zh_CN.json', import.meta.url))

  assert.equal(defaultI18n.settingTitle, zhCnI18n.settingTitle)
  assert.equal(defaultI18n.dialogTitle, zhCnI18n.dialogTitle)
  assert.equal(defaultI18n.noConfigError, zhCnI18n.noConfigError)
})
