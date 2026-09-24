import { useState } from 'react'

export function useDirtyClose({
  dirty,
  busy,
  onClose,
}: {
  dirty: boolean
  busy: boolean
  onClose: () => void
}) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  return {
    confirmOpen,
    requestClose: () => {
      if (busy) return
      if (dirty) setConfirmOpen(true)
      else onClose()
    },
    keepEditing: () => setConfirmOpen(false),
    discard: () => {
      if (busy) return
      setConfirmOpen(false)
      onClose()
    },
  }
}
