<template>
    <section class="postman-card postman-card--striped">
      <div class="postman-card__head">
        <div>
          <h4 class="postman-card__title">预设邮箱</h4>
        </div>
      </div>

      <label class="postman-field">
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
          <h4 class="postman-card__title">账号信息</h4>
        </div>
        <p class="postman-card__hint">账号信息仅保存在本地插件数据中，不会上传。</p>
      </div>

      <div class="postman-setting__stack">
        <div class="postman-setting__inline">
          <label class="postman-field">
            <span class="postman-field__label">SMTP 服务器</span>
            <input v-model="form.host" class="b3-text-field postman-control" type="text" placeholder="smtp.example.com">
          </label>

          <label class="postman-field postman-field--compact">
            <span class="postman-field__label">端口</span>
            <input v-model.number="form.port" class="b3-text-field postman-control" type="number" min="1" max="65535">
          </label>

          <div class="postman-toggle-card postman-toggle-card--inline">
            <div class="postman-toggle-card__copy">
              <span class="postman-field__label">加密方式</span>
              <strong class="postman-toggle-card__value">SSL/TLS</strong>
            </div>
          </div>
        </div>

        <label class="postman-field">
          <span class="postman-field__label">用户名（邮箱地址）</span>
          <input v-model="form.user" class="b3-text-field postman-control" type="email" placeholder="you@example.com">
        </label>

        <label class="postman-field">
          <span class="postman-field__label">授权码 / 密码（QQ、163 等邮箱通常需要填写授权码，而不是网页登录密码）</span>
          <input v-model="form.password" class="b3-text-field postman-control" type="password" placeholder="授权码或邮箱密码">
        </label>

        <label class="postman-field">
          <span class="postman-field__label">发件人名称（可选）</span>
          <input v-model="form.fromName" class="b3-text-field postman-control" type="text" placeholder="邮件中显示的发件人名称">
        </label>
      </div>
    </section>

    <footer class="postman-setting__footer">
      <div class="postman-setting__footer-copy">
        <div v-if="savedMsg" class="postman-status postman-status--success">
          <span class="postman-status__dot" />
          <span>{{ savedMsg }}</span>
        </div>
      </div>

      <button class="b3-button postman-btn postman-btn--primary postman-btn--wide" @click="handleSave">
        <span class="postman-btn__label">保存设置</span>
      </button>
    </footer>
</template>

<script setup lang="ts">
import type { EmailConfig } from '@/composables/useEmailConfig'
import { EMAIL_PRESETS, saveEmailConfig, useEmailConfig } from '@/composables/useEmailConfig'
import { computed, reactive, ref } from 'vue'

const configRef = useEmailConfig()
const form = reactive<EmailConfig>({ ...configRef.value, secure: true })
const savedMsg = ref('')

const presetLabelMap: Record<string, string> = {
  qq: 'QQ 邮箱',
  '163': '163 邮箱',
  '189': '189 邮箱',
  '139': '139 邮箱',
  gmail: 'Gmail',
  custom: '自定义',
}

const presets = computed(() => {
  return EMAIL_PRESETS.map(preset => ({
    ...preset,
    label: presetLabelMap[preset.key] || preset.label,
  }))
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
  savedMsg.value = '设置已保存'
  window.setTimeout(() => {
    savedMsg.value = ''
  }, 2500)
}
</script>

<style lang="scss">
.postman-setting {
  min-width: 560px;
  display: flex;
  flex-direction: column;
  gap: 18px;

  &__stack {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  &__inline {
    display: grid;
    grid-template-columns: minmax(0, 1.8fr) minmax(120px, 160px) minmax(180px, 0.9fr);
    gap: 14px;
    align-items: stretch;
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  &__footer-copy {
    display: flex;
    flex-direction: column;
    gap: 10px;
    flex: 1;
  }

  &__hint {
    margin: 0;
    font-size: 12px;
    line-height: 1.6;
    color: var(--pm-muted);
  }
}

.postman-field--compact {
  min-width: 0;
}

.postman-toggle-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 16px;
  border-radius: var(--pm-radius-md);
  border: 1px solid color-mix(in srgb, var(--pm-accent-blue) 14%, var(--pm-border) 86%);
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--pm-accent-blue) 8%, transparent), transparent 58%),
    color-mix(in srgb, var(--pm-panel) 90%, white 10%);
  box-shadow: inset 0 1px 0 color-mix(in srgb, white 45%, transparent);

  &--inline {
    min-height: 100%;
  }

  &__top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  &__copy {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__value {
    font-family: var(--pm-sans);
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 0.02em;
    color: var(--pm-text);
  }

  &__hint {
    margin: 0;
    font-size: 12px;
    line-height: 1.6;
    color: var(--pm-muted);
  }
}

@media (max-width: 720px) {
  .postman-setting {
    min-width: 0;

    &__inline {
      grid-template-columns: 1fr;
    }

    &__footer {
      flex-direction: column;
      align-items: stretch;
    }
  }
}
</style>
