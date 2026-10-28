// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { InfoPanel, InfoTip, InfoToggle } from './InfoTip'
import { useInfoTip } from './useInfoTip'

afterEach(cleanup)

function Demo() {
  const tip = useInfoTip()
  return (
    <div>
      <span>Training experience</span>
      <InfoToggle tip={tip} label="Training experience" />
      <InfoPanel tip={tip}>Years of regular lifting before this program.</InfoPanel>
    </div>
  )
}

describe('InfoTip', () => {
  it('hides the help text until the info button is pressed', () => {
    render(<Demo />)
    expect(screen.queryByText(/Years of regular lifting/)).toBeNull()
    expect(screen.getByRole('button', { name: 'More info: Training experience' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })

  it('shows the text on press and hides it again on a second press', () => {
    render(<Demo />)
    const button = screen.getByRole('button', { name: 'More info: Training experience' })
    fireEvent.click(button)
    expect(screen.getByText(/Years of regular lifting/)).toBeVisible()
    expect(button).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(button)
    expect(screen.queryByText(/Years of regular lifting/)).toBeNull()
    expect(button).toHaveAttribute('aria-expanded', 'false')
  })

  it('links the button to the panel it controls', () => {
    render(<Demo />)
    const button = screen.getByRole('button', { name: 'More info: Training experience' })
    fireEvent.click(button)
    const panel = screen.getByText(/Years of regular lifting/)
    expect(button.getAttribute('aria-controls')).toBe(panel.id)
    expect(panel.id).not.toBe('')
  })

  it('closes on Escape so keyboard users are never stuck with it open', () => {
    render(<Demo />)
    const button = screen.getByRole('button', { name: 'More info: Training experience' })
    fireEvent.click(button)
    fireEvent.keyDown(button, { key: 'Escape' })
    expect(screen.queryByText(/Years of regular lifting/)).toBeNull()
    expect(button).toHaveAttribute('aria-expanded', 'false')
  })

  it('keeps each tip independent', () => {
    render(
      <>
        <Demo />
        <Demo />
      </>,
    )
    const [first, second] = screen.getAllByRole('button', {
      name: 'More info: Training experience',
    })
    fireEvent.click(first)
    expect(screen.getAllByText(/Years of regular lifting/)).toHaveLength(1)
    expect(second).toHaveAttribute('aria-expanded', 'false')
  })

  it('InfoTip renders the toggle where the layout puts it and the panel after', () => {
    render(
      <InfoTip label="Units" help="Stored values never change.">
        {(toggle) => <h2>Units {toggle}</h2>}
      </InfoTip>,
    )
    const button = screen.getByRole('button', { name: 'More info: Units' })
    expect(button.closest('h2')).not.toBeNull()
    expect(screen.queryByText('Stored values never change.')).toBeNull()
    fireEvent.click(button)
    expect(screen.getByText('Stored values never change.')).toBeVisible()
  })
})
