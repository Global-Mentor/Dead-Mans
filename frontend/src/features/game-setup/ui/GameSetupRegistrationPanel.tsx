import { Alert, Stack, Typography } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameSetupSnapshot } from '../../../shared/api/contracts/index.ts'
import { hasPanelCapability } from '../../../shared/auth/panel-capabilities.ts'
import { useAuth } from '../../../shared/auth/use-auth.ts'
import { AppButton, ConfirmDialog } from '../../../shared/ui/index.ts'
import { useOpenGameRegistration } from '../use-open-game-registration.ts'

interface Props {
  snapshot: GameSetupSnapshot
  isDirty: boolean
  isSaving: boolean
  isResetting: boolean
  hasPendingMedia: boolean
  remoteChangeNotice: boolean
  onBusyChange: (busy: boolean) => void
  onReloadFromServer: () => Promise<void>
}

export function GameSetupRegistrationPanel(props: Props) {
  const { user } = useAuth()
  return hasPanelCapability('gameSetup', user?.roles) ? (
    <RegistrationPanelContent {...props} />
  ) : null
}

function RegistrationPanelContent({
  snapshot,
  isDirty,
  isSaving,
  isResetting,
  hasPendingMedia,
  remoteChangeNotice,
  onBusyChange,
  onReloadFromServer,
}: Props) {
  const { t } = useTranslation()
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const inFlight = useRef(false)
  const reload = useMutation({ mutationFn: onReloadFromServer })
  const { currentGame, isOpening, openRegistration, errorKey } =
    useOpenGameRegistration(onBusyChange)
  const blocker = currentGame.isPending
    ? 'checking'
    : currentGame.isError
      ? 'checkFailed'
      : ['ready', 'active'].includes(currentGame.data?.status ?? '')
        ? 'currentGame'
        : isSaving || isResetting || hasPendingMedia || reload.isPending
          ? 'busy'
          : remoteChangeNotice
            ? 'remoteChanges'
            : isDirty
              ? 'unsaved'
              : null

  return (
    <Stack spacing={1.5}>
      <Typography component="h2" variant="h6">
        {t('gameSetup.registration.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {t('gameSetup.registration.description')}
      </Typography>
      <Typography variant="body2">
        {t('gameSetup.registration.summary', {
          cards: snapshot.cells.length,
          modifiers: snapshot.enabledModifierIds.length,
          questions: snapshot.enabledQuestionIds.length,
        })}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {t('gameSetup.registration.questionsOptional')}
      </Typography>
      {blocker ? (
        <Alert severity="info">{t(`gameSetup.registration.blockers.${blocker}`)}</Alert>
      ) : null}
      {currentGame.isError ? (
        <AppButton tone="secondary" onClick={() => void currentGame.refetch()}>
          {t('gameSetup.registration.retry')}
        </AppButton>
      ) : null}
      {errorKey ? (
        <Alert severity="error">{t(`gameSetup.registration.errors.${errorKey}`)}</Alert>
      ) : null}
      {reload.isError ? <Alert severity="error">{t('gameSetup.errorLoading')}</Alert> : null}
      {remoteChangeNotice || errorKey === 'stale' || errorKey === 'missingDraft' ? (
        <AppButton
          tone="secondary"
          disabled={reload.isPending || isOpening}
          onClick={() => reload.mutate()}
        >
          {t('gameSetup.reloadFromServer')}
        </AppButton>
      ) : null}
      <AppButton
        fullWidth
        disabled={blocker !== null || isOpening}
        onClick={() => setIsConfirmOpen(true)}
      >
        {t('gameSetup.registration.open')}
      </AppButton>
      <ConfirmDialog
        open={isConfirmOpen}
        title={t('gameSetup.registration.confirmTitle')}
        description={
          <Stack spacing={2}>
            <span>{t('gameSetup.registration.confirmDescription', { title: snapshot.title })}</span>
            {blocker ? (
              <Alert severity="info">{t(`gameSetup.registration.blockers.${blocker}`)}</Alert>
            ) : null}
          </Stack>
        }
        confirmLabel={t('gameSetup.registration.confirm')}
        cancelLabel={t('gameSetup.registration.cancel')}
        isBusy={isOpening}
        confirmDisabled={blocker !== null}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={() => {
          if (blocker || inFlight.current) return
          inFlight.current = true
          openRegistration(
            { gameId: snapshot.gameId, expectedVersion: snapshot.version },
            {
              onSettled: () => {
                inFlight.current = false
                setIsConfirmOpen(false)
              },
            },
          )
        }}
      />
    </Stack>
  )
}
