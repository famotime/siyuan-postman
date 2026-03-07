import assert from 'node:assert/strict'
import test from 'node:test'

import { EMAIL_PRESETS } from '../composables/useEmailConfig.ts'
import { EMAIL_PRESET_UI_META, getPresetHostCaption, resolveActivePreset } from './emailPresetUi.ts'

test('every email preset exposes label and icon metadata for the UI', () => {
  for (const preset of EMAIL_PRESETS) {
    const meta = EMAIL_PRESET_UI_META[preset.key]

    assert.ok(meta, `missing preset UI metadata for ${preset.key}`)
    assert.ok(meta.labelKey, `missing label key for ${preset.key}`)
    assert.ok(meta.iconKey, `missing icon key for ${preset.key}`)
  }
})

test('preset host caption falls back to manual hint for custom preset', () => {
  assert.equal(getPresetHostCaption({ host: 'smtp.qq.com' }, 'Manual setup'), 'smtp.qq.com')
  assert.equal(getPresetHostCaption({ host: '' }, 'Manual setup'), 'Manual setup')
})

test('active preset falls back to known host when config preset is custom', () => {
  assert.equal(resolveActivePreset('custom', 'smtp.gmail.com').key, 'gmail')
  assert.equal(resolveActivePreset('qq', '').key, 'qq')
})
