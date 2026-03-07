import { EMAIL_PRESETS, type EmailPreset } from '../composables/useEmailConfig.ts'

export type EmailPresetIconKey = 'qq' | '163' | '189' | '139' | 'gmail' | 'custom'

export interface EmailPresetUiMeta {
  labelKey: string
  iconKey: EmailPresetIconKey
}

export const EMAIL_PRESET_UI_META: Record<string, EmailPresetUiMeta> = {
  qq: { labelKey: 'presetQQ', iconKey: 'qq' },
  '163': { labelKey: 'presetNetease163', iconKey: '163' },
  '189': { labelKey: 'presetChina189', iconKey: '189' },
  '139': { labelKey: 'presetChina139', iconKey: '139' },
  gmail: { labelKey: 'presetGmail', iconKey: 'gmail' },
  custom: { labelKey: 'presetCustom', iconKey: 'custom' },
}

export function getPresetHostCaption(preset: Pick<EmailPreset, 'host'>, fallback: string) {
  return preset.host || fallback
}

export function resolveActivePreset(presetKey: string, host: string): EmailPreset {
  return EMAIL_PRESETS.find(item => item.key === presetKey && item.key !== 'custom')
    || EMAIL_PRESETS.find(item => item.key !== 'custom' && item.host === host)
    || EMAIL_PRESETS.find(item => item.key === presetKey)
    || EMAIL_PRESETS.find(item => item.key === 'custom')
    || EMAIL_PRESETS[EMAIL_PRESETS.length - 1]
}
