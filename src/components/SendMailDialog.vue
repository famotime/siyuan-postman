<template>
  <div class="postman-dialog">
    <div class="postman-form">
      <label class="postman-field">
        <span class="postman-field__label">{{ i18n.dialogTo }}</span>
        <input
          v-model="toInput"
          class="b3-text-field postman-control"
          type="email"
          multiple
          :placeholder="i18n.dialogToPlaceholder"
        >
      </label>

      <label class="postman-field">
        <span class="postman-field__label">{{ i18n.dialogSubject }}</span>
        <input
          v-model="subject"
          class="b3-text-field postman-control"
          type="text"
        >
      </label>

      <div class="postman-field">
        <span class="postman-field__label">{{ t('dialogModeLabel', '发送方式') }}</span>
        <div class="postman-mode-grid">
          <label
            v-for="option in modeOptions"
            :key="option.value"
            class="postman-mode-card"
            :class="{ 'postman-mode-card--active': localMode === option.value }"
          >
            <input
              v-model="localMode"
              type="radio"
              :value="option.value"
              class="postman-radio"
            >
            <div class="postman-mode-card__header">
              <span class="postman-mode-card__check" />
              <strong class="postman-mode-card__title">{{ option.title }}</strong>
            </div>
            <span class="postman-mode-card__desc">{{ option.desc }}</span>
          </label>
        </div>
      </div>
    </div>

    <footer class="postman-actions">
      <div class="postman-actions__copy">
        <div
          v-if="!configReady"
          class="postman-status postman-status--error"
        >
          <span class="postman-status__dot" />
          <span>{{ i18n.noConfigError }}</span>
        </div>
        <div
          v-else-if="statusMsg"
          :class="['postman-status', statusType === 'error' ? 'postman-status--error' : 'postman-status--success']"
        >
          <span class="postman-status__dot" />
          <span>{{ statusMsg }}</span>
        </div>
      </div>

      <div class="postman-dialog__actions-group">
        <button
          class="b3-button b3-button--cancel postman-btn postman-btn--ghost"
          :disabled="sending"
          @click="emit('cancel')"
        >
          {{ i18n.dialogCancel }}
        </button>
        <button
          class="b3-button postman-btn postman-btn--primary"
          :disabled="sending || !canSend"
          @click="handleSend"
        >
          <span
            v-if="sending"
            class="postman-spinner"
          />
          {{ sending ? i18n.dialogSending : i18n.dialogSend }}
        </button>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import type { SendMode } from '@/services/emailService'
import { useEmailConfig } from '@/composables/useEmailConfig'
import { sendEmail } from '@/services/emailService'
import { sanitizeMarkdownForEmail } from '@/services/markdownToEmailHtml'
import { exportDocAsHtml, exportDocAsMarkdown } from '@/services/siyuanApi'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  docId: string
  docTitle: string
  mode: SendMode
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
const emailConfig = useEmailConfig()

const t = (key: string, fallback: string) => props.i18n[key] || fallback

const modeOptions = computed(() => ([
  {
    value: 'body' as SendMode,
    title: t('dialogModeBodyTitle', '正文发送'),
    desc: t('dialogModeBodyDesc', '适合直接阅读的 HTML 邮件正文。'),
  },
  {
    value: 'attachment' as SendMode,
    title: t('dialogModeAttachmentTitle', '附件发送'),
    desc: t('dialogModeAttachmentDesc', '导出 Markdown 或带图片资源的 ZIP 文件。'),
  },
]))

const configReady = computed(() => {
  const config = emailConfig.value
  return Boolean(config.host && config.user && config.password)
})

const canSend = computed(() => toInput.value.trim().length > 0)

watch(() => props.mode, (value) => {
  localMode.value = value
})

async function handleSend() {
  statusMsg.value = ''
  const toList = toInput.value
    .split(/[,，\s]+/)
    .map(email => email.trim())
    .filter(Boolean)

  if (!toList.length) {
    return
  }

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
      htmlContent = await exportDocAsHtml(props.docId)
    }
    else {
      const result = await exportDocAsMarkdown(props.docId)
      mdContent = sanitizeMarkdownForEmail(result.content)
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

    window.setTimeout(() => emit('success'), 1500)
  }
  catch (error: any) {
    let errMsg = props.i18n.dialogError

    if (error?.message === 'ELECTRON_ONLY' || error?.message === 'NODEMAILER_NOT_FOUND') {
      errMsg += props.i18n.notElectronError
    }
    else if (error?.message === 'NO_CONFIG') {
      errMsg += props.i18n.noConfigError
    }
    else {
      errMsg += error?.message || String(error)
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
  &__actions-group {
    display: flex;
    gap: 10px;
    flex-shrink: 0;
  }
}

.postman-mode-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.postman-mode-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  border-radius: var(--pm-radius-md);
  border: 1px solid var(--pm-border);
  background: var(--pm-surface-elevated);
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;

  &:hover {
    border-color: var(--pm-border-strong);
  }

  &--active {
    border-color: color-mix(in srgb, var(--pm-accent) 50%, var(--pm-border) 50%);
    background: color-mix(in srgb, var(--pm-accent) 4%, var(--pm-surface-elevated) 96%);
  }

  &__header {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__check {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 2px solid var(--pm-border);
    flex-shrink: 0;
    transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
  }

  &--active &__check {
    border-color: var(--pm-accent);
    background: var(--pm-accent);
    box-shadow: inset 0 0 0 2.5px var(--pm-surface-elevated);
  }

  &__title {
    font-size: 14px;
    line-height: 1.4;
    color: var(--pm-text);
  }

  &__desc {
    font-size: 12px;
    line-height: 1.5;
    color: var(--pm-text-secondary);
    padding-left: 22px;
  }
}

.postman-radio {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}
</style>
