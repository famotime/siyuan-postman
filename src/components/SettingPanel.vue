<template>
  <section class="postman-setting postman-shell">
    <header class="postman-shell__hero">
      <span class="postman-shell__stamp">SMTP</span>
      <p class="postman-shell__eyebrow">SMTP 邮路控制台</p>
      <h3 class="postman-shell__title">邮递员设置</h3>
      <p class="postman-shell__subtitle">为思源文档配置稳定、清晰的邮件投递通道。</p>

      <div class="postman-shell__route">
        <span class="postman-shell__route-stop">{{ currentPresetLabel }}</span>
        <span class="postman-shell__route-dot" />
        <span class="postman-shell__route-stop">{{ securityLabel }}</span>
        <span class="postman-shell__route-dot" />
        <span class="postman-shell__route-stop">端口 {{ form.port || 465 }}</span>
      </div>
    </header>

    <section class="postman-card postman-card--striped">
      <div class="postman-card__head">
        <div>
          <p class="postman-card__eyebrow">邮箱服务商</p>
          <h4 class="postman-card__title">预设邮箱</h4>
        </div>
        <p class="postman-card__hint">选择常用邮箱预设，或切换到自定义 SMTP。</p>
      </div>

      <label class="postman-field">
        <span class="postman-field__label">预设邮箱</span>
        <span class="postman-select-wrap">
          <select v-model="form.preset" class="b3-select postman-control" @change="applyPreset">
            <option v-for="preset in presets" :key="preset.key" :value="preset.key">
              {{ preset.label }}
            </option>
          </select>
        </span>
        <span class="postman-field__tip">预设会自动填入服务器、端口和加密方式。</span>
      </label>
    </section>

    <section class="postman-card">
      <div class="postman-card__head">
        <div>
          <p class="postman-card__eyebrow">账号信息</p>
          <h4 class="postman-card__title">投递凭据</h4>
        </div>
        <p class="postman-card__hint">凭据仅保存在当前设备的插件数据中，不会上传到仓库。</p>
      </div>

      <div class="postman-setting__stack">
        <label class="postman-field">
          <span class="postman-field__label">SMTP 服务器</span>
          <input v-model="form.host" class="b3-text-field postman-control" type="text" placeholder="smtp.example.com">
          <span class="postman-field__tip">例如：QQ 邮箱使用 `smtp.qq.com`，自定义服务请填写完整 SMTP 域名。</span>
        </label>

        <div class="postman-setting__inline">
          <label class="postman-field postman-field--compact">
            <span class="postman-field__label">端口</span>
            <input v-model.number="form.port" class="b3-text-field postman-control" type="number" min="1" max="65535">
            <span class="postman-field__tip">常见端口为 465（SSL/TLS）或 587（STARTTLS）。</span>
          </label>

          <div class="postman-toggle-card postman-toggle-card--inline">
            <div class="postman-toggle-card__top">
              <div class="postman-toggle-card__copy">
                <span class="postman-field__label">加密方式</span>
                <strong class="postman-toggle-card__value">{{ securityLabel }}</strong>
              </div>
              <label class="postman-switch">
                <input v-model="form.secure" type="checkbox" class="postman-switch__input">
                <span class="postman-switch__track" />
              </label>
            </div>
            <p class="postman-toggle-card__hint">{{ securityHint }}</p>
          </div>
        </div>

        <label class="postman-field">
          <span class="postman-field__label">用户名（邮箱地址）</span>
          <input v-model="form.user" class="b3-text-field postman-control" type="email" placeholder="you@example.com">
          <span class="postman-field__tip">填写完整发件邮箱地址，通常与 SMTP 登录账号一致。</span>
        </label>

        <label class="postman-field">
          <span class="postman-field__label">授权码 / 密码</span>
          <input v-model="form.password" class="b3-text-field postman-control" type="password" placeholder="授权码或邮箱密码">
          <span class="postman-field__tip">QQ、163 等邮箱通常需要填写授权码，而不是网页登录密码。</span>
        </label>

        <label class="postman-field">
          <span class="postman-field__label">发件人名称（可选）</span>
          <input v-model="form.fromName" class="b3-text-field postman-control" type="text" placeholder="邮件中显示的发件人名称">
          <span class="postman-field__tip">可填写昵称、团队名或品牌名；留空时默认使用邮箱地址。</span>
        </label>
      </div>
    </section>

    <footer class="postman-setting__footer">
      <div class="postman-setting__footer-copy">
        <div v-if="savedMsg" class="postman-status postman-status--success">
          <span class="postman-status__dot" />
          <span>{{ savedMsg }}</span>
        </div>
        <p class="postman-setting__hint">保存后再执行邮件发送，可减少投递失败。</p>
      </div>

      <button class="b3-button postman-btn postman-btn--primary postman-btn--wide" @click="handleSave">
        <span class="postman-btn__label">保存设置</span>
      </button>
    </footer>
  </section>
</template>

<script setup lang="ts">
import type { EmailConfig } from '@/composables/useEmailConfig'
import { EMAIL_PRESETS, saveEmailConfig, useEmailConfig } from '@/composables/useEmailConfig'
import { computed, reactive, ref } from 'vue'

const configRef = useEmailConfig()
const form = reactive<EmailConfig>({ ...configRef.value })
const savedMsg = ref('')

const presetLabelMap: Record<string, string> = {
  qq: 'QQ 邮箱',
  '163': '163 邮箱',
  '189': '189 邮箱',
  '139': '139 邮箱',
  outlook: 'Outlook',
  gmail: 'Gmail',
  custom: '自定义',
}

const presets = computed(() => {
  return EMAIL_PRESETS.map(preset => ({
    ...preset,
    label: presetLabelMap[preset.key] || preset.label,
  }))
})

const currentPresetLabel = computed(() => {
  return presets.value.find(preset => preset.key === form.preset)?.label || '自定义'
})

const securityLabel = computed(() => {
  return form.secure ? 'SSL/TLS' : 'STARTTLS'
})

const securityHint = computed(() => {
  return form.secure
    ? '从握手开始即建立加密通道。'
    : '连接成功后再升级为加密通道。'
})

function applyPreset() {
  const preset = EMAIL_PRESETS.find(item => item.key === form.preset)
  if (preset && preset.key !== 'custom') {
    form.host = preset.host
    form.port = preset.port
    form.secure = preset.secure
  }
}

async function handleSave() {
  await saveEmailConfig({ ...form })
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
    grid-template-columns: minmax(0, 180px) minmax(0, 1fr);
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
