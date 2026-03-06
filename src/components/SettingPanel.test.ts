import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('smtp host, port and security are grouped in the same inline row', () => {
  const source = readFileSync(new URL('./SettingPanel.vue', import.meta.url), 'utf8')

  const inlineIndex = source.indexOf('postman-setting__inline')
  const hostIndex = source.indexOf('SMTP 服务器')
  const portIndex = source.indexOf('端口')
  const securityIndex = source.indexOf('加密方式')

  assert.notEqual(inlineIndex, -1)
  assert.notEqual(hostIndex, -1)
  assert.notEqual(portIndex, -1)
  assert.notEqual(securityIndex, -1)

  assert.equal(inlineIndex < hostIndex, true)
  assert.equal(hostIndex < portIndex, true)
  assert.equal(portIndex < securityIndex, true)
})
