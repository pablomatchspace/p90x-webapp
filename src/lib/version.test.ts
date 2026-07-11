import { describe, expect, it } from 'vitest'
import { formatAppVersion } from './version'

describe('formatAppVersion (E16/Q20)', () => {
  it('maps E16 package semver to product display format', () => {
    expect(formatAppVersion('1.16.112')).toBe('1.E16.U112')
  })

  it('keeps historical versions unchanged', () => {
    expect(formatAppVersion('1.5.1')).toBe('1.5.1')
    expect(formatAppVersion('1.15.999')).toBe('1.15.999')
  })

  it('leaves malformed version strings untouched', () => {
    expect(formatAppVersion('dev')).toBe('dev')
    expect(formatAppVersion('1.16.112-beta')).toBe('1.16.112-beta')
  })
})
