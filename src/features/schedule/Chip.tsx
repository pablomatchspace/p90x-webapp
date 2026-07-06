import type { ReactNode } from 'react'

export type ChipTone = 'green' | 'amber' | 'rose' | 'zinc'

const CHIP_TONES: Record<ChipTone, string> = {
  green: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
  amber: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
  rose: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300',
  zinc: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
}

export function Chip({ tone, children }: { tone: ChipTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${CHIP_TONES[tone]}`}
    >
      {children}
    </span>
  )
}
