import { describe, expect, it } from 'vitest'
import { formatAppVersion } from './version'

describe('formatAppVersion (E16/Q20, bug counter)', () => {
  it('maps E16 package semver to product display format, defaulting to B00', () => {
    expect(formatAppVersion('1.16.112')).toBe('1.E16.U112.B00')
  })

  it('appends the zero-padded bug-release counter from the -bN suffix', () => {
    expect(formatAppVersion('1.20.128-b1')).toBe('1.E20.U128.B01')
    expect(formatAppVersion('1.20.128-b3')).toBe('1.E20.U128.B03')
    expect(formatAppVersion('1.20.128-b12')).toBe('1.E20.U128.B12')
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
