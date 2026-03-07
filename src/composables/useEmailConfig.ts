/**
 * 邮件配置的 composable，管理 SMTP 设置和预置邮箱列表
 */
import type { Plugin } from 'siyuan'
import { ref } from 'vue'

/** 邮箱预置配置类型 */
export interface EmailPreset {
  key: string
  label: string
  host: string
  port: number
  secure: boolean // 目前固定为 SSL/TLS
}

/** 用户 SMTP 配置类型 */
export interface EmailConfig {
  preset: string
  host: string
  port: number
  secure: boolean
  user: string
  password: string
  fromName: string
  lastTo: string
  hasSentSuccessfully: boolean
}

/** 预置邮箱列表 */
export const EMAIL_PRESETS: EmailPreset[] = [
  { key: 'qq', label: 'QQ 邮箱', host: 'smtp.qq.com', port: 465, secure: true },
  { key: '163', label: '163 邮箱', host: 'smtp.163.com', port: 465, secure: true },
  { key: '189', label: '189 邮箱', host: 'smtp.189.cn', port: 465, secure: true },
  { key: '139', label: '139 邮箱', host: 'smtp.139.com', port: 465, secure: true },
  { key: 'gmail', label: 'Gmail', host: 'smtp.gmail.com', port: 465, secure: true },
  { key: 'custom', label: '自定义', host: '', port: 465, secure: true },
]

/** 默认配置 */
const DEFAULT_CONFIG: EmailConfig = {
  preset: 'custom',
  host: '',
  port: 465,
  secure: true,
  user: '',
  password: '',
  fromName: '',
  lastTo: '',
  hasSentSuccessfully: false,
}

const CONFIG_KEY = 'postman-smtp-config.json'

const SUPPORTED_PRESET_KEYS = new Set(EMAIL_PRESETS.map(preset => preset.key))

export function normalizeEmailConfig(config?: Partial<EmailConfig> | null): EmailConfig {
  const normalizedConfig: EmailConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    secure: true,
    lastTo: typeof config?.lastTo === 'string' ? config.lastTo : DEFAULT_CONFIG.lastTo,
    hasSentSuccessfully: Boolean(config?.hasSentSuccessfully),
  }

  if (!SUPPORTED_PRESET_KEYS.has(normalizedConfig.preset)) {
    normalizedConfig.preset = 'custom'
  }

  return normalizedConfig
}

/** 全局配置状态（响应式）*/
const emailConfig = ref<EmailConfig>(normalizeEmailConfig())

let pluginRef: Plugin | null = null

/**
 * 绑定插件实例（用于 loadData/saveData）
 */
export function bindPlugin(plugin: Plugin) {
  pluginRef = plugin
}

/**
 * 从插件存储加载配置
 */
export async function loadEmailConfig(): Promise<EmailConfig> {
  if (!pluginRef) return { ...DEFAULT_CONFIG }
  try {
    const data = await pluginRef.loadData(CONFIG_KEY)
    if (data && typeof data === 'object') {
      // 合并默认配置，兼容旧版本字段缺失
      emailConfig.value = normalizeEmailConfig(data as Partial<EmailConfig>)
    }
  }
  catch (e) {
    console.warn('[siyuan-postman] 加载配置失败，使用默认值', e)
  }
  return emailConfig.value
}

/**
 * 保存配置到插件存储
 */
export async function saveEmailConfig(config: EmailConfig): Promise<void> {
  if (!pluginRef) return
  const normalizedConfig = normalizeEmailConfig(config)
  emailConfig.value = normalizedConfig
  await pluginRef.saveData(CONFIG_KEY, normalizedConfig)
}

/**
 * 获取当前配置（响应式引用）
 */
export function useEmailConfig() {
  return emailConfig
}
