// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { FFMI_CEILING, ffmiSummary } from '@/lib/body'
import { bodyFraction, kg, meters } from '@/lib/shared'
import { FfmiScale } from './FfmiCard'

afterEach(cleanup)

const summary = ffmiSummary(
  {
    height: meters(1.65),
    startWeight: kg(68),
    startBodyFat: bodyFraction(0.2),
    targets: { leanMassIncrease: null, bodyFat: null, ffmi: 24 },
  },
  [
    {
      date: '2026-02-01',
      weight: kg(69),
      bodyFat: bodyFraction(0.17),
      water: null,
      bone: null,
      zoneMinutes: null,
    },
  ],
)

describe('FfmiScale', () => {
  it('draws one segment per sourced band and the start / current / target markers', () => {
    const { container } = render(<FfmiScale summary={summary} gender="male" />)
    for (const key of ['low', 'below', 'above', 'athletic', 'beyond']) {
      expect(container.querySelector(`[data-band="${key}"]`)).not.toBeNull()
    }
    for (const kind of ['start', 'current', 'target']) {
      expect(container.querySelector(`[data-marker="${kind}"]`)).not.toBeNull()
    }
  })

  it('describes the values to assistive tech', () => {
    render(<FfmiScale summary={summary} gender="male" />)
    expect(screen.getByRole('img').getAttribute('aria-label')).toMatch(
      /Current FFMI 21\.95, Athletic, start 20\.9, target 24$/,
    )
  })

  it('marks the natural ceiling for women only', () => {
    const { container, rerender } = render(<FfmiScale summary={summary} gender="female" />)
    const tick = container.querySelector('[data-marker="ceiling"]')
    expect(tick?.getAttribute('title')).toContain(String(FFMI_CEILING.female))
    rerender(<FfmiScale summary={summary} gender="male" />)
    expect(container.querySelector('[data-marker="ceiling"]')).toBeNull()
  })

  it('omits markers for values it does not have', () => {
    const empty = ffmiSummary(
      {
        height: meters(1.65),
        startWeight: null,
        startBodyFat: null,
        targets: { leanMassIncrease: null, bodyFat: null, ffmi: null },
      },
      [],
    )
    const { container } = render(<FfmiScale summary={empty} gender="male" />)
    expect(container.querySelector('[data-marker]')).toBeNull()
  })
})
