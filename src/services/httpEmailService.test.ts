import assert from 'node:assert/strict'
import test from 'node:test'

import { sendEmailViaHttp } from './httpEmailService.ts'

test('sendEmailViaHttp posts Resend request through SiYuan forwardProxy when available', async () => {
  const calls: Array<{ url: string, data: any }> = []
  ;(globalThis as any).window = {
    siyuan: { config: { system: { workspaceDir: '/workspace' } } },
  }
  ;(globalThis as any).__POSTMAN_FETCH_SYNC_POST__ = async (url: string, data: any) => {
    calls.push({ url, data })
    return {
      code: 0,
      msg: '',
      data: {
        status: 200,
        body: '{"id":"email_123"}',
        contentType: 'application/json',
        headers: {},
        url: data.url,
      },
    }
  }

  const originalFetch = globalThis.fetch
  globalThis.fetch = (() => {
    throw new Error('direct fetch should not be used')
  }) as any

  try {
    await sendEmailViaHttp({
      config: {
        id: 'acct_1',
        preset: 'custom',
        host: '',
        port: 465,
        secure: true,
        user: 'sender@example.com',
        password: '',
        fromName: 'Sender',
        lastTo: '',
        hasSentSuccessfully: false,
      },
      httpConfig: {
        httpProvider: 'resend',
        httpApiKey: 're_test',
      },
      to: ['to@example.com'],
      subject: 'Hello',
      mode: 'body',
      docTitle: 'Doc',
      htmlContent: '<p>Hello</p>',
    })
  }
  finally {
    globalThis.fetch = originalFetch
    delete (globalThis as any).__POSTMAN_FETCH_SYNC_POST__
  }

  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, '/api/network/forwardProxy')
  assert.equal(calls[0].data.url, 'https://api.resend.com/emails')
  assert.equal(calls[0].data.method, 'POST')
  assert.equal(calls[0].data.contentType, 'application/json')
  assert.deepEqual(calls[0].data.headers, [
    { Authorization: 'Bearer re_test' },
    { 'Content-Type': 'application/json' },
  ])
  assert.equal(JSON.parse(calls[0].data.payload).subject, 'Hello')
})
