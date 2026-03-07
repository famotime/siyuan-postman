import assert from 'node:assert/strict'
import test from 'node:test'

import { EMAIL_PRESETS, bindPlugin, loadEmailConfig, normalizeEmailConfig } from './useEmailConfig.ts'

test('all email presets use SSL/TLS only', () => {
  assert.equal(EMAIL_PRESETS.every(preset => preset.secure), true)
})

test('loadEmailConfig normalizes legacy STARTTLS configs to SSL/TLS', async () => {
  const plugin = {
    loadData: async () => ({
      preset: 'outlook',
      host: 'smtp.office365.com',
      port: 587,
      secure: false,
      user: 'demo@example.com',
      password: 'secret',
      fromName: 'Demo',
    }),
    saveData: async () => {},
  }

  bindPlugin(plugin as any)

  const config = await loadEmailConfig()

  assert.equal(config.secure, true)
  assert.equal(config.preset, 'custom')
  assert.equal(config.lastTo, '')
})

test('normalizeEmailConfig keeps last recipient when provided', () => {
  const config = normalizeEmailConfig({
    host: 'smtp.example.com',
    user: 'demo@example.com',
    password: 'secret',
    lastTo: 'a@example.com, b@example.com',
  })

  assert.equal(config.lastTo, 'a@example.com, b@example.com')
  assert.equal(config.secure, true)
})
