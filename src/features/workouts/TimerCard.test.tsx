// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { emptyState } from '@/lib/shared'
import { useStore } from '@/state/store'
import { TimerCard } from './TimerCard'

// pick() writes restSeconds into the global store — reset it between tests.
beforeEach(() => {
  useStore.setState({ data: emptyState() })
})

afterEach(() => cleanup())

describe('custom seconds entry', () => {
  it('accepts a value whose first digit is below the 5-second minimum (e.g. 45)', () => {
    render(<TimerCard />)
    const input = screen.getByRole('textbox', { name: 'Custom seconds' })

    // Each keystroke must survive in the field — committing waits for blur.
    fireEvent.change(input, { target: { value: '4' } })
    expect(input).toHaveValue('4')
    fireEvent.change(input, { target: { value: '45' } })
    fireEvent.blur(input)

    expect(input).toHaveValue('45')
    expect(screen.getByRole('timer', { name: 'Time remaining' })).toHaveTextContent('0:45')
  })

  it('drops an out-of-range draft on blur without committing', () => {
    render(<TimerCard />)
    const input = screen.getByRole('textbox', { name: 'Custom seconds' })

    fireEvent.change(input, { target: { value: '3' } })
    fireEvent.blur(input)

    expect(input).toHaveValue('')
    expect(screen.getByRole('timer', { name: 'Time remaining' })).toHaveTextContent('1:00')
  })
})
