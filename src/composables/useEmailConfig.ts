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
  id: string
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

export interface EmailConfigState {
  activeId: string | null
  accounts: EmailConfig[]
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
  id: '',
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

export const EMAIL_CONFIG_STORAGE_KEY = 'postman-smtp-config.json'

const SUPPORTED_PRESET_KEYS = new Set(EMAIL_PRESETS.map(preset => preset.key))

function createConfigId() {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).slice(2, 8)
  return `acct_${timestamp}_${random}`
}

function resolveConfigId(id?: string | null): string {
  if (typeof id === 'string' && id.trim()) {
    return id.trim()
  }
  return createConfigId()
}

export function normalizeEmailConfig(config?: Partial<EmailConfig> | null): EmailConfig {
  const normalizedConfig: EmailConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    id: resolveConfigId(config?.id ?? null),
    secure: true,
    lastTo: typeof config?.lastTo === 'string' ? config.lastTo : DEFAULT_CONFIG.lastTo,
    hasSentSuccessfully: Boolean(config?.hasSentSuccessfully),
  }

  if (!SUPPORTED_PRESET_KEYS.has(normalizedConfig.preset)) {
    normalizedConfig.preset = 'custom'
  }

  return normalizedConfig
}

function normalizeEmailConfigState(data?: unknown): EmailConfigState {
  if (data && typeof data === 'object') {
    const raw = data as { accounts?: unknown; activeId?: unknown }
    if (Array.isArray(raw.accounts)) {
      const accounts = raw.accounts
        .filter(item => item && typeof item === 'object')
        .map(item => normalizeEmailConfig(item as Partial<EmailConfig>))

      const activeId = typeof raw.activeId === 'string' ? raw.activeId : null
      const resolvedActiveId = accounts.some(account => account.id === activeId)
        ? activeId
        : accounts[0]?.id ?? null

      return {
        activeId: resolvedActiveId,
        accounts,
      }
    }

    const legacy = data as Partial<EmailConfig>
    if (typeof legacy.host === 'string' || typeof legacy.user === 'string' || typeof legacy.preset === 'string') {
      const account = normalizeEmailConfig(legacy)
      return {
        activeId: account.id,
        accounts: [account],
      }
    }
  }

  return {
    activeId: null,
    accounts: [],
  }
}

export function resolveActiveEmailConfig(state: EmailConfigState): EmailConfig | null {
  if (!state.accounts.length) return null
  return state.accounts.find(account => account.id === state.activeId) || state.accounts[0] || null
}

/** 全局配置状态（响应式）*/
const emailConfig = ref<EmailConfigState>(normalizeEmailConfigState())

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
export async function loadEmailConfig(): Promise<EmailConfigState> {
  if (!pluginRef) return normalizeEmailConfigState()
  try {
    const data = await pluginRef.loadData(EMAIL_CONFIG_STORAGE_KEY)
    emailConfig.value = normalizeEmailConfigState(data)
  }
  catch {
    emailConfig.value = normalizeEmailConfigState()
  }
  return emailConfig.value
}

/**
 * 保存配置到插件存储
 */
export async function saveEmailConfig(config: EmailConfig): Promise<void> {
  const normalizedConfig = normalizeEmailConfig(config)
  const accounts = emailConfig.value.accounts.slice()
  const existingIndex = accounts.findIndex(account => account.id === normalizedConfig.id)

  if (existingIndex >= 0) {
    accounts[existingIndex] = normalizedConfig
  }
  else {
    accounts.push(normalizedConfig)
  }

  const nextState: EmailConfigState = {
    activeId: normalizedConfig.id,
    accounts,
  }

  emailConfig.value = nextState

  if (pluginRef) {
    await pluginRef.saveData(EMAIL_CONFIG_STORAGE_KEY, nextState)
  }
}

export async function removeEmailConfig(id: string): Promise<void> {
  const accounts = emailConfig.value.accounts.filter(account => account.id !== id)
  const nextActiveId = accounts.find(account => account.id === emailConfig.value.activeId)?.id
    || accounts[0]?.id
    || null

  const nextState: EmailConfigState = {
    activeId: nextActiveId,
    accounts,
  }

  emailConfig.value = nextState

  if (pluginRef) {
    await pluginRef.saveData(EMAIL_CONFIG_STORAGE_KEY, nextState)
  }
}

export async function setActiveEmailConfig(id: string): Promise<void> {
  if (!emailConfig.value.accounts.some(account => account.id === id)) return
  if (emailConfig.value.activeId === id) return

  const nextState: EmailConfigState = {
    ...emailConfig.value,
    activeId: id,
  }

  emailConfig.value = nextState

  if (pluginRef) {
    await pluginRef.saveData(EMAIL_CONFIG_STORAGE_KEY, nextState)
  }
}

/**
 * 获取当前配置（响应式引用）
 */
export function useEmailConfig() {
  return emailConfig
}
