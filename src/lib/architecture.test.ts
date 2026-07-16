import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Enforces docs/CONTEXT-MAP.md: the bounded contexts of src/lib, their
 * allowed-dependency DAG, and the barrel-import rules. A violation here is a
 * design decision, not a lint fix — update the context map and this test
 * together, or find a better home for the code.
 */

const SRC = path.resolve(__dirname, '..')
const LIB = path.join(SRC, 'lib')

const CONTEXTS = ['schedule', 'workouts', 'body', 'nutrition', 'rounds', 'sync', 'shared'] as const
type Context = (typeof CONTEXTS)[number]

/** From-context → contexts it may import (docs/CONTEXT-MAP.md matrix). */
const ALLOWED: Record<Context, Context[]> = {
  shared: [],
  schedule: ['shared'],
  body: ['shared'],
  workouts: ['shared', 'schedule'],
  nutrition: ['shared', 'body'],
  sync: ['shared'],
  rounds: ['shared', 'schedule', 'body', 'workouts'],
}

/** Files allowed directly under src/lib (everything else lives in a context). */
const LIB_ROOT_EXCEPTIONS = new Set(['architecture.test.ts'])

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) return walk(full)
    return /\.(ts|tsx)$/.test(name) ? [full] : []
  })
}

/** All import/export specifiers of a file: static, re-export, dynamic, side-effect. */
function importSpecifiers(file: string): string[] {
  const source = readFileSync(file, 'utf8')
  const specs: string[] = []
  for (const m of source.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]\s*\)?/g)) {
    specs.push(m[1] as string)
  }
  return specs
}

/** Context a file belongs to, or null for files outside src/lib. */
function contextOf(file: string): Context | null {
  const rel = path.relative(LIB, file)
  if (rel.startsWith('..')) return null
  const first = rel.split(path.sep)[0] as string
  return (CONTEXTS as readonly string[]).includes(first) ? (first as Context) : null
}

/** Context targeted by an import specifier, resolved for both alias and relative forms. */
function targetContext(spec: string, importer: string): { context: Context; deep: boolean } | null {
  let libRelative: string
  if (spec.startsWith('@/lib/')) {
    libRelative = spec.slice('@/lib/'.length)
  } else if (spec.startsWith('.')) {
    const resolved = path.resolve(path.dirname(importer), spec)
    const rel = path.relative(LIB, resolved)
    if (rel.startsWith('..')) return null
    libRelative = rel.split(path.sep).join('/')
  } else {
    return null
  }
  const [first, ...rest] = libRelative.split('/')
  if (!(CONTEXTS as readonly string[]).includes(first as string)) {
    throw new Error(`${path.relative(SRC, importer)} imports '${spec}' outside any bounded context`)
  }
  return { context: first as Context, deep: rest.length > 0 }
}

const srcFiles = walk(SRC)
const libFiles = srcFiles.filter((f) => !path.relative(LIB, f).startsWith('..'))
const outsideFiles = srcFiles.filter((f) => path.relative(LIB, f).startsWith('..'))

describe('bounded contexts (docs/CONTEXT-MAP.md)', () => {
  it('every domain module lives in a bounded context', () => {
    const strays = libFiles
      .filter((f) => contextOf(f) === null)
      .map((f) => path.relative(LIB, f))
      .filter((rel) => !LIB_ROOT_EXCEPTIONS.has(rel))
    expect(strays).toEqual([])
  })

  it('every context publishes a barrel (index.ts)', () => {
    const missing = CONTEXTS.filter((c) => !existsSync(path.join(LIB, c, 'index.ts')))
    expect(missing).toEqual([])
  })

  it('cross-context imports go through the barrel and respect the dependency matrix', () => {
    const violations: string[] = []
    for (const file of libFiles) {
      const from = contextOf(file)
      if (from === null) continue
      for (const spec of importSpecifiers(file)) {
        const target = targetContext(spec, file)
        if (target === null || target.context === from) continue
        const where = `${path.relative(SRC, file)} → '${spec}'`
        if (!ALLOWED[from].includes(target.context)) {
          violations.push(`${where} (edge ${from} → ${target.context} not in the matrix)`)
        } else if (target.deep) {
          violations.push(`${where} (deep import — use the '@/lib/${target.context}' barrel)`)
        }
      }
    }
    expect(violations).toEqual([])
  })

  it('within a context, modules never import their own barrel', () => {
    const violations: string[] = []
    for (const file of libFiles) {
      const from = contextOf(file)
      if (from === null) continue
      for (const spec of importSpecifiers(file)) {
        const target = targetContext(spec, file)
        if (target === null || target.context !== from) continue
        const isOwnBarrel =
          spec === `@/lib/${from}` ||
          path.resolve(path.dirname(file), spec) === path.join(LIB, from, 'index')
        if (isOwnBarrel) violations.push(`${path.relative(SRC, file)} → '${spec}'`)
      }
    }
    expect(violations).toEqual([])
  })

  it('the domain layer never imports application or UI layers', () => {
    const violations: string[] = []
    for (const file of libFiles) {
      for (const spec of importSpecifiers(file)) {
        if (/^@\/(state|features|components)\//.test(spec) || spec === 'react') {
          violations.push(`${path.relative(SRC, file)} → '${spec}'`)
        }
      }
    }
    expect(violations).toEqual([])
  })

  it('the UI layer never mutates the store directly (writes go through state/actions)', () => {
    const violations: string[] = []
    for (const file of outsideFiles) {
      const rel = path.relative(SRC, file)
      if (!/^(features|components)[/\\]/.test(rel)) continue
      const source = readFileSync(file, 'utf8')
      if (/\.getState\(\)|\.mutate\(/.test(source)) violations.push(rel)
    }
    expect(violations).toEqual([])
  })

  it('application and UI layers import contexts only through barrels', () => {
    const violations: string[] = []
    for (const file of outsideFiles) {
      for (const spec of importSpecifiers(file)) {
        if (!spec.startsWith('@/lib/')) continue
        const target = targetContext(spec, file)
        if (target !== null && target.deep) {
          violations.push(`${path.relative(SRC, file)} → '${spec}'`)
        }
      }
    }
    expect(violations).toEqual([])
  })
})
