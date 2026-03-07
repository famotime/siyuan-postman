import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('attachment mode sanitizes markdown before sendEmail', () => {
  const source = readFileSync(new URL('./SendMailDialog.vue', import.meta.url), 'utf8')

  assert.match(source, /import\s+\{\s*sanitizeMarkdownForEmail\s*\}\s+from\s+['"]@\/services\/markdownToEmailHtml['"]/)
  assert.match(source, /mdContent\s*=\s*sanitizeMarkdownForEmail\(\s*result\.content\s*\)/)
})

test('dialog uses last successful recipients as default and persists them on success', () => {
  const source = readFileSync(new URL('./SendMailDialog.vue', import.meta.url), 'utf8')

  assert.match(source, /import\s+\{\s*saveEmailConfig,\s*useEmailConfig\s*\}\s+from\s+['"]@\/composables\/useEmailConfig['"]/)
  assert.match(source, /const\s+toInput\s*=\s*ref\(emailConfig\.value\.lastTo\s*\|\|\s*''\)/)
  assert.match(source, /watch\(\(\)\s*=>\s*emailConfig\.value\.lastTo,\s*\(value\)\s*=>\s*\{/)
  assert.match(source, /const\s+lastToValue\s*=\s*toList\.join\(', '\)/)
  assert.match(source, /await\s+saveEmailConfig\(\{\s*\.\.\.config,\s*lastTo:\s*lastToValue,\s*hasSentSuccessfully:\s*true,\s*\}\)/)
})

test('dialog parses recipients with both Chinese and English commas', () => {
  const source = readFileSync(new URL('./SendMailDialog.vue', import.meta.url), 'utf8')

  assert.match(source, /function\s+parseRecipientList\s*\(input:\s*string\)/)
  assert.match(source, /\.split\(\/\[，,\]\/\)/)
  assert.match(source, /const\s+toList\s*=\s*parseRecipientList\(toInput\.value\)/)
})
