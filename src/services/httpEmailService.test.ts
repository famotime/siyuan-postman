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
  ])
  assert.equal(typeof calls[0].data.payload, 'string')
  assert.equal(JSON.parse(calls[0].data.payload).subject, 'Hello')
})

test('sendEmailViaHttp reports proxy failure without falling back to direct fetch', async () => {
  ;(globalThis as any).window = {
    siyuan: { config: { system: { workspaceDir: '/workspace' } } },
  }
  ;(globalThis as any).__POSTMAN_FETCH_SYNC_POST__ = async () => {
    throw new TypeError('Failed to fetch')
  }

  const originalFetch = globalThis.fetch
  let directFetchCalled = false
  globalThis.fetch = ((url: string) => {
    if (url && url.endsWith('/api/network/forwardProxy')) {
      // 允许的原生中转降级调用本地思源代理，我们模拟本地中转也失败，抛出 Failed to fetch
      throw new TypeError('Failed to fetch')
    }
    // 如果绕过中转直接去 fetch 外部 API，则标记并抛出错误
    directFetchCalled = true
    throw new Error('direct fetch to external should not be used')
  }) as any

  try {
    await assert.rejects(
      sendEmailViaHttp({
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
      }),
      /HTTP_EMAIL_PROXY_UNAVAILABLE: Failed to fetch/,
    )
  }
  finally {
    globalThis.fetch = originalFetch
    delete (globalThis as any).__POSTMAN_FETCH_SYNC_POST__
  }

  assert.equal(directFetchCalled, false)
})

test('sendEmailViaHttp falls back to native fetch when fetchSyncPost is unavailable', async () => {
  const nativeFetchCalls: Array<{ url: string, options: any }> = []
  ;(globalThis as any).window = {
    siyuan: { config: { system: { workspaceDir: '/workspace' } } },
    location: { origin: 'http://127.0.0.1:6806' },
  }

  // 1. 让 postSiyuanApi 返回 null，触发降级
  ;(globalThis as any).__POSTMAN_FETCH_SYNC_POST__ = async () => {
    return null
  }

  // 2. 劫持原生 fetch 模拟思源服务端代理
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async (url: string, options: any) => {
    nativeFetchCalls.push({ url, options })
    return {
      ok: true,
      text: async () => '',
      json: async () => ({
        code: 0,
        msg: '',
        data: {
          status: 200,
          body: '{"id":"email_native_123"}',
          contentType: 'application/json',
          headers: {},
          url: 'https://api.resend.com/emails',
        },
      }),
    } as any
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
      subject: 'Hello Native Fetch',
      mode: 'body',
      docTitle: 'Doc',
      htmlContent: '<p>Hello Native Fetch</p>',
    })
  }
  finally {
    globalThis.fetch = originalFetch
    delete (globalThis as any).__POSTMAN_FETCH_SYNC_POST__
    delete (globalThis as any).window.location
  }

  assert.equal(nativeFetchCalls.length, 1)
  assert.equal(nativeFetchCalls[0].url, 'http://127.0.0.1:6806/api/network/forwardProxy')
  assert.equal(nativeFetchCalls[0].options.method, 'POST')
  assert.equal(nativeFetchCalls[0].options.headers['Content-Type'], 'application/json')

  const payload = JSON.parse(nativeFetchCalls[0].options.body)
  assert.equal(payload.url, 'https://api.resend.com/emails')
  assert.equal(payload.method, 'POST')
  assert.equal(payload.contentType, 'application/json')
  assert.deepEqual(payload.headers, [
    { Authorization: 'Bearer re_test' },
  ])
  assert.equal(typeof payload.payload, 'string')
  assert.equal(JSON.parse(payload.payload).subject, 'Hello Native Fetch')
})
