/**
 * E23: per-workout media deeplinks. The athlete pastes a video and/or audio URL
 * for each routine in Settings; the Today card and workout screens then offer
 * an "open in a new tab" launch button. Only absolute http(s) URLs are ever
 * stored or rendered — anything else (javascript:, data:, relative paths…)
 * is rejected at every layer, so a pasted link can never run script in the app.
 */

export type MediaKind = 'video' | 'audio'

export const MEDIA_KINDS: readonly MediaKind[] = ['video', 'audio']

export const MEDIA_KIND_LABELS: Record<MediaKind, string> = {
  video: 'Video',
  audio: 'Audio',
}

/** True when `raw` parses as an absolute URL with an http or https scheme. */
export function isHttpUrl(raw: string): boolean {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return false
  }
  return url.protocol === 'http:' || url.protocol === 'https:'
}

export type LinkParse =
  | { ok: true; url: string | null } // null = cleared (empty input)
  | { ok: false }

/**
 * Interpret a settings-field value: blank clears the link, a valid http(s) URL
 * stores it trimmed, anything else is invalid (kept out of state entirely so
 * the UI can flag it without half-saving).
 */
export function parseLinkInput(raw: string): LinkParse {
  const trimmed = raw.trim()
  if (trimmed === '') return { ok: true, url: null }
  return isHttpUrl(trimmed) ? { ok: true, url: trimmed } : { ok: false }
}
