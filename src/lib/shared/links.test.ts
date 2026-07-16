import { describe, expect, it } from 'vitest'
import { applyWorkoutLink, isHttpUrl, parseLinkInput } from './links'

describe('isHttpUrl', () => {
  it('accepts absolute http and https URLs', () => {
    expect(isHttpUrl('https://example.com/plyo.mp4')).toBe(true)
    expect(isHttpUrl('http://nas.local:8096/video/12')).toBe(true)
    expect(isHttpUrl('https://youtu.be/abc?t=90')).toBe(true)
  })

  it('rejects every non-http(s) scheme — nothing script-capable can be stored', () => {
    expect(isHttpUrl('javascript:alert(1)')).toBe(false)
    expect(isHttpUrl('data:text/html,<script>1</script>')).toBe(false)
    expect(isHttpUrl('vbscript:x')).toBe(false)
    expect(isHttpUrl('file:///etc/passwd')).toBe(false)
    expect(isHttpUrl('ftp://host/x')).toBe(false)
  })

  it('rejects relative paths and plain text', () => {
    expect(isHttpUrl('example.com/video')).toBe(false)
    expect(isHttpUrl('/videos/plyo.mp4')).toBe(false)
    expect(isHttpUrl('not a url')).toBe(false)
    expect(isHttpUrl('')).toBe(false)
  })
})

describe('parseLinkInput', () => {
  it('treats blank input as an explicit clear', () => {
    expect(parseLinkInput('')).toEqual({ ok: true, url: null })
    expect(parseLinkInput('   ')).toEqual({ ok: true, url: null })
  })

  it('trims and accepts valid URLs', () => {
    expect(parseLinkInput('  https://example.com/x.mp3 ')).toEqual({
      ok: true,
      url: 'https://example.com/x.mp3',
    })
  })

  it('flags invalid input instead of clearing or storing it', () => {
    expect(parseLinkInput('example.com/x')).toEqual({ ok: false })
    expect(parseLinkInput('javascript:alert(1)')).toEqual({ ok: false })
  })
})

describe('applyWorkoutLink', () => {
  it('sets, replaces and clears links, dropping empty workouts and rejecting non-http urls', () => {
    const links: Record<string, { video?: string; audio?: string }> = {}
    applyWorkoutLink(links, 'chest-back', 'video', 'https://example.com/v')
    expect(links['chest-back']).toEqual({ video: 'https://example.com/v' })
    applyWorkoutLink(links, 'chest-back', 'video', 'javascript:alert(1)')
    expect(links['chest-back']).toEqual({ video: 'https://example.com/v' })
    applyWorkoutLink(links, 'chest-back', 'video', null)
    expect(links['chest-back']).toBeUndefined()
    applyWorkoutLink(links, 'no-such-workout', 'video', 'https://example.com/v')
    expect(links['no-such-workout']).toBeUndefined()
  })
})
