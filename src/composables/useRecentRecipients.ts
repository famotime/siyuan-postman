import { ref } from 'vue'
import { getPluginRef } from './useEmailConfig'

const STORAGE_KEY = 'postman-recent-recipients.json'
const MAX_RECENT = 5

const recentRecipients = ref<string[]>([])
let loaded = false

export async function initRecentRecipients(): Promise<string[]> {
  if (loaded) return recentRecipients.value
  loaded = true
  const plugin = getPluginRef()
  if (!plugin) return recentRecipients.value
  try {
    const data = await plugin.loadData(STORAGE_KEY)
    if (Array.isArray(data)) {
      recentRecipients.value = data.filter(item => typeof item === 'string').slice(0, MAX_RECENT)
    }
  }
  catch {
    // ignore
  }
  return recentRecipients.value
}

export function getRecentRecipients(): string[] {
  return recentRecipients.value
}

export function addRecentRecipients(emails: string[]): string[] {
  const merged = [...emails, ...recentRecipients.value]
  const unique: string[] = []
  for (const email of merged) {
    if (!unique.includes(email)) {
      unique.push(email)
    }
    if (unique.length >= MAX_RECENT) break
  }
  recentRecipients.value = unique
  const plugin = getPluginRef()
  if (plugin) {
    plugin.saveData(STORAGE_KEY, unique).catch(() => {})
  }
  return unique
}
