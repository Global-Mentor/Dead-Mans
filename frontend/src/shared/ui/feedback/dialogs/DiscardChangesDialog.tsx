import { useTranslation } from 'react-i18next'
import { ConfirmDialog } from './ConfirmDialog.tsx'

export function DiscardChangesDialog({
  open,
  busy = false,
  onClose,
  onDiscard,
}: {
  open: boolean
  busy?: boolean
  onClose: () => void
  onDiscard: () => void
}) {
  const { t } = useTranslation()
  return (
    <ConfirmDialog
      open={open}
      isBusy={busy}
      title={t('common.discardChanges.title')}
      description={t('common.discardChanges.description')}
      confirmLabel={t('common.discardChanges.confirm')}
      cancelLabel={t('common.actions.cancel')}
      confirmTone="danger"
      onClose={onClose}
      onConfirm={onDiscard}
    />
  )
}
