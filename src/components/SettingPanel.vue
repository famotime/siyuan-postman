<template>
  <div class="postman-setting">
    <!-- HTTP API 配置（移动端 / 浏览器端） -->
    <div
      v-if="!isElectron"
      class="postman-form postman-http-section"
    >
      <div class="postman-http-section__header">
        <h3 class="postman-http-section__title">{{ t('settingHttpTitle', 'HTTP 邮件 API') }}</h3>
        <span class="postman-http-section__badge">{{ t('settingHttpBadge', '移动端') }}</span>
      </div>
      <p class="postman-http-section__desc">{{ t('settingHttpDesc', '移动端通过 HTTP API 发送邮件，需配置 Resend API Key。') }}</p>

      <label class="postman-field">
        <span class="postman-field__label">{{ t('settingHttpApiKey', 'Resend API Key') }}</span>
        <span class="postman-password-wrap">
          <input
            v-model="httpForm.httpApiKey"
            class="b3-text-field postman-control postman-password-input"
            :type="showHttpApiKey ? 'text' : 'password'"
            placeholder="re_xxxxxxxxxx"
          >
          <button
            type="button"
            class="postman-password-toggle"
            :aria-label="showHttpApiKey ? t('settingHidePassword', '隐藏密码') : t('settingShowPassword', '显示密码')"
            @click="showHttpApiKey = !showHttpApiKey"
          >
            <svg
              v-if="!showHttpApiKey"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              aria-hidden="true"
            >
              <path
                d="M12 5C7 5 3.12 8.11 1.5 12c1.62 3.89 5.5 7 10.5 7s8.88-3.11 10.5-7C20.88 8.11 17 5 12 5zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"
                fill="currentColor"
              />
            </svg>
            <svg
              v-else
              viewBox="0 0 24 24"
              width="16"
              height="16"
              aria-hidden="true"
            >
              <path
                d="M2.81 2.81 1.39 4.22l3.05 3.05C3.26 8.3 2.27 9.57 1.5 11c1.62 3.89 5.5 7 10.5 7 1.82 0 3.5-.41 4.98-1.13l2.8 2.8 1.41-1.41L2.81 2.81zm9.19 13.19a4 4 0 0 1-4-4c0-.54.11-1.05.3-1.51l5.21 5.21c-.46.19-.97.3-1.51.3zm0-10c5 0 8.88 3.11 10.5 7-.55 1.33-1.35 2.52-2.34 3.49l-1.43-1.43A6.95 6.95 0 0 0 19 12a7 7 0 0 0-7-7c-1.08 0-2.11.25-3.02.69L7.43 4.14A10.9 10.9 0 0 1 12 6z"
                fill="currentColor"
              />
            </svg>
          </button>
        </span>
      </label>

      <label class="postman-field">
        <span class="postman-field__label">{{ t('settingHttpEndpoint', '自定义 Endpoint（可选）') }}</span>
        <input
          v-model="httpForm.httpEndpoint"
          class="b3-text-field postman-control"
          type="text"
          :placeholder="t('settingHttpEndpointPlaceholder', '默认使用 https://api.resend.com/emails')"
        >
      </label>

      <div class="postman-http-section__hint">
        <span>{{ t('settingHttpApiKeyHint', '前往 resend.com 注册获取 API Key，免费版每月 3000 封。') }}</span>
      </div>
    </div>

    <!-- SMTP 配置（桌面端） -->
    <div class="postman-form">
      <div class="postman-field">
        <span class="postman-field__label">{{ t('settingAccount', '发件账号') }}</span>
        <div class="postman-account-row">
          <div class="postman-select-wrap">
            <select
              v-model="selectedId"
              class="b3-select postman-control postman-account-select"
            >
              <option
                v-for="option in accountOptions"
                :key="option.id"
                :value="option.id"
              >
                {{ option.label }}
              </option>
              <option :value="NEW_ACCOUNT_KEY">
                ＋ {{ t('settingAccountNew', '新增账号') }}
              </option>
            </select>
          </div>
          <button
            type="button"
            class="b3-button postman-btn postman-btn--ghost"
            :disabled="!canRemoveAccount"
            @click="handleRemove"
          >
            {{ t('settingAccountRemove', '删除账号') }}
          </button>
        </div>
      </div>

      <div class="postman-field">
        <span class="postman-field__label">{{ t('settingPreset', '预设邮箱') }}</span>
        <div class="postman-preset-grid">
          <button
            v-for="preset in presets"
            :key="preset.key"
            type="button"
            class="postman-preset-card"
            :class="{ 'postman-preset-card--active': form.preset === preset.key }"
            :aria-pressed="form.preset === preset.key"
            @click="selectPreset(preset.key)"
          >
            <span class="postman-preset-card__icon-shell">
              <img
                :src="preset.iconSrc"
                :alt="preset.label"
                class="postman-preset-card__icon"
              >
            </span>
            <span class="postman-preset-card__content">
              <strong class="postman-preset-card__title">{{ preset.label }}</strong>
              <span class="postman-preset-card__host">{{ preset.hostCaption }}</span>
            </span>
            <span
              class="postman-preset-card__check"
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      <div class="postman-setting__inline">
        <label class="postman-field">
          <span class="postman-field__label">{{ t('settingHost', 'SMTP 服务器') }}</span>
          <input
            v-model="form.host"
            class="b3-text-field postman-control"
            type="text"
            placeholder="smtp.example.com"
          >
        </label>

        <label class="postman-field postman-field--compact">
          <span class="postman-field__label">{{ t('settingPort', '端口') }}</span>
          <input
            v-model.number="form.port"
            class="b3-text-field postman-control"
            type="number"
            min="1"
            max="65535"
          >
        </label>

        <span class="postman-ssl-tag">SSL/TLS</span>
      </div>

      <label class="postman-field">
        <span class="postman-field__label">{{ t('settingUser', '用户名（邮箱地址）') }}</span>
        <input
          v-model="form.user"
          class="b3-text-field postman-control"
          type="email"
          placeholder="you@example.com"
        >
      </label>

      <label class="postman-field">
        <span class="postman-field__label">{{ t('settingPassword', '授权码 / 密码（QQ/163/189 等邮箱需使用专用授权码，非登录密码）') }}</span>
        <span class="postman-password-wrap">
          <input
            v-model="form.password"
            class="b3-text-field postman-control postman-password-input"
            :type="showPassword ? 'text' : 'password'"
            :placeholder="t('settingPasswordPlaceholder', '授权码或邮箱密码')"
          >
          <button
            type="button"
            class="postman-password-toggle"
            :aria-label="showPassword ? t('settingHidePassword', '隐藏密码') : t('settingShowPassword', '显示密码')"
            @click="showPassword = !showPassword"
          >
            <svg
              v-if="!showPassword"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              aria-hidden="true"
            >
              <path
                d="M12 5C7 5 3.12 8.11 1.5 12c1.62 3.89 5.5 7 10.5 7s8.88-3.11 10.5-7C20.88 8.11 17 5 12 5zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"
                fill="currentColor"
              />
            </svg>
            <svg
              v-else
              viewBox="0 0 24 24"
              width="16"
              height="16"
              aria-hidden="true"
            >
              <path
                d="M2.81 2.81 1.39 4.22l3.05 3.05C3.26 8.3 2.27 9.57 1.5 11c1.62 3.89 5.5 7 10.5 7 1.82 0 3.5-.41 4.98-1.13l2.8 2.8 1.41-1.41L2.81 2.81zm9.19 13.19a4 4 0 0 1-4-4c0-.54.11-1.05.3-1.51l5.21 5.21c-.46.19-.97.3-1.51.3zm0-10c5 0 8.88 3.11 10.5 7-.55 1.33-1.35 2.52-2.34 3.49l-1.43-1.43A6.95 6.95 0 0 0 19 12a7 7 0 0 0-7-7c-1.08 0-2.11.25-3.02.69L7.43 4.14A10.9 10.9 0 0 1 12 6z"
                fill="currentColor"
              />
            </svg>
          </button>
        </span>
      </label>

      <label class="postman-field">
        <span class="postman-field__label">{{ t('settingFrom', '发件人名称（可选）') }}</span>
        <input
          v-model="form.fromName"
          class="b3-text-field postman-control"
          type="text"
          :placeholder="t('settingFromPlaceholder', '邮件中显示的发件人名称')"
        >
      </label>
    </div>

    <!-- HTTP API 保存按钮（移动端） -->
    <footer
      v-if="!isElectron"
      class="postman-actions"
    >
      <div class="postman-actions__copy">
        <p class="postman-actions__hint">{{ t('settingHttpRelayHint', 'API Key 仅保存在本地插件数据中，不会上传。') }}</p>
        <div
          v-if="httpSavedMsg"
          class="postman-status postman-status--success"
        >
          <span class="postman-status__dot" />
          <span>{{ httpSavedMsg }}</span>
        </div>
      </div>

      <button
        class="b3-button postman-btn postman-btn--primary"
        @click="handleHttpSave"
      >
        {{ t('settingSave', '保存设置') }}
      </button>
    </footer>

    <!-- SMTP 保存按钮（桌面端） -->
    <footer class="postman-actions">
      <div class="postman-actions__copy">
        <p class="postman-actions__hint">{{ t('settingRelayHint', '邮箱信息仅保存在本地插件数据中，不会上传。') }}</p>
        <div
          v-if="savedMsg"
          class="postman-status postman-status--success"
        >
          <span class="postman-status__dot" />
          <span>{{ savedMsg }}</span>
        </div>
      </div>

      <button
        class="b3-button postman-btn postman-btn--primary"
        @click="handleSave"
      >
        {{ t('settingSave', '保存设置') }}
      </button>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { EMAIL_PRESET_ICONS } from '@/assets/preset-icons'
