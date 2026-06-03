/**
 * 调用思源笔记 Kernel API
 * 优先使用测试钩子，其次尝试动态加载 siyuan SDK，最后降级为原生 fetch。
 */
export async function postSiyuanApi(url: string, data: unknown): Promise<any> {
  const testFetchSyncPost = (globalThis as any).__POSTMAN_FETCH_SYNC_POST__
  if (typeof testFetchSyncPost === 'function') {
    return testFetchSyncPost(url, data)
  }

  try {
    const siyuan = await import('siyuan')
    if (typeof siyuan.fetchSyncPost === 'function') {
      return siyuan.fetchSyncPost(url, data)
    }
  }
  catch {
    // siyuan SDK 不可用，降级为原生 fetch
  }

  let baseUrl = ''
  if (typeof window !== 'undefined' && window.location?.origin && window.location.origin !== 'file://') {
    baseUrl = window.location.origin
  }

  const response = await fetch(`${baseUrl}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error(`SiYuan API request failed: ${response.status} ${response.statusText}`)
  }

  return response.json()
}
