import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('smtp host, port and security stay grouped in the same inline row', () => {
  const source = readFileSync(new URL('./SettingPanel.vue', import.meta.url), 'utf8')

  const inlineIndex = source.indexOf('postman-setting__inline')
  const hostIndex = source.indexOf('v-model="form.host"')
  const portIndex = source.indexOf('v-model.number="form.port"')
  const securityIndex = source.indexOf('postman-security-card')

  assert.notEqual(inlineIndex, -1)
  assert.notEqual(hostIndex, -1)
  assert.notEqual(portIndex, -1)
  assert.notEqual(securityIndex, -1)

  assert.equal(inlineIndex < hostIndex, true)
  assert.equal(hostIndex < portIndex, true)
  assert.equal(portIndex < securityIndex, true)
})

test('setting and send views use the same practical modern header and summary layout', () => {
  const settingSource = readFileSync(new URL('./SettingPanel.vue', import.meta.url), 'utf8')
  const sendSource = readFileSync(new URL('./SendMailDialog.vue', import.meta.url), 'utf8')

  for (const source of [settingSource, sendSource]) {
    assert.notEqual(source.indexOf('postman-panel'), -1)
    assert.notEqual(source.indexOf('postman-panel-header'), -1)
    assert.notEqual(source.indexOf('postman-summary-grid'), -1)
    assert.notEqual(source.indexOf('postman-summary-card'), -1)
    assert.equal(source.indexOf('postman-shell__stamp'), -1)
  }
})

test('shared styles define neutral surfaces and modern panel primitives', () => {
  const source = readFileSync(new URL('../index.scss', import.meta.url), 'utf8')

  for (const token of [
    '--pm-surface',
    '--pm-surface-elevated',
    '--pm-field-bg',
    '--pm-text-secondary',
    '--pm-shadow-soft',
  ]) {
    assert.notEqual(source.indexOf(token), -1)
  }

  assert.notEqual(source.indexOf('.postman-panel-header'), -1)
  assert.notEqual(source.indexOf('.postman-summary-grid'), -1)
  assert.notEqual(source.indexOf('.postman-summary-card'), -1)
  assert.equal(source.indexOf('.postman-shell__stamp'), -1)
  assert.notEqual(source.indexOf('&::placeholder'), -1)
})