import type { EmailConfig } from '@/composables/useEmailConfig'
import {
  EMAIL_PRESETS,
  normalizeEmailConfig,
  removeEmailConfig,
  saveEmailConfig,
  saveHttpEmailConfig,
  setActiveEmailConfig,
  useEmailConfig,
  useHttpEmailConfig,
} from '@/composables/useEmailConfig'
import { EMAIL_PRESET_UI_META, getPresetHostCaption } from '@/utils/emailPresetUi'
import { computed, reactive, ref, watch } from 'vue'

const props = defineProps<{
  i18n: Record<string, string>
}>()

const NEW_ACCOUNT_KEY = '__new__'

const configRef = useEmailConfig()
const form = reactive<EmailConfig>(normalizeEmailConfig())
const selectedId = ref(
  configRef.value.activeId
  || configRef.value.accounts[0]?.id
  || NEW_ACCOUNT_KEY,
)
const savedMsg = ref('')
const showPassword = ref(false)

const t = (key: string, fallback: string) => props.i18n[key] || fallback

// ─── HTTP API 配置（移动端） ───
const isElectron = (() => {
  try {
    return typeof process !== 'undefined' && typeof process.versions === 'object' && !!process.versions.electron
  }
  catch { return false }
})()

const httpConfigRef = useHttpEmailConfig()
const httpForm = reactive({
  httpApiKey: httpConfigRef.value.httpApiKey,
  httpEndpoint: httpConfigRef.value.httpEndpoint,
})
const showHttpApiKey = ref(false)
const httpSavedMsg = ref('')

