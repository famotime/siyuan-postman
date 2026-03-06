import assert from 'node:assert/strict'
import test from 'node:test'

import { EMAIL_PRESETS, bindPlugin, loadEmailConfig } from './useEmailConfig.ts'

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
})
