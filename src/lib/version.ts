/**
 * Display version policy from E16/Q20.
 *
 * Historical releases keep their existing semver display. E16 onward maps the
 * package semver `1.{epic}.{story}` to the product-facing `1.E{epic}.U{story}`.
 */
export function formatAppVersion(version: string): string {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version)
  if (match === null) return version
  const [, major, minor, patch] = match
  const epic = Number(minor)
  if (epic < 16) return version
  return `${major}.E${epic}.U${Number(patch)}`
}
