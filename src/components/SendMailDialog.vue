<template>
  <!-- 发送邮件弹窗，使用思源原生 Dialog -->
  <div class="postman-dialog">
    <div class="postman-dialog__form">
      <!-- 收件人 -->
      <div class="postman-form-item">
        <label class="postman-form-label">{{ i18n.dialogTo }}</label>
        <input
          v-model="toInput"
          class="b3-text-field postman-form-input"
          type="email"
          multiple
          :placeholder="i18n.dialogToPlaceholder"
        >
      </div>

      <!-- 主题 -->
      <div class="postman-form-item">
        <label class="postman-form-label">{{ i18n.dialogSubject }}</label>
        <input
          v-model="subject"
          class="b3-text-field postman-form-input"
          type="text"
        >
      </div>

      <!-- 发送模式 -->
      <div class="postman-form-item postman-mode-selector">
        <label class="postman-form-label">发送方式</label>
        <div class="postman-mode-options">
          <label class="postman-radio-label">
            <input v-model="localMode" type="radio" value="body" class="postman-radio">
            📄 作为正文
          </label>
          <label class="postman-radio-label">
            <input v-model="localMode" type="radio" value="attachment" class="postman-radio">
            📎 作为附件（.md / .zip）
          </label>
        </div>
      </div>

      <!-- 状态消息 -->
      <div v-if="statusMsg" :class="['postman-status', statusType === 'error' ? 'postman-status--error' : 'postman-status--success']">
        {{ statusMsg }}
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="postman-dialog__actions">
      <button
        class="b3-button b3-button--cancel postman-btn"
        :disabled="sending"
        @click="emit('cancel')"
      >
        {{ i18n.dialogCancel }}
      </button>
      <button
        class="b3-button postman-btn postman-btn--primary"
        :disabled="sending || !toInput"
        @click="handleSend"
      >
        <span v-if="sending" class="postman-spinner" />
        {{ sending ? i18n.dialogSending : i18n.dialogSend }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SendMode } from '@/services/emailService'
import { useEmailConfig } from '@/composables/useEmailConfig'
import { sendEmail } from '@/services/emailService'
import { exportDocAsHtml, exportDocAsMarkdown } from '@/services/siyuanApi'
import { ref, watch } from 'vue'

const props = defineProps<{
  /** 文档块 ID */
  docId: string
  /** 文档标题（作为默认主题） */
  docTitle: string
  /** 初始发送模式 */
  mode: SendMode
  /** i18n 字符串 */
  i18n: Record<string, string>
}>()

const emit = defineEmits<{
  cancel: []
  success: []
}>()

const toInput = ref('')
const subject = ref(props.docTitle)
const localMode = ref<SendMode>(props.mode)
const sending = ref(false)
const statusMsg = ref('')
const statusType = ref<'success' | 'error'>('success')

// 同步外部 mode prop 变化
watch(() => props.mode, (val) => {
  localMode.value = val
})

const emailConfig = useEmailConfig()

async function handleSend() {
  statusMsg.value = ''
  const toList = toInput.value
    .split(/[,，\s]+/)
    .map(e => e.trim())
    .filter(Boolean)

  if (!toList.length) return

  // 检查配置
  const config = emailConfig.value
  if (!config.host || !config.user || !config.password) {
    statusMsg.value = props.i18n.noConfigError
    statusType.value = 'error'
    return
  }

  sending.value = true
  try {
    let htmlContent = ''
    let mdContent = ''

    if (localMode.value === 'body') {
      // 获取 HTML 内容
      htmlContent = await exportDocAsHtml(props.docId)
    }
    else {
      // 获取 Markdown 内容
      const res = await exportDocAsMarkdown(props.docId)
      mdContent = res.content
    }

    await sendEmail({
      config,
      to: toList,
      subject: subject.value || props.docTitle,
      mode: localMode.value,
      docTitle: props.docTitle,
      htmlContent,
      mdContent,
    })

    statusMsg.value = props.i18n.dialogSuccess
    statusType.value = 'success'

    // 成功后 1.5 秒关闭
    setTimeout(() => emit('success'), 1500)
  }
  catch (e: any) {
    let errMsg = props.i18n.dialogError
    if (e?.message === 'ELECTRON_ONLY' || e?.message === 'NODEMAILER_NOT_FOUND') {
      errMsg += props.i18n.notElectronError
    }
    else if (e?.message === 'NO_CONFIG') {
      errMsg += props.i18n.noConfigError
    }
    else {
      errMsg += (e?.message || String(e))
    }
    statusMsg.value = errMsg
    statusType.value = 'error'
  }
  finally {
    sending.value = false
  }
}
</script>

<style lang="scss">
.postman-dialog {
  padding: 12px 0 4px;
  min-width: 360px;

  &__form {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 16px;
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
}

.postman-form-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.postman-form-label {
  font-size: 13px;
  color: var(--b3-theme-on-surface);
  font-weight: 500;
}

.postman-form-input {
  width: 100%;
  box-sizing: border-box;
}

.postman-mode-options {
  display: flex;
  gap: 16px;
}

.postman-radio-label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 13px;
  color: var(--b3-theme-on-surface);
}

.postman-radio {
  cursor: pointer;
}

.postman-status {
  font-size: 13px;
  padding: 6px 10px;
  border-radius: var(--b3-border-radius);

  &--success {
    background: var(--b3-theme-success-lighten);
    color: var(--b3-theme-success);
  }

  &--error {
    background: var(--b3-theme-error-lighten);
    color: var(--b3-theme-error);
  }
}

.postman-btn {
  min-width: 72px;

  &--primary {
    display: flex;
    align-items: center;
    gap: 6px;
  }
}

.postman-spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid currentcolor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: postman-spin 0.7s linear infinite;
}

@keyframes postman-spin {
  to { transform: rotate(360deg); }
}
</style>
