import { Stack } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { AppButton, InlineNotice } from '../../../shared/ui/index.ts'
import type { GameSetupCellMediaErrorKey } from '../use-game-setup-cell-media.ts'
import type { GameSetupResetErrorKey } from '../use-game-setup-draft.ts'
import type { GameSetupSaveErrorKey } from '../use-game-setup-save.ts'

interface GameSetupBoardNoticesProps {
  remoteChangeNotice: boolean
  onDismissRemoteChange: () => void
  onReloadFromServer: () => void
  saveErrorMessage: GameSetupSaveErrorKey | null
  resetErrorMessage: GameSetupResetErrorKey | null
  cellMediaErrorKey: GameSetupCellMediaErrorKey | null
  onDismissCellMediaError: () => void
}

export function GameSetupBoardNotices({
  remoteChangeNotice,
  onDismissRemoteChange,
  onReloadFromServer,
  saveErrorMessage,
  resetErrorMessage,
  cellMediaErrorKey,
  onDismissCellMediaError,
}: GameSetupBoardNoticesProps) {
  const { t } = useTranslation()
  const hasNotices =
    remoteChangeNotice ||
    saveErrorMessage !== null ||
    resetErrorMessage !== null ||
    cellMediaErrorKey !== null

  if (!hasNotices) {
    return null
  }

  return (
    <Stack spacing={2} sx={{ mt: 2 }}>
      {remoteChangeNotice ? (
        <InlineNotice
          severity="warning"
          onClose={onDismissRemoteChange}
          action={
            <AppButton tone="ghost" size="small" onClick={onReloadFromServer}>
              {t('gameSetup.reloadFromServer')}
            </AppButton>
          }
        >
          {t('gameSetup.remoteChangeNotice')}
        </InlineNotice>
      ) : null}

      {saveErrorMessage ? (
        <InlineNotice severity="error">
          {saveErrorMessage === 'saveFailed'
            ? t('gameSetup.saveFailed')
            : t(`gameSetup.${saveErrorMessage}`)}
        </InlineNotice>
      ) : null}

      {resetErrorMessage ? (
        <InlineNotice severity="error">{t('gameSetup.resetFailed')}</InlineNotice>
      ) : null}

      {cellMediaErrorKey ? (
        <InlineNotice severity="error" onClose={onDismissCellMediaError}>
          {t(`gameSetup.cellMedia.errors.${cellMediaErrorKey}`)}
        </InlineNotice>
      ) : null}
    </Stack>
  )
}
