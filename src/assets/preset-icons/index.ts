import icon139 from './139.png'
import icon163 from './163.png'
import icon189 from './189.png'
import customIcon from './custom.svg'
import gmailIcon from './gmail.png'
import qqIcon from './qq.png'

import type { EmailPresetIconKey } from '@/utils/emailPresetUi'

export const EMAIL_PRESET_ICONS: Record<EmailPresetIconKey, string> = {
  qq: qqIcon,
  '163': icon163,
  '189': icon189,
  '139': icon139,
  gmail: gmailIcon,
  custom: customIcon,
}
