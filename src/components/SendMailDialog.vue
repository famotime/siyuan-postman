<template>
  <div class="postman-dialog">
    <div class="postman-form">
      <label class="postman-field">
        <span class="postman-field__label">{{ i18n.dialogTo }}</span>
        <div class="postman-recipient-wrap">
          <div
            class="postman-recipient-input"
            @click="focusRecipientInput"
          >
            <span
              v-for="email in selectedRecipients"
              :key="email"
              class="postman-recipient-tag"
            >
              {{ email }}
              <button
                type="button"
                class="postman-recipient-tag__remove"
                @mousedown.prevent.stop
                @click.stop="removeRecipient(email)"
              >
                ×
              </button>
            </span>
            <input
              ref="recipientInputRef"
              v-model="recipientDraft"
              class="postman-recipient-input__field"
              type="text"
              :placeholder="selectedRecipients.length ? '' : i18n.dialogToPlaceholder"
              @focus="showRecipientDropdown = true"
              @blur="hideRecipientDropdown"
              @keydown.enter.prevent="commitRecipientDraft"
              @keydown.,.prevent="commitRecipientDraft"
              @keydown.backspace="handleRecipientBackspace"
            >
            <button
              type="button"
              class="postman-select-wrap__arrow"
              tabindex="-1"
              aria-hidden="true"
              @mousedown.prevent="toggleRecipientDropdown"
            />
          </div>
          <div
            v-if="showRecipientDropdown && availableRecentRecipients.length"
            class="postman-recipient-dropdown"
          >
            <button
              v-for="email in availableRecentRecipients"
              :key="email"
              type="button"
              class="postman-recipient-dropdown__item"
              @mousedown.prevent="addRecipient(email)"
            >
              {{ email }}
            </button>
          </div>
        </div>
      </label>

      <label class="postman-field">
        <span class="postman-field__label">{{ i18n.dialogSubject }}</span>
        <input
          v-model="subject"
          class="b3-text-field postman-control"
          type="text"
        >
      </label>

      <template v-if="isElectron">
        <label class="postman-field">
          <span class="postman-field__label">{{ t('dialogAccountLabel', '发件账号') }}</span>
          <div class="postman-select-wrap">
            <select
              v-model="selectedAccountId"
              class="b3-select postman-control postman-account-select"
              :disabled="!accountOptions.length"
            >
              <option
                v-if="!accountOptions.length"
                value=""
              >
                {{ t('dialogAccountEmpty', '尚未配置邮箱') }}
              </option>
              <option
                v-for="option in accountOptions"
                :key="option.id"
                :value="option.id"
              >
                {{ option.label }}
              </option>
            </select>
          </div>
        </label>

        <div class="postman-provider-badge">
          <span class="postman-provider-badge__icon-shell">
            <img
              :src="providerBadge.iconSrc"
              :alt="providerBadge.label"
              class="postman-provider-badge__icon"
            >
          </span>
          <span class="postman-provider-badge__content">
            <strong class="postman-provider-badge__label">{{ providerBadge.label }}</strong>
            <span class="postman-provider-badge__secondary">{{ providerBadge.secondary }}</span>
          </span>
        </div>
      </template>
      <div
        v-else
        class="postman-provider-badge"
      >
        <span class="postman-provider-badge__content">
          <strong class="postman-provider-badge__label">{{ t('dialogHttpMode', 'HTTP API 模式') }}</strong>
          <span class="postman-provider-badge__secondary">{{ t('dialogHttpModeDesc', '通过 Resend API 发送，可在设置中配置') }}</span>
        </span>
      </div>

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
          <span>{{ isElectron ? i18n.noConfigError : t('noHttpConfigError', '请在设置中配置 Resend API Key 信息') }}</span>
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
          :disabled="sending"
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
import { EMAIL_PRESET_ICONS } from '@/assets/preset-icons'
import { saveEmailConfig, setActiveEmailConfig, useEmailConfig, useHttpEmailConfig } from '@/composables/useEmailConfig'
import { initRecentRecipients, addRecentRecipients, getRecentRecipients } from '@/composables/useRecentRecipients'
import type { SendMode } from '@/services/emailService'
import { sendEmail } from '@/services/emailService'
import { sanitizeMarkdownForEmail } from '@/services/markdownToEmailHtml'
import { exportDocAsHtml, exportDocAsMarkdown } from '@/services/siyuanApi'
import { EMAIL_PRESET_UI_META, getPresetHostCaption, resolveActivePreset } from '@/utils/emailPresetUi'
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

const t = (key: string, fallback: string) => props.i18n[key] || fallback

const isElectron = (() => {
  try {
    return typeof process !== 'undefined' && typeof process.versions === 'object' && !!process.versions.electron
  }
  catch { return false }
})()

const configState = useEmailConfig()
const httpConfigRef = useHttpEmailConfig()
const selectedAccountId = ref('')
const accountOptions = computed(() => {
  return configState.value.accounts.map(account => ({
    id: account.id,
    label: account.user || account.fromName || account.host || t('dialogAccountUnnamed', '未命名账号'),
  }))
})

