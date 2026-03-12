import {
  Dialog,
  Menu,
  Plugin,
  getActiveEditor,
  getFrontend,
  showMessage,
} from 'siyuan'
import '@/index.scss'
import PluginInfoString from '@/../plugin.json'
import { destroy, init } from '@/main'
import { EMAIL_CONFIG_STORAGE_KEY, bindPlugin, loadEmailConfig, useEmailConfig } from '@/composables/useEmailConfig'
import { getDocTitle } from '@/services/siyuanApi'
import SendMailDialog from '@/components/SendMailDialog.vue'
import SettingPanel from '@/components/SettingPanel.vue'
import { mountDialogComponent } from '@/utils/dialogMount'

const { version } = PluginInfoString

type SyFrontendTypes = 'desktop' | 'desktop-window' | 'mobile' | 'browser-desktop' | 'browser-mobile'
type ProtyleLike = {
  block?: {
    rootID?: string
    rootId?: string
    root_id?: string
    id?: string
  }
}

export default class PostmanPlugin extends Plugin {
  public isMobile: boolean
  public isBrowser: boolean
  public platform: SyFrontendTypes
  public readonly version = version
  private docTreeMenuHandler?: (event: CustomEvent<any>) => void
  private editorTitleMenuHandler?: (event: CustomEvent<any>) => void

  private get t(): Record<string, string> {
    return this.i18n as Record<string, string>
  }

  async onload() {
    const frontEnd = getFrontend()
    this.platform = frontEnd as SyFrontendTypes
    this.isMobile = frontEnd === 'mobile' || frontEnd === 'browser-mobile'
    this.isBrowser = frontEnd.includes('browser')

    bindPlugin(this)
    await loadEmailConfig()
    init(this)

    this.addTopBar({
      icon: 'iconEmail',
      title: this.t.topBarTitle || '邮递员',
      callback: (event: MouseEvent) => this.onTopBarClick(event),
    })

    this.docTreeMenuHandler = this.onDocTreeMenu.bind(this)
    this.editorTitleMenuHandler = this.onEditorTitleMenu.bind(this)
    this.eventBus.on('open-menu-doctree', this.docTreeMenuHandler)
    this.eventBus.on('click-editortitleicon', this.editorTitleMenuHandler)
  }

  onunload() {
    if (this.docTreeMenuHandler) {
      this.eventBus.off('open-menu-doctree', this.docTreeMenuHandler)
    }
    if (this.editorTitleMenuHandler) {
      this.eventBus.off('click-editortitleicon', this.editorTitleMenuHandler)
    }
    destroy()
  }

  uninstall() {
    this.removeData(EMAIL_CONFIG_STORAGE_KEY).catch((error) => {
      const reason = error instanceof Error ? error.message : String((error as { msg?: string } | null)?.msg ?? error)
      showMessage(`uninstall [${this.name}] remove data [${EMAIL_CONFIG_STORAGE_KEY}] fail: ${reason}`, 3000, 'error')
    })
  }

  openSetting() {
    const dialog = new Dialog({
      title: this.t.settingTitle || '邮递员设置',
      content: '<div id="postman-setting-mount"></div>',
      width: '580px',
    })

    mountDialogComponent({
      dialog,
      mountId: 'postman-setting-mount',
      component: SettingPanel,
      props: { i18n: this.t },
    })
  }

  private getCurrentDocId(): string {
    const activeEditor = getActiveEditor()
    const protyle = activeEditor?.protyle as ProtyleLike | undefined
    return (
      protyle?.block?.rootID
      || protyle?.block?.rootId
      || protyle?.block?.root_id
      || protyle?.block?.id
      || ''
    )
  }

  private addSendModeMenuItems(menu: { addItem: (options: any) => void }, docId: string) {
    menu.addItem({
      icon: 'iconEmail',
      label: this.t.sendAsBody || '作为正文发送 Email',
      click: () => this.showSendDialog(docId, 'body'),
    })
    menu.addItem({
      icon: 'iconDownload',
      label: this.t.sendAsAttachment || '作为附件发送 Email',
      click: () => this.showSendDialog(docId, 'attachment'),
    })
  }

  private onTopBarClick(event: MouseEvent) {
    const configState = useEmailConfig()
    if (!configState.value.accounts.length) {
      this.openSetting()
      return
    }

    const docId = this.getCurrentDocId()
    if (!docId) {
      showMessage(this.t.topBarNeedDoc || '请先打开一个文档后再发送邮件', 3000, 'warn')
      return
    }

    const menu = new Menu('siyuan-postman-topbar-send')
    this.addSendModeMenuItems(menu, docId)
    menu.open({
      x: event.clientX,
      y: event.clientY,
    })
  }

  private onDocTreeMenu(event: CustomEvent<any>) {
    const { menu, elements } = event.detail
    const li = elements?.[0] as HTMLElement | undefined
    const docId = li?.getAttribute('data-node-id') || li?.dataset?.nodeId

    if (!docId) {
      return
    }

    const nodeType = li?.getAttribute('data-type') || li?.dataset?.type
    if (nodeType === 'notebook') {
      return
    }

    menu.addSeparator()
    this.addSendModeMenuItems(menu, docId)
  }

  private onEditorTitleMenu(event: CustomEvent<any>) {
    const { menu, data } = event.detail
    const docId = data?.id || data?.rootID

    if (!docId) {
      return
    }

    menu.addSeparator()
    this.addSendModeMenuItems(menu, docId)
  }

  private async showSendDialog(docId: string, mode: 'body' | 'attachment') {
    const docTitle = await getDocTitle(docId)

    const dialog = new Dialog({
      title: this.t.dialogTitle || '发送邮件',
      content: '<div id="postman-send-mount"></div>',
      width: '520px',
    })

    mountDialogComponent({
      dialog,
      mountId: 'postman-send-mount',
      component: SendMailDialog,
      props: {
        docId,
        docTitle,
        mode,
        i18n: this.t,
        onCancel: () => dialog.destroy(),
        onSuccess: () => {
          showMessage(this.t.dialogSuccess || '邮件发送成功！', 3000, 'info')
          dialog.destroy()
        },
      },
    })
  }
}
