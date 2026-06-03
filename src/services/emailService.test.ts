import assert from 'node:assert/strict'
import test from 'node:test'

import { shouldUseHttpEmailRoute } from './emailRoute.ts'

test('desktop uses SMTP by default and HTTP only when desktop Resend is enabled', () => {
  assert.equal(shouldUseHttpEmailRoute(true, undefined), false)
  assert.equal(shouldUseHttpEmailRoute(true, { useResendOnDesktop: false }), false)
  assert.equal(shouldUseHttpEmailRoute(true, { useResendOnDesktop: true }), true)
})

test('non-desktop always uses HTTP email route', () => {
  assert.equal(shouldUseHttpEmailRoute(false, undefined), true)
})
