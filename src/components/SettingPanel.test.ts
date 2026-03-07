import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('smtp host, port and security stay grouped in the same inline row', () => {
  const source = readFileSync(new URL('./SettingPanel.vue', import.meta.url), 'utf8')

  const inlineIndex = source.indexOf('postman-setting__inline')
  const hostIndex = source.indexOf('v-model="form.host"')
  const portIndex = source.indexOf('v-model.number="form.port"')
  const sslIndex = source.indexOf('postman-ssl-tag')

  assert.notEqual(inlineIndex, -1)
  assert.notEqual(hostIndex, -1)
  assert.notEqual(portIndex, -1)
  assert.notEqual(sslIndex, -1)

  assert.equal(inlineIndex < hostIndex, true)
  assert.equal(hostIndex < portIndex, true)
  assert.equal(portIndex < sslIndex, true)
})

test('both views use shared form and action primitives', () => {
  const settingSource = readFileSync(new URL('./SettingPanel.vue', import.meta.url), 'utf8')
  const sendSource = readFileSync(new URL('./SendMailDialog.vue', import.meta.url), 'utf8')

  for (const source of [settingSource, sendSource]) {
    assert.notEqual(source.indexOf('postman-field'), -1)
    assert.notEqual(source.indexOf('postman-control'), -1)
    assert.notEqual(source.indexOf('postman-actions'), -1)
    assert.notEqual(source.indexOf('postman-btn'), -1)
  }
})

test('shared styles define design tokens and form primitives', () => {
  const source = readFileSync(new URL('../index.scss', import.meta.url), 'utf8')

  for (const token of [
    '--pm-accent',
    '--pm-surface-elevated',
    '--pm-field-bg',
    '--pm-text-secondary',
    '--pm-border',
  ]) {
    assert.notEqual(source.indexOf(token), -1)
  }

  assert.notEqual(source.indexOf('.postman-field'), -1)
  assert.notEqual(source.indexOf('.postman-control'), -1)
  assert.notEqual(source.indexOf('.postman-actions'), -1)
  assert.notEqual(source.indexOf('&::placeholder'), -1)
})

test('password field provides eye toggle for visibility', () => {
  const source = readFileSync(new URL('./SettingPanel.vue', import.meta.url), 'utf8')

  assert.notEqual(source.indexOf('const showPassword = ref(false)'), -1)
  assert.notEqual(source.indexOf(":type=\"showPassword ? 'text' : 'password'\""), -1)
  assert.notEqual(source.indexOf('class="postman-password-toggle"'), -1)
  assert.notEqual(source.indexOf("@click=\"showPassword = !showPassword\""), -1)
  assert.notEqual(source.indexOf('settingShowPassword'), -1)
  assert.notEqual(source.indexOf('settingHidePassword'), -1)
})

test('preset selector renders icon cards instead of plain text options', () => {
  const source = readFileSync(new URL('./SettingPanel.vue', import.meta.url), 'utf8')

  for (const token of [
    'postman-preset-grid',
    'postman-preset-card',
    'postman-preset-card__icon',
    '@click="selectPreset(preset.key)"',
    ':aria-pressed="form.preset === preset.key"',
    'preset.iconSrc',
  ]) {
    assert.notEqual(source.indexOf(token), -1)
  }
})
