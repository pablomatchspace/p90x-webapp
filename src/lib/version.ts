/**
 * Display version policy from E16/Q20, extended with the bug-release counter.
 *
 * Historical releases keep their existing semver display. E16 onward maps the
 * package semver `1.{epic}.{story}` to the product-facing `1.E{epic}.U{story}`,
 * with an optional `-bN` prerelease suffix for bug-fix-only releases mapped to
 * a zero-padded `.B{NN}` suffix (no suffix in package.json means `B00` — the
 * story just shipped, nothing fixed against it yet).
 */
export function formatAppVersion(version: string): string {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-b(\d+))?$/.exec(version)
  if (match === null) return version
  const [, major, minor, patch, bug] = match
  const epic = Number(minor)
  if (epic < 16) return version
  const bugNumber = bug === undefined ? 0 : Number(bug)
  return `${major}.E${epic}.U${Number(patch)}.B${String(bugNumber).padStart(2, '0')}`
}
