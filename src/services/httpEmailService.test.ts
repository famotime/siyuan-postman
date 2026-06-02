import assert from 'node:assert/strict'
import test from 'node:test'

import JSZip from 'jszip'
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
  assert.equal(typeof calls[0].data.payload, 'string')
  const resendPayload = JSON.parse(calls[0].data.payload)
  assert.equal(resendPayload.subject, 'Hello')
  assert.equal(resendPayload.from, '"SiYuan Postman" <onboarding@resend.dev>')
  assert.deepEqual(resendPayload.to, ['to@example.com'])
  assert.equal('payloadEncoding' in calls[0].data, false)
  assert.equal('responseEncoding' in calls[0].data, false)
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
    { 'Content-Type': 'application/json' },
  ])
  assert.equal(typeof payload.payload, 'string')
  assert.equal(JSON.parse(payload.payload).subject, 'Hello Native Fetch')
  assert.equal('payloadEncoding' in payload, false)
  assert.equal('responseEncoding' in payload, false)
})

test('sendEmailViaHttp inlines mobile body images from SiYuan asset paths', async () => {
  const calls: Array<{ url: string, data: any }> = []
  const assetStatPaths: string[] = []
  const fileReadPaths: string[] = []

  ;(globalThis as any).window = {
    siyuan: { config: { system: { workspaceDir: '/workspace' } } },
  }
  ;(globalThis as any).__POSTMAN_FETCH_SYNC_POST__ = async (url: string, data: any) => {
    if (url === '/api/asset/statAsset') {
      assetStatPaths.push(data.path)
      return { code: 0, data: {} }
    }

    calls.push({ url, data })
    return {
      code: 0,
      msg: '',
      data: {
        status: 200,
        body: '{"id":"email_with_image"}',
        contentType: 'application/json',
        headers: {},
        url: data.url,
      },
    }
  }

  const originalFetch = globalThis.fetch
  globalThis.fetch = (async (url: string, options: any) => {
    assert.equal(url, '/api/file/getFile')
    fileReadPaths.push(JSON.parse(options.body).path)
    return {
      ok: true,
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
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
      subject: 'Hello Images',
      mode: 'body',
      docTitle: 'Doc',
      htmlContent: '<p><img src="/assets/foo.png"><img src="assets/bar.png"></p>',
    })
  }
  finally {
    globalThis.fetch = originalFetch
    delete (globalThis as any).__POSTMAN_FETCH_SYNC_POST__
  }

  // 修复后 statAsset 接收的是 assets/ 开头的路径
  assert.deepEqual(assetStatPaths, ['assets/foo.png', 'assets/bar.png'])
  assert.deepEqual(fileReadPaths, ['/data/assets/foo.png', '/data/assets/bar.png'])

  assert.equal(calls.length, 1)
  const resendPayload = JSON.parse(calls[0].data.payload)
  assert.match(resendPayload.html, /src="cid:img_0@siyuan\.postman"/)
  assert.match(resendPayload.html, /src="cid:img_1@siyuan\.postman"/)
  assert.equal(resendPayload.attachments.length, 2)
  assert.deepEqual(
    resendPayload.attachments.map((item: any) => item.filename),
    ['foo.png', 'bar.png'],
  )
  assert.deepEqual(
    resendPayload.attachments.map((item: any) => item.contentType),
    ['image/png', 'image/png'],
  )
  assert.deepEqual(
    resendPayload.attachments.map((item: any) => item.contentId),
    ['img_0@siyuan.postman', 'img_1@siyuan.postman'],
  )
})

test('sendEmailViaHttp zips mobile attachment images through native fetch when SiYuan SDK is unavailable', async () => {
  const nativeFetchCalls: Array<{ url: string, options: any }> = []
  const assetStatPaths: string[] = []
  const fileReadPaths: string[] = []

  ;(globalThis as any).window = {
    siyuan: { config: { system: { workspaceDir: '/workspace' } } },
    location: { origin: 'http://127.0.0.1:6806' },
  }

  const originalFetch = globalThis.fetch
  globalThis.fetch = (async (url: string, options: any) => {
    if (url.endsWith('/api/asset/statAsset')) {
      assetStatPaths.push(JSON.parse(options.body).path)
      return {
        ok: true,
        json: async () => ({ code: 0, data: {} }),
      } as any
    }

    if (url === '/api/file/getFile') {
      fileReadPaths.push(JSON.parse(options.body).path)
      return {
        ok: true,
        arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
      } as any
    }

    nativeFetchCalls.push({ url, options })
    return {
      ok: true,
      json: async () => ({
        code: 0,
        msg: '',
        data: {
          status: 200,
          body: '{"id":"email_with_zip"}',
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
      subject: 'Hello Zip Images',
      mode: 'attachment',
      docTitle: 'Doc',
      mdContent: '正文\n\n![](assets/640_8fe627098fd7-20260529215204-p154g0v.png)',
    })
  }
  finally {
    globalThis.fetch = originalFetch
    delete (globalThis as any).window.location
  }

  // 修复后 statAsset 接收的是 assets/ 开头的路径
  assert.deepEqual(assetStatPaths, ['assets/640_8fe627098fd7-20260529215204-p154g0v.png'])
  assert.deepEqual(fileReadPaths, ['/data/assets/640_8fe627098fd7-20260529215204-p154g0v.png'])

  assert.equal(nativeFetchCalls.length, 1)
  const proxyPayload = JSON.parse(nativeFetchCalls[0].options.body)
  const resendPayload = JSON.parse(proxyPayload.payload)
  assert.equal(resendPayload.attachments.length, 1)
  assert.equal(resendPayload.attachments[0].filename, 'Doc.zip')

  const zip = await JSZip.loadAsync(resendPayload.attachments[0].content, { base64: true })
  assert.ok(zip.file('Doc.md'))
  assert.ok(zip.file('assets/640_8fe627098fd7-20260529215204-p154g0v.png'))
})
