/**
 * 平台无关的资源文件读取
 * 桌面端：fs.readFileSync
 * 移动端：思源内核 /api/file/getFile
 */
export interface AssetReaderResult {
  base64: string
  buffer: ArrayBuffer | Buffer
}


async function postSiyuanApi(url: string, data: unknown): Promise<any> {
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
  catch (error) {
    console.warn('[Postman] assetReader 导入 siyuan SDK 失败，将使用原生 fetch 调用思源 API。', error)
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

function isElectronEnv(): boolean {
  try {
    return (
      typeof process !== 'undefined'
      && typeof process.versions === 'object'
      && !!process.versions.electron
    )
  }
  catch {
    return false
  }
}

/**
 * 桌面端：通过 Node fs 读取本地文件
 */
function readAssetViaFs(absPath: string): AssetReaderResult {
  const fs = (window as any).require('fs')
  const buffer: Buffer = fs.readFileSync(absPath)
  return {
    base64: buffer.toString('base64'),
    buffer,
  }
}

/**
 * 移动端：通过思源内核 API 读取文件
 * /api/file/getFile 返回原始字节流
 */
async function readAssetViaApi(workspaceRelativePath: string): Promise<AssetReaderResult> {
  const res = await fetch('/api/file/getFile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: workspaceRelativePath }),
  })

  if (!res.ok) {
    throw new Error(`Failed to read asset: ${res.status}`)
  }

  const buffer = await res.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  const base64 = btoa(binary)

  return { base64, buffer }
}

/**
 * 读取资源文件，自动选择平台适配的读取方式
 * @param absPath 绝对路径（桌面端使用）
 * @param wsRelativePath 思源工作空间相对路径，如 /data/assets/xxx.png（移动端使用）
 */
export async function readAsset(absPath: string, wsRelativePath?: string): Promise<AssetReaderResult> {
  if (isElectronEnv()) {
    return readAssetViaFs(absPath)
  }
  if (wsRelativePath) {
    return readAssetViaApi(wsRelativePath)
  }
  throw new Error('Cannot read asset: no relative path provided for non-Electron environment')
}

/**
 * 检查文件是否存在
 * 桌面端：fs.existsSync
 * 移动端：尝试 statAsset API
 */
export async function assetExists(absPath: string, wsRelativePath?: string): Promise<boolean> {
  if (isElectronEnv()) {
    const fs = (window as any).require('fs')
    return fs.existsSync(absPath)
  }
  if (wsRelativePath) {
    try {
      const res = await postSiyuanApi('/api/asset/statAsset', { path: wsRelativePath })
      return res.code === 0
    }
    catch {
      return false
    }
  }
  return false
}
