<template>
  <section class="postman-dialog postman-panel">
    <header class="postman-panel-header">
      <div class="postman-panel-header__main">
        <h3 class="postman-panel-header__title">{{ i18n.dialogTitle }}</h3>
        <p class="postman-panel-header__subtitle">{{ t('dialogSubtitle', '填写收件人并选择发送方式。') }}</p>
      </div>

      <span class="postman-badge" :class="{ 'postman-badge--warning': !configReady }">
        {{ configReady ? t('dialogRelayReady', '已就绪') : t('dialogRelayMissing', '需要配置') }}
      </span>
    </header>

    <div class="postman-summary-grid">
      <article class="postman-summary-card postman-summary-card--wide">
        <span class="postman-summary-card__label">{{ t('dialogDocLabel', '当前文档') }}</span>
        <strong class="postman-summary-card__value postman-summary-card__value--wrap">{{ docTitle }}</strong>
        <span class="postman-summary-card__hint">{{ t('dialogSubjectHint', '默认使用当前文档标题。') }}</span>
      </article>

      <article class="postman-summary-card">
        <span class="postman-summary-card__label">{{ t('dialogModeLabel', '发送方式') }}</span>
        <strong class="postman-summary-card__value">{{ currentModeCard.title }}</strong>
        <span class="postman-summary-card__hint">{{ currentModeCard.desc }}</span>
      </article>

      <article class="postman-summary-card" :class="{ 'postman-summary-card--warning': !configReady }">
        <span class="postman-summary-card__label">{{ t('dialogRelayLabel', 'SMTP 状态') }}</span>
        <strong class="postman-summary-card__value">{{ configReady ? t('dialogRelayReady', '已就绪') : t('dialogRelayMissing', '需要配置') }}</strong>
        <span class="postman-summary-card__hint">{{ configReady ? relaySummary : t('dialogReadyHint', '发送前请先确认 SMTP 设置完整。') }}</span>
      </article>
    </div>

    <div class="postman-dialog__form">
      <label class="postman-field">
        <span class="postman-field__header">
          <span class="postman-field__label">{{ i18n.dialogTo }}</span>
          <span class="postman-field__hint">{{ t('dialogRecipientsHint', '多个地址可用逗号或空格分隔。') }}</span>
        </span>
        <input
          v-model="toInput"
          class="b3-text-field postman-control"
          type="email"
          multiple
          :placeholder="i18n.dialogToPlaceholder"
        >
      </label>

      <label class="postman-field">
        <span class="postman-field__header">
          <span class="postman-field__label">{{ i18n.dialogSubject }}</span>
          <span class="postman-field__hint">{{ t('dialogSubjectHint', '默认使用当前文档标题。') }}</span>
        </span>
        <input v-model="subject" class="b3-text-field postman-control" type="text">
      </label>

      <section class="postman-card">
        <div class="postman-card__head">
          <div>
            <h4 class="postman-card__title">{{ t('dialogModeLabel', '发送方式') }}</h4>
          </div>
          <p class="postman-card__hint">{{ t('dialogSendHint', '正文模式发送渲染后的 HTML，附件模式导出 Markdown 或 ZIP。') }}</p>
        </div>

        <div class="postman-mode-grid">
          <label
            v-for="option in modeOptions"
            :key="option.value"
            class="postman-mode-card"
            :class="{ 'postman-mode-card--active': localMode === option.value }"
          >
            <input v-model="localMode" type="radio" :value="option.value" class="postman-radio">
            <span class="postman-mode-card__check" />
            <strong class="postman-mode-card__title">{{ option.title }}</strong>
            <span class="postman-mode-card__desc">{{ option.desc }}</span>
          </label>
        </div>
      </section>
    </div>

    <footer class="postman-actions postman-dialog__actions">
      <div class="postman-actions__copy">
        <p class="postman-actions__hint">{{ configReady ? relaySummary : t('dialogReadyHint', '发送前请先确认 SMTP 设置完整。') }}</p>

        <div v-if="statusMsg" :class="['postman-status', statusType === 'error' ? 'postman-status--error' : 'postman-status--success']">
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
          <span v-if="sending" class="postman-spinner" />
          <span class="postman-btn__label">{{ sending ? i18n.dialogSending : i18n.dialogSend }}</span>
        </button>
      </div>
    </footer>
  </section>
</template>

<script setup lang="ts">
import type { SendMode } from '@/services/emailService'
import { useEmailConfig } from '@/composables/useEmailConfig'
import { sendEmail } from '@/services/emailService'
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
    title: t('dialogModeBodyTitle', props.i18n.sendAsBody || '正文发送'),
    desc: t('dialogModeBodyDesc', '适合直接阅读的 HTML 邮件正文。'),
  },
  {
    value: 'attachment' as SendMode,
    title: t('dialogModeAttachmentTitle', props.i18n.sendAsAttachment || '附件发送'),
    desc: t('dialogModeAttachmentDesc', '导出 Markdown 或带图片资源的 ZIP 文件。'),
  },
]))

const currentModeCard = computed(() => {
  return modeOptions.value.find(option => option.value === localMode.value) || modeOptions.value[0]
})

const configReady = computed(() => {
  const config = emailConfig.value
  return Boolean(config.host && config.user && config.password)
})

const relaySummary = computed(() => {
  const config = emailConfig.value

  if (!config.host) {
    return t('dialogReadyHint', '发送前请先确认 SMTP 设置完整。')
  }

  return `${config.host}:${config.port} · SSL/TLS`
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
      mdContent = result.content
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
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;

  &__form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  &__actions-group {
    display: flex;
    gap: 12px;
    flex-shrink: 0;
  }
}

.postman-mode-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.postman-mode-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 136px;
  padding: 16px;
  border-radius: var(--pm-radius-lg);
  border: 1px solid var(--pm-border);
  background: var(--pm-surface-elevated);
  cursor: pointer;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;

  &:hover {
    transform: translateY(-1px);
    border-color: var(--pm-border-strong);
    box-shadow: var(--pm-shadow-soft);
  }

  &--active {
    border-color: color-mix(in srgb, var(--pm-accent) 42%, var(--pm-border) 58%);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--pm-accent) 12%, transparent);
  }

  &__check {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 2px solid color-mix(in srgb, var(--pm-accent) 24%, var(--pm-border) 76%);
    background: var(--pm-surface);
  }

  &--active &__check {
    border-color: var(--pm-accent);
    box-shadow: inset 0 0 0 4px var(--pm-surface), 0 0 0 8px color-mix(in srgb, var(--pm-accent) 96%, transparent);
  }

  &__title {
    font-size: 16px;
    line-height: 1.35;
    color: var(--pm-text);
  }

  &__desc {
    font-size: 13px;
    line-height: 1.6;
    color: var(--pm-text-secondary);
  }
}

.postman-radio {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

@media (max-width: 720px) {
  .postman-dialog {
    &__actions-group {
      width: 100%;
    }

    &__actions-group > .postman-btn {
      flex: 1;
    }
  }

  .postman-mode-grid {
    grid-template-columns: 1fr;
  }
}
</style>
