import { Box, Stack } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AppButton,
  ConfirmDialog,
  FormSelect,
  FormTextField,
  HelpTooltip,
} from '../../../shared/ui/index.ts'
import type { TechnicalCancelRoundInput } from '../use-start-game-round.ts'
import type { GameRoundDetails } from '../model/game-management-panel.ts'

type TechnicalReasonCode = TechnicalCancelRoundInput['reasonCode']

const reasonCodes: readonly TechnicalReasonCode[] = [
  'external_game_failure',
  'stream_or_infrastructure_failure',
  'application_error',
  'operator_error',
  'other',
]

export function RoundSafetyControls({
  activeRound,
  isBusy,
  onRebuild,
  onTechnicalCancel,
}: {
  activeRound: GameRoundDetails
  isBusy: boolean
  onRebuild: (input: { roundId: string; expectedRoundVersion: number }) => void
  onTechnicalCancel: (input: TechnicalCancelRoundInput) => void
}) {
  const { t } = useTranslation()
  const [isRebuildConfirmOpen, setIsRebuildConfirmOpen] = useState(false)
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false)
  const [reasonCode, setReasonCode] = useState<TechnicalReasonCode>('external_game_failure')
  const [internalDetail, setInternalDetail] = useState('')
  const [publicSummary, setPublicSummary] = useState('')
  const normalizedDetail = internalDetail.trim()
  const normalizedSummary = publicSummary.trim()
  const requiresPublicSummary = reasonCode === 'other'
  const canSubmitCancellation =
    normalizedDetail.length > 0 && (!requiresPublicSummary || normalizedSummary.length > 0)

  return (
    <Stack spacing={1}>
      {activeRound.status === 'preparing' ? (
        <>
          <AppButton
            tone="dangerSecondary"
            size="small"
            disabled={isBusy}
            onClick={() => setIsRebuildConfirmOpen(true)}
          >
            <HelpTooltip
              placement="left"
              describeChild
              title={t('gameBoard.roundPanelRebuildHelp')}
            >
              <Box component="span" tabIndex={0}>
                {t('gameBoard.roundPanelRebuild')}
              </Box>
            </HelpTooltip>
          </AppButton>
        </>
      ) : null}

      <FormSelect
        label={t('gameBoard.roundPanelTechnicalReason')}
        value={reasonCode}
        disabled={isBusy}
        onChange={setReasonCode}
        options={reasonCodes.map((code) => ({
          value: code,
          label: t(`gameBoard.technicalCancelReasons.${code}`),
        }))}
      />
      <FormTextField
        multiline
        minRows={1}
        required
        label={t('gameBoard.roundPanelTechnicalDetail')}
        value={internalDetail}
        disabled={isBusy}
        inputProps={{ maxLength: 2000 }}
        onChange={(event) => setInternalDetail(event.target.value)}
      />
      {requiresPublicSummary ? (
        <FormTextField
          required
          label={t('gameBoard.roundPanelTechnicalPublicSummary')}
          value={publicSummary}
          disabled={isBusy}
          inputProps={{ maxLength: 500 }}
          onChange={(event) => setPublicSummary(event.target.value)}
        />
      ) : null}
      <AppButton
        tone="dangerSecondary"
        size="small"
        disabled={isBusy || !canSubmitCancellation}
        onClick={() => setIsCancelConfirmOpen(true)}
      >
        {t('gameBoard.roundPanelTechnicalCancel')}
      </AppButton>

      <ConfirmDialog
        open={isRebuildConfirmOpen}
        title={t('gameBoard.roundPanelRebuildConfirmTitle')}
        confirmDisabled={activeRound.status !== 'preparing'}
        description={t('gameBoard.roundPanelRebuildConfirmDescription')}
        confirmLabel={t('gameBoard.roundPanelRebuild')}
        cancelLabel={t('common.actions.cancel')}
        confirmTone="danger"
        isBusy={isBusy}
        onClose={() => setIsRebuildConfirmOpen(false)}
        onConfirm={() => {
          if (activeRound.status !== 'preparing') return
          setIsRebuildConfirmOpen(false)
          onRebuild({
            roundId: activeRound.roundId,
            expectedRoundVersion: activeRound.roundVersion,
          })
        }}
      />
      <ConfirmDialog
        open={isCancelConfirmOpen}
        title={t('gameBoard.roundPanelTechnicalCancelConfirmTitle')}
        description={t('gameBoard.roundPanelTechnicalCancelConfirmDescription')}
        confirmLabel={t('gameBoard.roundPanelTechnicalCancel')}
        cancelLabel={t('common.actions.cancel')}
        confirmTone="danger"
        isBusy={isBusy}
        onClose={() => setIsCancelConfirmOpen(false)}
        onConfirm={() => {
          if (!canSubmitCancellation) return
          setIsCancelConfirmOpen(false)
          onTechnicalCancel({
            roundId: activeRound.roundId,
            expectedRoundVersion: activeRound.roundVersion,
            reasonCode,
            publicSummary: normalizedSummary || null,
            internalDetail: normalizedDetail,
          })
        }}
      />
    </Stack>
  )
}
