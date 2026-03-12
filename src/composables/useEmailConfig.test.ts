import assert from 'node:assert/strict'
import test from 'node:test'

import {
  EMAIL_PRESETS,
  bindPlugin,
  loadEmailConfig,
  normalizeEmailConfig,
  removeEmailConfig,
  setActiveEmailConfig,
  useEmailConfig,
} from './useEmailConfig.ts'

test('all email presets use SSL/TLS only', () => {
  assert.equal(EMAIL_PRESETS.every(preset => preset.secure), true)
})

test('loadEmailConfig migrates legacy SMTP config into account list', async () => {
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

  const state = await loadEmailConfig()

  assert.equal(state.accounts.length, 1)
  const account = state.accounts[0]
  assert.equal(state.activeId, account.id)
  assert.equal(account.secure, true)
  assert.equal(account.preset, 'custom')
  assert.equal(account.lastTo, '')
  assert.equal(account.hasSentSuccessfully, false)
})

test('normalizeEmailConfig keeps last recipient when provided', () => {
  const config = normalizeEmailConfig({
    host: 'smtp.example.com',
    user: 'demo@example.com',
    password: 'secret',
    lastTo: 'a@example.com, b@example.com',
    hasSentSuccessfully: true,
  })

  assert.equal(config.lastTo, 'a@example.com, b@example.com')
  assert.equal(config.hasSentSuccessfully, true)
  assert.equal(config.secure, true)
})

test('setActiveEmailConfig switches active account and persists', async () => {
  const saved: any[] = []
  const plugin = {
    loadData: async () => ({
      activeId: 'acct_a',
      accounts: [
        {
          id: 'acct_a',
          preset: 'custom',
          host: 'smtp.alpha.com',
          port: 465,
          secure: true,
          user: 'alpha@example.com',
          password: 'secret',
          fromName: 'Alpha',
          lastTo: '',
          hasSentSuccessfully: false,
        },
        {
          id: 'acct_b',
          preset: 'custom',
          host: 'smtp.beta.com',
          port: 465,
          secure: true,
          user: 'beta@example.com',
          password: 'secret',
          fromName: 'Beta',
          lastTo: '',
          hasSentSuccessfully: false,
        },
      ],
    }),
    saveData: async (_key: string, data: any) => saved.push(data),
  }

  bindPlugin(plugin as any)
  await loadEmailConfig()
  await setActiveEmailConfig('acct_b')

  const state = useEmailConfig().value
  assert.equal(state.activeId, 'acct_b')
  assert.equal(saved.length > 0, true)
  assert.equal(saved[saved.length - 1].activeId, 'acct_b')
})

test('removeEmailConfig drops account and reselects another active id', async () => {
  const saved: any[] = []
  const plugin = {
    loadData: async () => ({
      activeId: 'acct_a',
      accounts: [
        {
          id: 'acct_a',
          preset: 'custom',
          host: 'smtp.alpha.com',
          port: 465,
          secure: true,
          user: 'alpha@example.com',
          password: 'secret',
          fromName: 'Alpha',
          lastTo: '',
          hasSentSuccessfully: false,
        },
        {
          id: 'acct_b',
          preset: 'custom',
          host: 'smtp.beta.com',
          port: 465,
          secure: true,
          user: 'beta@example.com',
          password: 'secret',
          fromName: 'Beta',
          lastTo: '',
          hasSentSuccessfully: false,
        },
      ],
    }),
    saveData: async (_key: string, data: any) => saved.push(data),
  }

  bindPlugin(plugin as any)
  await loadEmailConfig()
  await removeEmailConfig('acct_a')

  const state = useEmailConfig().value
  assert.equal(state.accounts.length, 1)
  assert.equal(state.accounts[0].id, 'acct_b')
  assert.equal(state.activeId, 'acct_b')
  assert.equal(saved.length > 0, true)
  assert.equal(saved[saved.length - 1].activeId, 'acct_b')
})