watch(
  [accountOptions, () => configState.value.activeId],
  ([options, activeId]) => {
    if (!options.length) {
      selectedAccountId.value = ''
      return
    }

    const stillExists = options.some(option => option.id === selectedAccountId.value)
    if (stillExists) {
      return
    }

    const nextId = options.some(option => option.id === activeId)
      ? activeId || ''
      : options[0]?.id

    selectedAccountId.value = nextId || ''
  },
  { immediate: true },
)

watch(selectedAccountId, (value) => {
  if (value) {
    setActiveEmailConfig(value).catch(() => {})
  }
})

const activeAccount = computed(() => {
  if (!accountOptions.value.length) return null
  const current = configState.value.accounts.find(account => account.id === selectedAccountId.value)
  return current || configState.value.accounts[0] || null
})

const recipientInputRef = ref<HTMLInputElement | null>(null)
const selectedRecipients = ref<string[]>([])
const recipientDraft = ref('')
const subject = ref(props.docTitle)
const localMode = ref<SendMode>(props.mode)
const sending = ref(false)
const statusMsg = ref('')
const statusType = ref<'success' | 'error'>('success')
const showRecipientDropdown = ref(false)
const recentRecipients = ref<string[]>(getRecentRecipients())
initRecentRecipients().then(list => { recentRecipients.value = list })

const availableRecentRecipients = computed(() =>
  recentRecipients.value.filter(email => !selectedRecipients.value.includes(email)),
)

function focusRecipientInput() {
  recipientInputRef.value?.focus()
}

function hideRecipientDropdown() {
  window.setTimeout(() => {
    showRecipientDropdown.value = false
  }, 150)
}

function toggleRecipientDropdown() {
  showRecipientDropdown.value = !showRecipientDropdown.value
}

function addRecipient(email: string) {
  const trimmed = email.trim()
  if (trimmed && !selectedRecipients.value.includes(trimmed)) {
    selectedRecipients.value = [...selectedRecipients.value, trimmed]
  }
  recipientDraft.value = ''
  showRecipientDropdown.value = false
}

function removeRecipient(email: string) {
  selectedRecipients.value = selectedRecipients.value.filter(item => item !== email)
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function commitRecipientDraft() {
  const emails = recipientDraft.value
    .split(/[，,]/)
    .map(item => item.trim())
    .filter(Boolean)
  const valid = emails.filter(e => EMAIL_RE.test(e))
  for (const email of valid) {
    if (!selectedRecipients.value.includes(email)) {
      selectedRecipients.value = [...selectedRecipients.value, email]
    }
  }
  recipientDraft.value = ''
}

function handleRecipientBackspace() {
  if (!recipientDraft.value && selectedRecipients.value.length) {
    selectedRecipients.value = selectedRecipients.value.slice(0, -1)
  }
}

watch(recipientDraft, (value, oldValue) => {
  if (value.length > oldValue.length && /[，,]/.test(value)) {
    commitRecipientDraft()
  }
})

const providerBadge = computed(() => {
  const config = activeAccount.value
  if (!config) {
    const meta = EMAIL_PRESET_UI_META.custom
    return {
      iconSrc: EMAIL_PRESET_ICONS[meta.iconKey],
      label: t(meta.labelKey, '自定义'),
      secondary: t('dialogAccountEmpty', '尚未配置邮箱'),
    }
  }

  const activePreset = resolveActivePreset(config.preset, config.host)
  const meta = EMAIL_PRESET_UI_META[activePreset.key] || EMAIL_PRESET_UI_META.custom
  const secondarySource = config.user || config.host || activePreset.host

  return {
    iconSrc: EMAIL_PRESET_ICONS[meta.iconKey],
    label: t(meta.labelKey, activePreset.label),
    secondary: getPresetHostCaption({ host: secondarySource }, t('presetCustomHint', '手动填写 SMTP 参数')),
  }
})

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
  if (isElectron) {
    const config = activeAccount.value
    return Boolean(config?.host && config?.user && config?.password)
  }
  return Boolean(httpConfigRef.value.httpApiKey)
})

watch(() => props.mode, (value) => {
  localMode.value = value
})

watch(() => activeAccount.value?.lastTo, (value) => {
  if (!selectedRecipients.value.length && value) {
    selectedRecipients.value = value
      .split(/[，,]/)
      .map(email => email.trim())
      .filter(Boolean)
  }
}, { immediate: true })