async function handleHttpSave() {
  await saveHttpEmailConfig({
    httpProvider: 'resend',
    httpApiKey: httpForm.httpApiKey,
    httpEndpoint: httpForm.httpEndpoint,
  })
  httpSavedMsg.value = t('settingSaveSuccess', '设置已保存')
  window.setTimeout(() => {
    httpSavedMsg.value = ''
  }, 2500)
}

const accountOptions = computed(() => {
  return configRef.value.accounts.map(account => ({
    id: account.id,
    label: account.user || account.fromName || account.host || t('settingAccountUnnamed', '未命名账号'),
  }))
})

const canRemoveAccount = computed(() => {
  return configRef.value.accounts.length > 1 && selectedId.value !== NEW_ACCOUNT_KEY
})

const presets = computed(() => {
  return EMAIL_PRESETS.map((preset) => {
    const meta = EMAIL_PRESET_UI_META[preset.key] || EMAIL_PRESET_UI_META.custom

    return {
      ...preset,
      iconSrc: EMAIL_PRESET_ICONS[meta.iconKey],
      label: t(meta.labelKey, preset.label),
      hostCaption: getPresetHostCaption(preset, t('presetCustomHint', '手动填写 SMTP 参数')),
    }
  })
})

watch(selectedId, async (value) => {
  if (value === NEW_ACCOUNT_KEY) {
    Object.assign(form, normalizeEmailConfig())
    return
  }

  const account = configRef.value.accounts.find(item => item.id === value)
  if (account) {
    Object.assign(form, account)
    await setActiveEmailConfig(account.id)
  }
}, { immediate: true })

watch(() => configRef.value.accounts, (accounts) => {
  if (!accounts.length) {
    selectedId.value = NEW_ACCOUNT_KEY
    return
  }

  if (selectedId.value === NEW_ACCOUNT_KEY) {
    return
  }

  if (!accounts.some(account => account.id === selectedId.value)) {
    selectedId.value = configRef.value.activeId || accounts[0]?.id || NEW_ACCOUNT_KEY
  }
}, { immediate: true })

