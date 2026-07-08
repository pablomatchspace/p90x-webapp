// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ErrorBoundary } from '@/components/ErrorBoundary'

afterEach(() => cleanup())

/** A child that always throws during render, to trip the boundary. */
function Boom({ label }: { label: string }): ReactNode {
  throw new Error(label)
}

describe('ErrorBoundary', () => {
  it('renders its children untouched when nothing throws', () => {
    render(
      <ErrorBoundary>
        <p>all good</p>
      </ErrorBoundary>,
    )
    expect(screen.queryByText('all good')).not.toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('shows a non-destructive recovery card when a child throws', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary>
        <Boom label="kaboom" />
      </ErrorBoundary>,
    )
    const alert = screen.getByRole('alert')
    expect(alert.textContent).toContain('Something went wrong')
    expect(alert.textContent).toContain('kaboom')
    expect(alert.textContent).toContain('export') // points at export/restore, never wipes
    // default (non-inline) variant offers a reload, not the in-place retry
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Reload app' })).not.toBeNull()
    spy.mockRestore()
  })

  it('offers an in-place retry in inline mode', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary inline>
        <Boom label="page crashed" />
      </ErrorBoundary>,
    )
    const retry = screen.getByRole('button', { name: 'Try again' })
    // retry re-renders the children (which throw again), so the card stays up —
    // proving the reset path runs without unmounting the surrounding shell.
    fireEvent.click(retry)
    expect(screen.getByRole('alert').textContent).toContain('page crashed')
    spy.mockRestore()
  })
})
