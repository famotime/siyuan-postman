<template>
  <div class="postman-setting">
    <div class="postman-form">
      <label class="postman-field">
        <span class="postman-field__label">{{ t('settingPreset', '预设邮箱') }}</span>
        <span class="postman-select-wrap">
          <select
            v-model="form.preset"
            class="b3-select postman-control"
            @change="applyPreset"
          >
            <option
              v-for="preset in presets"
              :key="preset.key"
              :value="preset.key"
            >
              {{ preset.label }}
            </option>
          </select>
        </span>
      </label>

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
import type { EmailConfig } from '@/composables/useEmailConfig'
import { EMAIL_PRESETS, saveEmailConfig, useEmailConfig } from '@/composables/useEmailConfig'
import { computed, reactive, ref } from 'vue'

const props = defineProps<{
  i18n: Record<string, string>
}>()

const configRef = useEmailConfig()
const form = reactive<EmailConfig>({ ...configRef.value, secure: true })
const savedMsg = ref('')
const showPassword = ref(false)

const t = (key: string, fallback: string) => props.i18n[key] || fallback

const presetLabelKeyMap: Record<string, string> = {
  qq: 'presetQQ',
  '163': 'presetNetease163',
  '189': 'presetChina189',
  '139': 'presetChina139',
  gmail: 'presetGmail',
  custom: 'presetCustom',
}

const presets = computed(() => {
  return EMAIL_PRESETS.map((preset) => {
    const labelKey = presetLabelKeyMap[preset.key]

    return {
      ...preset,
      label: labelKey ? t(labelKey, preset.label) : preset.label,
    }
  })
})

function applyPreset() {
  const preset = EMAIL_PRESETS.find(item => item.key === form.preset)
  if (preset && preset.key !== 'custom') {
    form.host = preset.host
    form.port = preset.port
  }

  form.secure = true
}

async function handleSave() {
  await saveEmailConfig({ ...form, secure: true })
  savedMsg.value = t('settingSaveSuccess', '设置已保存')
  window.setTimeout(() => {
    savedMsg.value = ''
  }, 2500)
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
