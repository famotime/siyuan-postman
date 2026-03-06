<template>
  <section class="postman-dialog postman-shell">
    <header class="postman-shell__hero postman-shell__hero--compact">
      <span class="postman-shell__stamp">AIR MAIL</span>
      <p class="postman-shell__eyebrow">{{ t('dialogEyebrow', 'Delivery Sheet') }}</p>
      <h3 class="postman-shell__title">{{ i18n.dialogTitle }}</h3>
      <p class="postman-shell__subtitle">{{ t('dialogSubtitle', 'Confirm recipients and choose how this document leaves SiYuan.') }}</p>

      <div class="postman-doc-chip">
        <div class="postman-doc-chip__copy">
          <span class="postman-doc-chip__label">{{ t('dialogDocLabel', 'Current document') }}</span>
          <strong class="postman-doc-chip__value">{{ docTitle }}</strong>
        </div>
        <span class="postman-chip postman-chip--accent">{{ currentModeCard.tag }}</span>
      </div>
    </header>

    <div class="postman-dialog__form">
      <label class="postman-field">
        <span class="postman-field__header">
          <span class="postman-field__label">{{ i18n.dialogTo }}</span>
          <span class="postman-field__hint">{{ t('dialogRecipientsHint', 'Use commas or spaces between multiple addresses.') }}</span>
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
          <span class="postman-field__hint">{{ t('dialogSubjectHint', 'Defaults to the document title.') }}</span>
        </span>
        <input v-model="subject" class="b3-text-field postman-control" type="text">
      </label>

      <section class="postman-card postman-card--soft">
        <div class="postman-card__head">
          <div>
            <p class="postman-card__eyebrow">Dispatch</p>
            <h4 class="postman-card__title">{{ t('dialogModeLabel', 'Send mode') }}</h4>
          </div>
          <p class="postman-card__hint">{{ t('dialogSendHint', 'Body mode sends rendered HTML. Attachment mode exports Markdown or ZIP assets.') }}</p>
        </div>

        <div class="postman-mode-grid">
          <label
            v-for="option in modeOptions"
            :key="option.value"
            class="postman-mode-card"
            :class="{ 'postman-mode-card--active': localMode === option.value }"
          >
            <input v-model="localMode" type="radio" :value="option.value" class="postman-radio">
            <span class="postman-mode-card__tag">{{ option.tag }}</span>
            <strong class="postman-mode-card__title">{{ option.title }}</strong>
            <span class="postman-mode-card__desc">{{ option.desc }}</span>
          </label>
        </div>
      </section>

      <div v-if="statusMsg" :class="['postman-status', statusType === 'error' ? 'postman-status--error' : 'postman-status--success']">
        <span class="postman-status__dot" />
        <span>{{ statusMsg }}</span>
      </div>
    </div>

    <footer class="postman-dialog__actions">
      <p class="postman-dialog__hint">{{ t('dialogReadyHint', 'SMTP settings are required before delivery.') }}</p>

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
    tag: 'HTML',
    title: t('dialogModeBodyTitle', props.i18n.sendAsBody || 'Inline body'),
    desc: t('dialogModeBodyDesc', 'Best for readable HTML mail with embedded images.'),
  },
  {
    value: 'attachment' as SendMode,
    tag: 'ZIP / MD',
    title: t('dialogModeAttachmentTitle', props.i18n.sendAsAttachment || 'Attachment bundle'),
    desc: t('dialogModeAttachmentDesc', 'Exports Markdown or ZIP assets for archival delivery.'),
  },
]))

const currentModeCard = computed(() => {
  return modeOptions.value.find(option => option.value === localMode.value) || modeOptions.value[0]
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
  min-width: 520px;
  display: flex;
  flex-direction: column;
  gap: 18px;

  &__form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  &__actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  &__actions-group {
    display: flex;
    gap: 12px;
    flex-shrink: 0;
  }

  &__hint {
    margin: 0;
    max-width: 280px;
    font-size: 12px;
    line-height: 1.5;
    color: var(--pm-muted);
  }
}

.postman-doc-chip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 18px;
  padding: 14px 16px;
  border-radius: var(--pm-radius-lg);
  border: 1px solid color-mix(in srgb, var(--pm-accent-red) 14%, var(--pm-border) 86%);
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--pm-accent-red) 7%, transparent), transparent 62%),
    color-mix(in srgb, var(--pm-panel) 90%, white 10%);

  &__copy {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }

  &__label {
    font-size: 11px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--pm-muted);
  }

  &__value {
    font-family: var(--pm-serif);
    font-size: 17px;
    line-height: 1.3;
    color: var(--pm-text);
    word-break: break-word;
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
  gap: 8px;
  min-height: 148px;
  padding: 16px;
  border-radius: var(--pm-radius-lg);
  border: 1px solid var(--pm-border);
  background: color-mix(in srgb, var(--pm-panel) 88%, white 12%);
  box-shadow: inset 0 1px 0 color-mix(in srgb, white 42%, transparent);
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;

  &:hover {
    transform: translateY(-2px);
    border-color: color-mix(in srgb, var(--pm-accent-blue) 22%, var(--pm-border) 78%);
    box-shadow: var(--pm-shadow-soft);
  }

  &--active {
    border-color: color-mix(in srgb, var(--pm-accent-blue) 36%, var(--pm-border) 64%);
    background:
      linear-gradient(180deg, color-mix(in srgb, var(--pm-accent-blue) 10%, transparent), transparent 62%),
      color-mix(in srgb, var(--pm-panel) 84%, white 16%);
    box-shadow: 0 14px 24px color-mix(in srgb, var(--pm-accent-blue) 12%, transparent);
  }

  &__tag {
    align-self: flex-start;
    padding: 4px 9px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--pm-accent-red) 10%, transparent);
    color: color-mix(in srgb, var(--pm-accent-red) 72%, var(--pm-text) 28%);
    font-family: var(--pm-mono);
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  &__title {
    font-family: var(--pm-serif);
    font-size: 18px;
    line-height: 1.25;
    color: var(--pm-text);
  }

  &__desc {
    font-size: 13px;
    line-height: 1.6;
    color: var(--pm-muted);
  }
}

.postman-radio {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

@media (max-width: 720px) {
  .postman-dialog {
    min-width: 0;

    &__actions {
      flex-direction: column;
      align-items: stretch;
    }

    &__actions-group {
      width: 100%;
    }

    &__actions-group > .postman-btn {
      flex: 1;
    }

    &__hint {
      max-width: none;
    }
  }

  .postman-doc-chip,
  .postman-mode-grid {
    grid-template-columns: 1fr;
  }

  .postman-doc-chip {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>

