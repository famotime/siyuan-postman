import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('attachment mode sanitizes markdown before sendEmail', () => {
  const source = readFileSync(new URL('./SendMailDialog.vue', import.meta.url), 'utf8')

  assert.match(source, /import\s+\{\s*sanitizeMarkdownForEmail\s*\}\s+from\s+['"]@\/services\/markdownToEmailHtml['"]/)
  assert.match(source, /mdContent\s*=\s*sanitizeMarkdownForEmail\(\s*result\.content\s*\)/)
})
