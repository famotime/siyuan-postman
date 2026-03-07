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
        <input
          v-model="form.password"
          class="b3-text-field postman-control"
          type="password"
          :placeholder="t('settingPasswordPlaceholder', '授权码或邮箱密码')"
        >
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
