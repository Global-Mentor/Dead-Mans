import { Box, Stack, Typography } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameSetupSnapshot } from '../../../shared/api/contracts/index.ts'
import { hasPanelCapability } from '../../../shared/auth/panel-capabilities.ts'
import { useAuth } from '../../../shared/auth/use-auth.ts'
import {
  AppButton,
  AppLinkButton,
  ChoiceLabel,
  ConfirmDialog,
  FormCheckbox,
  HelpTooltip,
  InlineNotice,
  Metric,
} from '../../../shared/ui/index.ts'
import { adminModifiersRoute, adminQuestionsRoute } from '../../../routes/app-routes.ts'
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
  const [allowWithoutModifiers, setAllowWithoutModifiers] = useState(false)
  const [allowWithoutQuestions, setAllowWithoutQuestions] = useState(false)
  const missingMedia = snapshot.cells.filter((cell) => !cell.media?.length).length
  const missingModifiers = snapshot.enabledModifierIds.length === 0
  const missingQuestions = snapshot.enabledQuestionIds.length === 0
  const hasRequiredMedia = snapshot.cells.length > 0 && missingMedia === 0
  const acknowledged =
    (!missingModifiers || allowWithoutModifiers) && (!missingQuestions || allowWithoutQuestions)
  const inFlight = useRef(false)
  const confirmationContent = useRef<HTMLDivElement>(null)
  const reload = useMutation({ mutationFn: onReloadFromServer })
  const { currentGame, isOpening, openRegistration, errorKey, resetError } =
    useOpenGameRegistration(onBusyChange)
  useEffect(() => {
    if (isConfirmOpen && errorKey) confirmationContent.current?.focus()
  }, [isConfirmOpen, errorKey])
  const needsReload = errorKey === 'stale' || errorKey === 'missingDraft'
  const blocker =
    isSaving || isResetting || hasPendingMedia || reload.isPending || isOpening
      ? 'busy'
      : remoteChangeNotice
        ? 'remoteChanges'
        : isDirty
          ? 'unsaved'
          : currentGame.isPending
            ? 'checking'
            : currentGame.isError
              ? 'checkFailed'
              : ['ready', 'active'].includes(currentGame.data?.status ?? '')
                ? 'currentGame'
                : null
  const disabledReason = !hasRequiredMedia
    ? t('gameSetup.registration.missingMedia', { count: missingMedia })
    : needsReload
      ? t(`gameSetup.registration.errors.${errorKey}`)
      : blocker
        ? t(`gameSetup.registration.blockers.${blocker}`)
        : ''

  return (
    <Stack spacing={1}>
      {currentGame.isError ? (
        <AppButton tone="secondary" onClick={() => void currentGame.refetch()}>
          {t('gameSetup.registration.retry')}
        </AppButton>
      ) : null}
      {errorKey && !isConfirmOpen ? (
        <InlineNotice severity="error">
          {t(`gameSetup.registration.errors.${errorKey}`)}
        </InlineNotice>
      ) : null}
      {reload.isError && !isConfirmOpen ? (
        <InlineNotice severity="error">{t('gameSetup.errorLoading')}</InlineNotice>
      ) : null}
      {!isConfirmOpen &&
      (remoteChangeNotice || errorKey === 'stale' || errorKey === 'missingDraft') ? (
        <AppButton
          tone="secondary"
          disabled={reload.isPending || isOpening}
          onClick={() => reload.mutate()}
        >
          {t('gameSetup.reloadFromServer')}
        </AppButton>
      ) : null}
      <Typography component="h2" variant="h6">
        {t('gameSetup.registration.title')}
      </Typography>
      <Stack spacing={0}>
        <Metric
          appearance="row"
          density="compact"
          label={t('gameSetup.registration.mediaLabel')}
          value={[snapshot.cells.length - missingMedia, snapshot.cells.length].join(' / ')}
        />
        <Metric
          appearance="row"
          density="compact"
          label={t('gameSetup.registration.modifiersLabel')}
          value={snapshot.enabledModifierIds.length}
        />
        <Metric
          appearance="row"
          density="compact"
          label={t('gameSetup.registration.questionsLabel')}
          value={snapshot.enabledQuestionIds.length}
        />
        <Metric
          appearance="row"
          density="compact"
          label={t('gameSetup.registration.answerDuration')}
          value={t('gameSetup.registration.durationSeconds', {
            count: snapshot.quizAnswerDurationSeconds,
          })}
        />
      </Stack>
      <Stack direction="row" spacing={1}>
        <AppLinkButton tone="secondary" to={adminModifiersRoute.fullPath} disabled={isOpening}>
          {t('gameSetup.registration.modifiersLabel')}
        </AppLinkButton>
        <AppLinkButton tone="secondary" to={adminQuestionsRoute.fullPath} disabled={isOpening}>
          {t('gameSetup.registration.questionsLabel')}
        </AppLinkButton>
      </Stack>
      <HelpTooltip title={disabledReason} describeChild>
        <Box component="span" tabIndex={disabledReason ? 0 : undefined} sx={{ display: 'block' }}>
          <AppButton
            fullWidth
            disabled={Boolean(disabledReason)}
            onClick={() => {
              resetError()
              setAllowWithoutModifiers(false)
              setAllowWithoutQuestions(false)
              setIsConfirmOpen(true)
            }}
          >
            {t('gameSetup.registration.open')}
          </AppButton>
        </Box>
      </HelpTooltip>
      <ConfirmDialog
        open={isConfirmOpen}
        title={t('gameSetup.registration.confirmTitle')}
        description={t('gameSetup.registration.confirmDescription')}
        subject={snapshot.title}
        children={
          <Stack spacing={2} ref={confirmationContent} tabIndex={-1}>
            {missingModifiers || missingQuestions ? (
              <InlineNotice severity="warning">
                {t('gameSetup.registration.emptyContentWarning')}
              </InlineNotice>
            ) : null}
            {missingModifiers ? (
              <ChoiceLabel
                control={
                  <FormCheckbox
                    checked={allowWithoutModifiers}
                    disabled={isOpening}
                    onChange={(event) => setAllowWithoutModifiers(event.target.checked)}
                  />
                }
                label={t('gameSetup.registration.allowWithoutModifiers')}
              />
            ) : null}
            {missingQuestions ? (
              <ChoiceLabel
                control={
                  <FormCheckbox
                    checked={allowWithoutQuestions}
                    disabled={isOpening}
                    onChange={(event) => setAllowWithoutQuestions(event.target.checked)}
                  />
                }
                label={t('gameSetup.registration.allowWithoutQuestions')}
              />
            ) : null}
            {errorKey === 'stale' || errorKey === 'missingDraft' ? (
              <AppButton
                tone="secondary"
                disabled={reload.isPending || isOpening}
                onClick={() => reload.mutate()}
              >
                {t('gameSetup.reloadFromServer')}
              </AppButton>
            ) : null}
            {reload.isError ? (
              <InlineNotice severity="error">{t('gameSetup.errorLoading')}</InlineNotice>
            ) : null}
            {blocker ? (
              <InlineNotice severity="info">
                {t(`gameSetup.registration.blockers.${blocker}`)}
              </InlineNotice>
            ) : null}
          </Stack>
        }
        confirmLabel={t('gameSetup.registration.confirm')}
        cancelLabel={t('gameSetup.registration.cancel')}
        isBusy={isOpening}
        errorMessage={errorKey ? t(`gameSetup.registration.errors.${errorKey}`) : null}
        confirmDisabled={blocker !== null || !hasRequiredMedia || !acknowledged || needsReload}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={() => {
          if (blocker || !hasRequiredMedia || !acknowledged || needsReload || inFlight.current)
            return
          inFlight.current = true
          openRegistration(
            {
              gameId: snapshot.gameId,
              expectedVersion: snapshot.version,
              allowWithoutModifiers,
              allowWithoutQuestions,
            },
            {
              onSuccess: () => setIsConfirmOpen(false),
              onSettled: () => {
                inFlight.current = false
              },
            },
          )
        }}
      />
    </Stack>
  )
}
