/**
 * 插件 Vue 应用初始化入口
 */
import type { Plugin } from 'siyuan'
import App from './App.vue'
import { createApp } from 'vue'

let plugin: Plugin | null = null

/**
 * 获取或设置当前插件实例（单例）
 */
export function usePlugin(pluginInstance?: Plugin): Plugin {
  if (pluginInstance) {
    plugin = pluginInstance
  }
  if (!plugin) {
    console.error('[siyuan-postman] Plugin 实例未绑定，请先调用 init()')
  }
  return plugin!
}

let app: ReturnType<typeof createApp> | null = null
let mountDiv: HTMLDivElement | null = null

/**
 * 初始化 Vue 应用并挂载到 body
 * @param pluginInstance 思源插件实例
 */
export function init(pluginInstance: Plugin) {
  usePlugin(pluginInstance)

  mountDiv = document.createElement('div')
  mountDiv.id = 'siyuan-postman-mount'

  app = createApp(App)
  app.mount(mountDiv)
  document.body.appendChild(mountDiv)
}

/**
 * 卸载 Vue 应用（插件 unload 时调用）
 */
export function destroy() {
  if (app) {
    app.unmount()
    app = null
  }
  if (mountDiv && document.body.contains(mountDiv)) {
    document.body.removeChild(mountDiv)
    mountDiv = null
  }
}
