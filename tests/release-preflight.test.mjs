import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import JSZip from 'jszip'

const projectRoot = process.cwd()
const packageZipPath = path.join(projectRoot, 'package.zip')
const readmePath = path.join(projectRoot, 'README.md')
const iconPath = path.join(projectRoot, 'icon.png')
const previewPath = path.join(projectRoot, 'preview.png')

test('release package includes Bazaar root files', async () => {
  const zipBuffer = await readFile(packageZipPath)
  const zip = await JSZip.loadAsync(zipBuffer)
  const rootEntries = ['README.md', 'plugin.json', 'icon.png', 'preview.png', 'index.js']

  for (const entry of rootEntries) {
    assert.ok(zip.file(entry), `missing ${entry} in package.zip`)
  }
})

test('README uses GitHub raw URLs for screenshots', async () => {
  const readme = await readFile(readmePath, 'utf8')
  const imageLinks = [...readme.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map(match => match[1])

  assert.ok(imageLinks.length > 0, 'README should include screenshots')
  for (const link of imageLinks) {
    assert.match(
      link,
      /^https:\/\/raw\.githubusercontent\.com\/famotime\/siyuan-postman\/main\/assets\/.+/u,
      `screenshot link must use GitHub raw URL: ${link}`,
    )
  }
})

test('release artwork stays within Bazaar size guidance', async () => {
  const icon = await stat(iconPath)
  const preview = await stat(previewPath)

  assert.ok(icon.size < 20 * 1024, `icon.png is too large: ${icon.size} bytes`)
  assert.ok(preview.size <= 200 * 1024, `preview.png is too large: ${preview.size} bytes`)
})

test('source files do not ship console logging', async () => {
  const sourceFiles = [
    'src/App.vue',
    'src/composables/useEmailConfig.ts',
    'src/index.ts',
    'src/main.ts',
    'src/components/SendMailDialog.vue',
    'src/services/emailService.ts',
  ]

  for (const relativePath of sourceFiles) {
    const fullPath = path.join(projectRoot, relativePath)
    const source = await readFile(fullPath, 'utf8')
    assert.doesNotMatch(source, /console\.(log|debug|info|warn|error)/u, `${relativePath} contains console logging`)
  }
})
