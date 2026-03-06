/**
 * siyuan-postman 插件主入口
 * 注册右键菜单（文档树 + 编辑器标题），弹出发送对话框与设置面板
 */
import {
  Dialog,
  Plugin,
  getFrontend,
  showMessage,
} from 'siyuan'
import '@/index.scss'
import PluginInfoString from '@/../plugin.json'
import { destroy, init } from '@/main'
import { bindPlugin, loadEmailConfig } from '@/composables/useEmailConfig'
import { getDocTitle } from '@/services/siyuanApi'
import { createApp, defineComponent, h } from 'vue'
import SendMailDialog from '@/components/SendMailDialog.vue'
import SettingPanel from '@/components/SettingPanel.vue'

/** 插件版本 */
const { version } = PluginInfoString

/** 前端平台类型 */
type SyFrontendTypes = 'desktop' | 'desktop-window' | 'mobile' | 'browser-desktop' | 'browser-mobile'

export default class PostmanPlugin extends Plugin {
  public isMobile: boolean
  public isBrowser: boolean
  public platform: SyFrontendTypes
  public readonly version = version

  /** i18n 字符串（由思源注入） */
  private get t(): Record<string, string> {
    return this.i18n as Record<string, string>
  }

  async onload() {
    const frontEnd = getFrontend()
    this.platform = frontEnd as SyFrontendTypes
    this.isMobile = frontEnd === 'mobile' || frontEnd === 'browser-mobile'
    this.isBrowser = frontEnd.includes('browser')

    // 绑定插件实例到配置管理器（用于 loadData/saveData）
    bindPlugin(this)
    await loadEmailConfig()

    // 挂载 Vue 根应用
    init(this)

    // 注册顶栏按钮（点击打开设置）
    this.addTopBar({
      icon: 'iconEmail',
      title: this.t.topBarTitle || '邮递员',
      callback: () => this.openSetting(),
    })

    // 监听文档树右键菜单事件
    this.eventBus.on('open-menu-doctree', this.onDocTreeMenu.bind(this))

    // 监听编辑器标题图标右键菜单事件
    this.eventBus.on('click-editortitleicon', this.onEditorTitleMenu.bind(this))

    console.log(`[siyuan-postman] v${this.version} loaded`)
  }

  onunload() {
    this.eventBus.off('open-menu-doctree', this.onDocTreeMenu.bind(this))
    this.eventBus.off('click-editortitleicon', this.onEditorTitleMenu.bind(this))
    destroy()
  }

  /**
   * 打开插件设置面板
   */
  openSetting() {
    const dialog = new Dialog({
      title: this.t.settingTitle || '邮递员设置',
      content: '<div id="postman-setting-mount"></div>',
      width: '480px',
    })

    const mountEl = dialog.element.querySelector('#postman-setting-mount')
    if (!mountEl) return

    const settingApp = createApp(
      defineComponent({
        render: () => h(SettingPanel, { i18n: this.t }),
      }),
    )
    settingApp.mount(mountEl)

    // Dialog 关闭时卸载 Vue 实例，避免内存泄漏
    const observer = new MutationObserver(() => {
      if (!document.body.contains(dialog.element)) {
        settingApp.unmount()
        observer.disconnect()
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })
  }

  /**
   * 文档树右键菜单处理
   */
  private onDocTreeMenu(event: CustomEvent<any>) {
    const { menu, elements } = event.detail
    // 获取被右键点击的文档元素的 data-node-id
    const li = elements?.[0] as HTMLElement | undefined
    const docId = li?.getAttribute('data-node-id') || li?.dataset?.nodeId

    if (!docId) return

    // 只对文档类型添加菜单（排除笔记本节点）
    const nodeType = li?.getAttribute('data-type') || li?.dataset?.type
    if (nodeType === 'notebook') return

    menu.addSeparator()
    menu.addItem({
      icon: 'iconEmail',
      label: this.t.sendAsBody || '作为正文发 Email',
      click: () => this.showSendDialog(docId, 'body'),
    })
    menu.addItem({
      icon: 'iconAttachment',
      label: this.t.sendAsAttachment || '作为附件发 Email',
      click: () => this.showSendDialog(docId, 'attachment'),
    })
  }

  /**
   * 编辑器标题图标右键菜单处理
   */
  private onEditorTitleMenu(event: CustomEvent<any>) {
    const { menu, data } = event.detail
    // data.id 是当前文档 ID
    const docId = data?.id || data?.rootID

    if (!docId) return

    menu.addSeparator()
    menu.addItem({
      icon: 'iconEmail',
      label: this.t.sendAsBody || '作为正文发 Email',
      click: () => this.showSendDialog(docId, 'body'),
    })
    menu.addItem({
      icon: 'iconAttachment',
      label: this.t.sendAsAttachment || '作为附件发 Email',
      click: () => this.showSendDialog(docId, 'attachment'),
    })
  }

  /**
   * 显示发送邮件对话框
   * @param docId 文档块 ID
   * @param mode 发送模式（正文/附件）
   */
  private async showSendDialog(docId: string, mode: 'body' | 'attachment') {
    const docTitle = await getDocTitle(docId)

    const dialog = new Dialog({
      title: this.t.dialogTitle || '发送邮件',
      content: '<div id="postman-send-mount"></div>',
      width: '440px',
    })

    const mountEl = dialog.element.querySelector('#postman-send-mount')
    if (!mountEl) return

    const sendApp = createApp(
      defineComponent({
        render: () => h(SendMailDialog, {
          docId,
          docTitle,
          mode,
          i18n: this.t,
          onCancel: () => dialog.destroy(),
          onSuccess: () => {
            showMessage(this.t.dialogSuccess || '邮件发送成功！', 3000, 'info')
            dialog.destroy()
          },
        }),
      }),
    )
    sendApp.mount(mountEl)

    // Dialog 关闭时卸载 Vue 实例
    const observer = new MutationObserver(() => {
      if (!document.body.contains(dialog.element)) {
        sendApp.unmount()
        observer.disconnect()
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })
  }
}
