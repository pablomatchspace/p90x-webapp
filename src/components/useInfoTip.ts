import { useId, useState } from 'react'

export interface InfoTipState {
  open: boolean
  toggle: () => void
  close: () => void
  panelId: string
}

export function useInfoTip(): InfoTipState {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  return {
    open,
    toggle: () => setOpen((value) => !value),
    close: () => setOpen(false),
    panelId,
  }
}
