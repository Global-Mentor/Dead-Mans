import { Alert } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { AppButton } from '../../../shared/ui/index.ts'
import type { GameSetupResetErrorKey } from '../use-game-setup-draft.ts'
import type { GameSetupSaveErrorKey } from '../use-game-setup-save.ts'

interface GameSetupBoardNoticesProps {
  remoteChangeNotice: boolean
  onDismissRemoteChange: () => void
  onReloadFromServer: () => void
  saveErrorMessage: GameSetupSaveErrorKey | null
  resetErrorMessage: GameSetupResetErrorKey | null
  cellMediaErrorMessage: string | null
  onDismissCellMediaError: () => void
}

export function GameSetupBoardNotices({
  remoteChangeNotice,
  onDismissRemoteChange,
  onReloadFromServer,
  saveErrorMessage,
  resetErrorMessage,
  cellMediaErrorMessage,
  onDismissCellMediaError,
}: GameSetupBoardNoticesProps) {
  const { t } = useTranslation()

  return (
    <>
      {remoteChangeNotice ? (
        <Alert
          severity="warning"
          sx={{ mt: 2 }}
          onClose={onDismissRemoteChange}
          action={
            <AppButton tone="ghost" size="small" onClick={onReloadFromServer}>
              {t('gameSetup.reloadFromServer')}
            </AppButton>
          }
        >
          {t('gameSetup.remoteChangeNotice')}
        </Alert>
      ) : null}

      {saveErrorMessage ? (
        <Alert severity="error" sx={{ mt: 2 }}>
          {saveErrorMessage === 'saveFailed'
            ? t('gameSetup.saveFailed')
            : t(`gameSetup.${saveErrorMessage}`)}
        </Alert>
      ) : null}

      {resetErrorMessage ? (
        <Alert severity="error" sx={{ mt: 2 }}>
          {t('gameSetup.resetFailed')}
        </Alert>
      ) : null}

      {cellMediaErrorMessage ? (
        <Alert severity="error" sx={{ mt: 2 }} onClose={onDismissCellMediaError}>
          {cellMediaErrorMessage}
        </Alert>
      ) : null}
    </>
  )
}
