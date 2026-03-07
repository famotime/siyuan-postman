<template>
  <section class="postman-setting postman-panel">
    <header class="postman-panel-header">
      <div class="postman-panel-header__main">
        <h3 class="postman-panel-header__title">{{ t('settingTitle', '邮递员设置') }}</h3>
        <p class="postman-panel-header__subtitle">{{ t('settingSubtitle', '配置 SMTP 与发件人信息，用于发送思源文档。') }}</p>
      </div>

      <span class="postman-badge">SSL/TLS</span>
    </header>

    <div class="postman-summary-grid">
      <article class="postman-summary-card">
        <span class="postman-summary-card__label">{{ t('settingPreset', '预设邮箱') }}</span>
        <strong class="postman-summary-card__value">{{ currentPresetLabel }}</strong>
        <span class="postman-summary-card__hint">{{ t('settingPresetHint', '可选常用邮箱，也可切换为自定义 SMTP。') }}</span>
      </article>

      <article class="postman-summary-card">
        <span class="postman-summary-card__label">{{ t('settingSecurityLabel', '连接加密') }}</span>
        <strong class="postman-summary-card__value">{{ t('settingSecuritySslLabel', 'SSL/TLS') }}</strong>
        <span class="postman-summary-card__hint">{{ t('settingSecuritySslHint', '当前仅支持 SSL/TLS 加密连接。') }}</span>
      </article>

      <article class="postman-summary-card" :class="{ 'postman-summary-card--warning': !isConfigComplete }">
        <span class="postman-summary-card__label">{{ t('settingStatusLabel', '配置状态') }}</span>
        <strong class="postman-summary-card__value">{{ isConfigComplete ? t('settingStatusReady', '已完成') : t('settingStatusIncomplete', '未完成') }}</strong>
        <span class="postman-summary-card__hint">{{ t('settingRelayHint', '凭据仅保存在当前插件数据中。') }}</span>
      </article>
    </div>

    <div class="postman-setting__layout">
      <section class="postman-card">
        <div class="postman-card__head">
          <div>
            <h4 class="postman-card__title">{{ t('settingPreset', '预设邮箱') }}</h4>
          </div>
          <p class="postman-card__hint">{{ t('settingPresetHint', '可选常用邮箱，也可切换为自定义 SMTP。') }}</p>
        </div>

        <label class="postman-field">
          <span class="postman-field__label">{{ t('settingPreset', '预设邮箱') }}</span>
          <span class="postman-select-wrap">
            <select v-model="form.preset" class="b3-select postman-control" @change="applyPreset">
              <option v-for="preset in presets" :key="preset.key" :value="preset.key">
                {{ preset.label }}
              </option>
            </select>
          </span>
        </label>
      </section>

      <section class="postman-card">
        <div class="postman-card__head">
          <div>
            <h4 class="postman-card__title">{{ t('settingRelayTitle', 'SMTP 账号') }}</h4>
          </div>
          <p class="postman-card__hint">{{ t('settingRelayHint', '凭据仅保存在当前插件数据中。') }}</p>
        </div>

        <div class="postman-setting__stack">
          <div class="postman-setting__inline">
            <label class="postman-field">
              <span class="postman-field__label">{{ t('settingHost', 'SMTP 服务器') }}</span>
              <input v-model="form.host" class="b3-text-field postman-control" type="text" placeholder="smtp.example.com">
            </label>

            <label class="postman-field postman-field--compact">
              <span class="postman-field__label">{{ t('settingPort', '端口') }}</span>
              <input v-model.number="form.port" class="b3-text-field postman-control" type="number" min="1" max="65535">
            </label>

            <div class="postman-security-card">
              <span class="postman-security-card__label">{{ t('settingSecurityLabel', '连接加密') }}</span>
              <strong class="postman-security-card__value">{{ t('settingSecuritySslLabel', 'SSL/TLS') }}</strong>
              <p class="postman-security-card__hint">{{ t('settingSecuritySslHint', '当前仅支持 SSL/TLS 加密连接。') }}</p>
            </div>
          </div>

          <label class="postman-field">
            <span class="postman-field__label">{{ t('settingUser', '用户名（邮箱地址）') }}</span>
            <input v-model="form.user" class="b3-text-field postman-control" type="email" placeholder="you@example.com">
          </label>

          <label class="postman-field">
            <span class="postman-field__label">{{ t('settingPassword', '授权码 / 密码') }}</span>
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
      </section>
    </div>

    <footer class="postman-actions">
      <div class="postman-actions__copy">
        <p class="postman-actions__hint">{{ t('settingSaveHint', '保存后再执行邮件发送，可减少投递失败。') }}</p>
        <div v-if="savedMsg" class="postman-status postman-status--success">
          <span class="postman-status__dot" />
          <span>{{ savedMsg }}</span>
        </div>
      </div>

      <button class="b3-button postman-btn postman-btn--primary postman-btn--wide" @click="handleSave">
        <span class="postman-btn__label">{{ t('settingSave', '保存设置') }}</span>
      </button>
    </footer>
  </section>
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

const currentPresetLabel = computed(() => {
  return presets.value.find(preset => preset.key === form.preset)?.label || t('presetCustom', '自定义')
})

const isConfigComplete = computed(() => {
  return Boolean(form.host && form.user && form.password)
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
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;

  &__layout,
  &__stack {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  &__inline {
    display: grid;
    grid-template-columns: minmax(0, 1.5fr) minmax(120px, 148px) minmax(220px, 1fr);
    gap: 14px;
    align-items: stretch;
  }
}

.postman-field--compact {
  min-width: 0;
}

.postman-security-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  padding: 14px 16px;
  border-radius: var(--pm-radius-md);
  border: 1px solid var(--pm-border);
  background: var(--pm-surface-elevated);

  &__label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: var(--pm-text-muted);
    text-transform: uppercase;
  }

  &__value {
    font-size: 15px;
    line-height: 1.3;
    color: var(--pm-text);
  }

  &__hint {
    margin: 0;
    font-size: 12px;
    line-height: 1.55;
    color: var(--pm-text-secondary);
  }
}

@media (max-width: 720px) {
  .postman-setting {
    &__inline {
      grid-template-columns: 1fr;
    }
  }
}
</style>
