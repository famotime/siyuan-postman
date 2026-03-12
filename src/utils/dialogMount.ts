import type { Dialog } from 'siyuan'
import { createApp, defineComponent, h, type Component } from 'vue'

interface DialogMountOptions {
  dialog: Dialog
  mountId: string
  component: Component
  props?: Record<string, any>
}

export function mountDialogComponent(options: DialogMountOptions) {
  const { dialog, mountId, component, props } = options
  const mountEl = dialog.element.querySelector(`#${mountId}`)
  if (!mountEl) {
    return
  }

  const app = createApp(
    defineComponent({
      render: () => h(component, props ?? {}),
    }),
  )

  app.mount(mountEl)

  const observer = new MutationObserver(() => {
    if (!document.body.contains(dialog.element)) {
      app.unmount()
      observer.disconnect()
    }
  })

  observer.observe(document.body, { childList: true, subtree: true })
}
