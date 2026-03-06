<template>
  <div class="postman-setting">
    <h3 class="postman-setting__title">{{ i18n.settingTitle }}</h3>

    <!-- 预置邮箱快选 -->
    <div class="postman-setting__section">
      <div class="postman-setting-item">
        <label class="postman-setting-label">{{ i18n.settingPreset }}</label>
        <select v-model="form.preset" class="b3-select postman-select" @change="applyPreset">
          <option v-for="p in presets" :key="p.key" :value="p.key">
            {{ p.label }}
          </option>
        </select>
      </div>
    </div>

    <!-- SMTP 配置 -->
    <div class="postman-setting__section">
      <div class="postman-setting-item">
        <label class="postman-setting-label">{{ i18n.settingHost }}</label>
        <input v-model="form.host" class="b3-text-field postman-input" type="text" placeholder="smtp.example.com">
      </div>
      <div class="postman-setting-item postman-setting-item--row">
        <div class="postman-setting-item postman-setting-item--flex">
          <label class="postman-setting-label">{{ i18n.settingPort }}</label>
          <input v-model.number="form.port" class="b3-text-field postman-input postman-input--port" type="number" min="1" max="65535">
        </div>
        <div class="postman-setting-item postman-setting-item--flex postman-ssl-toggle">
          <label class="postman-setting-label">{{ i18n.settingSSL }}</label>
          <label class="postman-switch">
            <input v-model="form.secure" type="checkbox" class="postman-switch__input">
            <span class="postman-switch__track" />
          </label>
        </div>
      </div>
      <div class="postman-setting-item">
        <label class="postman-setting-label">{{ i18n.settingUser }}</label>
        <input v-model="form.user" class="b3-text-field postman-input" type="email" placeholder="your@email.com">
      </div>
      <div class="postman-setting-item">
        <label class="postman-setting-label">{{ i18n.settingPassword }}</label>
        <input v-model="form.password" class="b3-text-field postman-input" type="password" placeholder="授权码或密码">
      </div>
      <div class="postman-setting-item">
        <label class="postman-setting-label">{{ i18n.settingFrom }}</label>
        <input v-model="form.fromName" class="b3-text-field postman-input" type="text" placeholder="发件人显示名称（选填）">
      </div>
    </div>

    <!-- 保存按钮 -->
    <div class="postman-setting__footer">
      <span v-if="savedMsg" class="postman-saved-msg">✓ {{ savedMsg }}</span>
      <button class="b3-button postman-save-btn" @click="handleSave">
        {{ i18n.settingSave }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { EmailConfig } from '@/composables/useEmailConfig'
import { EMAIL_PRESETS, saveEmailConfig, useEmailConfig } from '@/composables/useEmailConfig'
import { reactive, ref } from 'vue'

defineProps<{
  i18n: Record<string, string>
}>()

const presets = EMAIL_PRESETS
const configRef = useEmailConfig()

// 创建可编辑的表单副本
const form = reactive<EmailConfig>({ ...configRef.value })

const savedMsg = ref('')

/**
 * 应用预置邮箱配置
 */
function applyPreset() {
  const preset = presets.find(p => p.key === form.preset)
  if (preset && preset.key !== 'custom') {
    form.host = preset.host
    form.port = preset.port
    form.secure = preset.secure
  }
}

/**
 * 保存设置
 */
async function handleSave() {
  await saveEmailConfig({ ...form })
  savedMsg.value = '设置已保存'
  setTimeout(() => {
    savedMsg.value = ''
  }, 2500)
}
</script>

<style lang="scss">
.postman-setting {
  padding: 8px 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 380px;

  &__title {
    font-size: 16px;
    font-weight: 600;
    color: var(--b3-theme-on-surface);
    margin: 0 0 8px;
  }

  &__section {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px;
    background: var(--b3-theme-surface-light);
    border-radius: var(--b3-border-radius);
    border: 1px solid var(--b3-border-color);
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
    padding-top: 4px;
  }
}

.postman-setting-item {
  display: flex;
  flex-direction: column;
  gap: 4px;

  &--row {
    flex-direction: row;
    align-items: flex-start;
    gap: 16px;
  }

  &--flex {
    flex: 1;
  }
}

.postman-ssl-toggle {
  flex: 0 0 auto;
  align-items: center;
  flex-direction: column;
}

.postman-setting-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--b3-theme-on-surface-light);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.postman-select,
.postman-input {
  width: 100%;
  box-sizing: border-box;
  font-size: 14px;
}

.postman-input--port {
  width: 80px;
}

.postman-saved-msg {
  font-size: 13px;
  color: var(--b3-theme-success);
}

.postman-save-btn {
  min-width: 96px;
}

/* 自定义开关样式 */
.postman-switch {
  position: relative;
  display: inline-flex;
  align-items: center;
  cursor: pointer;

  &__input {
    opacity: 0;
    width: 0;
    height: 0;
    position: absolute;

    &:checked + .postman-switch__track {
      background-color: var(--b3-theme-primary);
    }

    &:checked + .postman-switch__track::after {
      transform: translateX(18px);
    }
  }

  &__track {
    position: relative;
    width: 38px;
    height: 20px;
    background-color: var(--b3-border-color);
    border-radius: 10px;
    transition: background-color 0.2s;

    &::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #fff;
      transition: transform 0.2s;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }
  }
}
</style>