async function handleSend() {
  statusMsg.value = ''

  // Validate draft text before committing
  const draftEmails = recipientDraft.value
    .split(/[，,]/)
    .map(item => item.trim())
    .filter(Boolean)

  if (draftEmails.length) {
    const invalidDrafts = draftEmails.filter(e => !EMAIL_RE.test(e))
    if (invalidDrafts.length) {
      window.alert(t('invalidEmailError', '以下邮箱地址格式不正确：') + '\n' + invalidDrafts.join('\n'))
      return
    }
  }

  commitRecipientDraft()

  const toList = selectedRecipients.value.slice()

  if (!toList.length) {
    window.alert(t('dialogToRequired', '请填写收件人邮箱地址'))
    return
  }

  const invalidRecipients = toList.filter(e => !EMAIL_RE.test(e))
  if (invalidRecipients.length) {
    window.alert(t('invalidEmailError', '以下邮箱地址格式不正确：') + '\n' + invalidRecipients.join('\n'))
    return
  }

  const config = activeAccount.value
  if (isElectron) {
    if (!config?.host || !config?.user || !config?.password) {
      statusMsg.value = props.i18n.noConfigError
      statusType.value = 'error'
      return
    }
  }
  else if (!httpConfigRef.value.httpApiKey) {
    statusMsg.value = t('noHttpConfigError', '请在设置中配置 Resend API Key 信息')
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
      config: config!,
      httpConfig: isElectron ? undefined : {
        httpProvider: httpConfigRef.value.httpProvider,
        httpApiKey: httpConfigRef.value.httpApiKey,
        httpEndpoint: httpConfigRef.value.httpEndpoint,
      },
      to: toList,
      subject: subject.value || props.docTitle,
      mode: localMode.value,
      docTitle: props.docTitle,
      htmlContent,
      mdContent,
    })

    const lastToValue = toList.join(', ')
    recentRecipients.value = addRecentRecipients(toList)
    try {
      await saveEmailConfig({
        ...config,
        lastTo: lastToValue,
        hasSentSuccessfully: true,
      })
    }
    catch {
      // 保持发送成功结果，不因本地缓存失败打断流程。
    }

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
    else if (error?.message === 'NO_HTTP_CONFIG' || error?.message === 'NO_HTTP_API_KEY') {
      errMsg += t('noHttpConfigError', '请在设置中配置 Resend API Key 信息')
    }
    else if (error?.message?.startsWith?.('HTTP_EMAIL_')) {
      errMsg += t('httpEmailError', '邮件 API 调用失败：') + error.message
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

.postman-provider-badge {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--pm-border);
  border-radius: var(--pm-radius-md);
  background: color-mix(in srgb, var(--pm-accent) 3%, var(--pm-surface-elevated) 97%);

  &__icon-shell {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--pm-field-bg) 88%, white 12%);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pm-border) 85%, transparent);
    overflow: hidden;
    flex-shrink: 0;
  }

  &__icon {
    width: 20px;
    height: 20px;
    object-fit: contain;
  }

  &__content {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 2px;
  }

  &__label {
    font-size: 13px;
    line-height: 1.4;
    color: var(--pm-text);
  }

  &__secondary {
    font-size: 12px;
    line-height: 1.4;
    color: var(--pm-text-muted);
    word-break: break-all;
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

.postman-recipient-wrap {
  position: relative;
}

.postman-recipient-input {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-height: 38px;
  padding: 4px 34px 4px 10px;
  box-sizing: border-box;
  border-radius: var(--pm-radius-md);
  border: 1px solid var(--pm-border);
  background: var(--pm-field-bg);
  cursor: text;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &:hover {
    border-color: var(--pm-border-strong);
  }

  &:focus-within {
    outline: none;
    border-color: color-mix(in srgb, var(--pm-accent) 46%, var(--pm-border) 54%);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--pm-accent) 12%, transparent);
  }

  &__field {
    flex: 1;
    min-width: 80px;
    border: none;
    outline: none;
    background: transparent;
    color: var(--pm-text);
    font-size: 14px;
    line-height: 28px;
    padding: 0;

    &::placeholder {
      color: var(--pm-text-muted);
    }
  }
}

.postman-recipient-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px 2px 8px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--pm-accent) 10%, transparent);
  color: var(--pm-text);
  font-size: 13px;
  line-height: 20px;
  max-width: 100%;
  word-break: break-all;

  &__remove {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: var(--pm-text-muted);
    font-size: 14px;
    line-height: 1;
    cursor: pointer;
    flex-shrink: 0;
    padding: 0;
    transition: background 0.12s ease, color 0.12s ease;

    &:hover {
      background: color-mix(in srgb, var(--pm-danger) 15%, transparent);
      color: var(--pm-danger);
    }
  }
}

.postman-recipient-dropdown {
  position: absolute;
  z-index: 10;
  top: 100%;
  left: 0;
  right: 0;
  max-height: 160px;
  overflow-y: auto;
  margin-top: 4px;
  padding: 4px;
  border: 1px solid var(--pm-border);
  border-radius: var(--pm-radius-md);
  background: var(--pm-surface-elevated);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);

  &__item {
    display: block;
    width: 100%;
    padding: 6px 10px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--pm-text);
    font-size: 13px;
    text-align: left;
    cursor: pointer;
    transition: background 0.12s ease;

    &:hover {
      background: color-mix(in srgb, var(--pm-accent) 8%, transparent);
    }
  }
}
</style>