function selectPreset(presetKey: string) {
  form.preset = presetKey
  applyPreset()
}

function applyPreset() {
  const preset = EMAIL_PRESETS.find(item => item.key === form.preset)
  if (preset && preset.key !== 'custom') {
    form.host = preset.host
    form.port = preset.port
  }

  form.secure = true
}

async function handleSave() {
  const normalized = normalizeEmailConfig({ ...form, secure: true })
  await saveEmailConfig(normalized)
  selectedId.value = normalized.id
  savedMsg.value = t('settingSaveSuccess', '设置已保存')
  window.setTimeout(() => {
    savedMsg.value = ''
  }, 2500)
}

async function handleRemove() {
  if (!canRemoveAccount.value || selectedId.value === NEW_ACCOUNT_KEY) {
    return
  }
  await removeEmailConfig(selectedId.value)
  selectedId.value = configRef.value.activeId
    || configRef.value.accounts[0]?.id
    || NEW_ACCOUNT_KEY
}
</script>

<style lang="scss">
.postman-setting {
  &__inline {
    display: grid;
    grid-template-columns: 1fr minmax(100px, 120px) auto;
    gap: 12px;
    align-items: end;
  }
}

.postman-account-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  align-items: center;
}

.postman-preset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
}

.postman-preset-card {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px;
  border: 1px solid var(--pm-border);
  border-radius: 14px;
  background: var(--pm-surface-elevated);
  color: var(--pm-text);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease, transform 0.15s ease;

  &:hover {
    border-color: var(--pm-border-strong);
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: none;
    border-color: color-mix(in srgb, var(--pm-accent) 46%, var(--pm-border) 54%);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--pm-accent) 12%, transparent);
  }

  &--active {
    border-color: color-mix(in srgb, var(--pm-accent) 54%, var(--pm-border) 46%);
    background: color-mix(in srgb, var(--pm-accent) 5%, var(--pm-surface-elevated) 95%);
  }

  &__icon-shell {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 42px;
    height: 42px;
    border-radius: 12px;
    background: color-mix(in srgb, var(--pm-field-bg) 88%, white 12%);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pm-border) 85%, transparent);
    overflow: hidden;
    flex-shrink: 0;
  }

  &__icon {
    width: 24px;
    height: 24px;
    object-fit: contain;
  }

  &__content {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 4px;
  }

  &__title {
    font-size: 14px;
    line-height: 1.4;
  }

  &__host {
    font-size: 12px;
    line-height: 1.4;
    color: var(--pm-text-muted);
    word-break: break-all;
  }

  &__check {
    width: 14px;
    height: 14px;
    border: 2px solid var(--pm-border);
    border-radius: 50%;
    flex-shrink: 0;
    transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
  }

  &--active &__check {
    border-color: var(--pm-accent);
    background: var(--pm-accent);
    box-shadow: inset 0 0 0 2px var(--pm-surface-elevated);
  }
}

.postman-field--compact {
  min-width: 0;
}

.postman-password-wrap {
  position: relative;
  display: block;
}

.postman-password-input {
  padding-right: 40px;
}

.postman-password-toggle {
  position: absolute;
  top: 50%;
  right: 8px;
  transform: translateY(-50%);
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--pm-text-muted);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;

  &:hover {
    background: color-mix(in srgb, var(--pm-accent) 10%, transparent);
    color: var(--pm-text-secondary);
  }
}

.postman-http-section {
  padding-bottom: 16px;
  margin-bottom: 4px;
  border-bottom: 1px solid var(--pm-border);

  &__header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }

  &__title {
    font-size: 15px;
    font-weight: 600;
    color: var(--pm-text);
    margin: 0;
  }

  &__badge {
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--pm-accent) 12%, transparent);
    color: var(--pm-accent);
    font-weight: 600;
  }

  &__desc {
    font-size: 13px;
    color: var(--pm-text-secondary);
    margin: 0 0 12px;
    line-height: 1.5;
  }

  &__hint {
    font-size: 12px;
    color: var(--pm-text-muted);
    margin-top: 4px;
  }
}

.postman-ssl-tag {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 38px;
  padding: 0 14px;
  border-radius: var(--pm-radius-md);
  border: 1px solid var(--pm-border);
  background: var(--pm-surface-elevated);
  color: var(--pm-text-secondary);
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}
</style>
