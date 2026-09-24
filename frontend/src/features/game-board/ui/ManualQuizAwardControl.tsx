import { Stack, Typography } from '@mui/material'
import {
  AppButton,
  Combobox,
  ConfirmDialog,
  createFilterOptions,
  FormSelect,
  FormTextField,
  InlineNotice,
} from '../../../shared/ui/index.ts'

import type { FormEvent } from 'react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { components } from '../../../shared/api/contracts/generated'
type ManualQuizAwardPlayer = components['schemas']['ManualQuizAwardPlayerDto']

interface ManualQuizAwardControlProps {
  isActiveGame: boolean
  players: readonly ManualQuizAwardPlayer[]
  isLoading: boolean
  isError: boolean
  isAwarding: boolean
  onAward: (input: {
    awardedToUserId: string
    operationType: 'award' | 'deduct'
    points: number
    reason: string
    requestId: string
  }) => void
  showHeader?: boolean
}

const filterManualAwardPlayers = createFilterOptions<ManualQuizAwardPlayer>({
  limit: 30,
  stringify: (player) => `${player.displayName} ${player.login}`,
})

export function ManualQuizAwardControl({
  isActiveGame,
  players,
  isLoading,
  isError,
  isAwarding,
  onAward,
  showHeader = true,
}: ManualQuizAwardControlProps) {
  const { t } = useTranslation()
  const [selectedUserId, setSelectedUserId] = useState('')
  const [operationType, setOperationType] = useState<'award' | 'deduct'>('award')
  const [points, setPoints] = useState('')
  const [reason, setReason] = useState('')
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false)

  const selectedPlayer = players.find((player) => player.userId === selectedUserId) ?? null
  const selectedValidUserId = selectedPlayer?.userId ?? ''
  const pointsNumber = Number(points)
  const normalizedReason = reason.trim()
  const pointsDelta = operationType === 'deduct' ? -pointsNumber : pointsNumber
  const availableAfter = selectedPlayer ? selectedPlayer.availableQuizPoints + pointsDelta : null
  const exceedsAvailableBalance = operationType === 'deduct' && (availableAfter ?? 0) < 0
  const canAward =
    isActiveGame &&
    selectedValidUserId !== '' &&
    Number.isInteger(pointsNumber) &&
    pointsNumber > 0 &&
    normalizedReason.length >= 3 &&
    normalizedReason.length <= 500 &&
    !exceedsAvailableBalance &&
    !isAwarding

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!canAward) {
      return
    }

    setIsConfirmationOpen(true)
  }

  return (
    <>
      <Stack component="form" spacing={1.25} onSubmit={handleSubmit}>
        {showHeader ? (
          <>
            <Typography variant="subtitle2">{t('gameBoard.manualQuizAwardTitle')}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t('gameBoard.manualQuizAwardDescription')}
            </Typography>
          </>
        ) : null}

        {!isActiveGame ? (
          <Typography variant="body2" color="text.secondary">
            {t('gameBoard.manualQuizAwardInactive')}
          </Typography>
        ) : isLoading ? (
          <Typography variant="body2" color="text.secondary">
            {t('gameBoard.manualQuizAwardLoading')}
          </Typography>
        ) : isError ? (
          <Typography variant="body2" color="error">
            {t('gameBoard.manualQuizAwardError')}
          </Typography>
        ) : players.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {t('gameBoard.manualQuizAwardNoPlayers')}
          </Typography>
        ) : (
          <>
            <Combobox
              size="small"
              fullWidth
              autoHighlight
              selectOnFocus
              options={players}
              value={selectedPlayer}
              filterOptions={filterManualAwardPlayers}
              disabled={isAwarding}
              noOptionsText={t('gameBoard.manualQuizAwardNoPlayerMatches')}
              getOptionLabel={(player) =>
                player.login ? `${player.displayName} · ${player.login}` : player.displayName
              }
              isOptionEqualToValue={(option, value) => option.userId === value.userId}
              onChange={(_, player) => setSelectedUserId(player?.userId ?? '')}
              slotProps={{
                popper: {
                  sx: (theme) => ({
                    zIndex: theme.zIndex.modal + 1,
                  }),
                },
              }}
              renderInput={(params) => (
                <FormTextField {...params} label={t('common.entities.player')} />
              )}
            />

            <FormSelect
              label={t('gameBoard.manualQuizAwardOperationLabel')}
              value={operationType}
              disabled={isAwarding}
              onChange={setOperationType}
              options={[
                { value: 'award', label: t('gameBoard.manualQuizAwardOperationAward') },
                { value: 'deduct', label: t('gameBoard.manualQuizAwardOperationDeduct') },
              ]}
            />

            <FormTextField
              type="number"
              label={t('gameBoard.manualQuizAwardPointsLabel')}
              value={points}
              disabled={isAwarding}
              inputProps={{ min: 1, step: 1 }}
              onChange={(event) => setPoints(event.target.value)}
            />

            <FormTextField
              label={t('gameBoard.manualQuizAwardReasonLabel')}
              value={reason}
              disabled={isAwarding}
              multiline
              minRows={2}
              inputProps={{ maxLength: 500 }}
              helperText={t('gameBoard.manualQuizAwardReasonHint')}
              onChange={(event) => setReason(event.target.value)}
            />

            {selectedPlayer ? (
              <InlineNotice
                severity={exceedsAvailableBalance ? 'error' : 'info'}
                variant="outlined"
              >
                {t('gameBoard.manualQuizAwardBalancePreview', {
                  before: selectedPlayer.availableQuizPoints,
                  sign: pointsDelta >= 0 ? '+' : '−',
                  points: Number.isFinite(pointsNumber) ? Math.abs(pointsNumber) : 0,
                  after: availableAfter ?? selectedPlayer.availableQuizPoints,
                })}
              </InlineNotice>
            ) : null}

            <AppButton
              type="submit"
              disabled={!canAward}
              loading={isAwarding}
              size="small"
              sx={{ alignSelf: 'flex-start' }}
            >
              {isAwarding
                ? t('gameBoard.manualQuizAwardSaving')
                : t('gameBoard.manualQuizAwardAction')}
            </AppButton>
          </>
        )}
      </Stack>

      <ConfirmDialog
        open={isConfirmationOpen}
        title={t('gameBoard.manualQuizAwardConfirmTitle')}
        description={t('gameBoard.manualQuizAwardConfirmDescription', {
          operation: t(
            operationType === 'award'
              ? 'gameBoard.manualQuizAwardOperationAward'
              : 'gameBoard.manualQuizAwardOperationDeduct',
          ),
          player: selectedPlayer?.displayName ?? '',
          sign: pointsDelta >= 0 ? '+' : '−',
          points: Math.abs(pointsNumber),
          before: selectedPlayer?.availableQuizPoints ?? 0,
          after: availableAfter ?? 0,
          reason: normalizedReason,
        })}
        confirmLabel={t('gameBoard.manualQuizAwardConfirmAction')}
        cancelLabel={t('common.actions.cancel')}
        confirmTone={operationType === 'deduct' ? 'danger' : 'primary'}
        isBusy={isAwarding}
        onClose={() => setIsConfirmationOpen(false)}
        onConfirm={() => {
          if (!canAward) return
          onAward({
            awardedToUserId: selectedValidUserId,
            operationType,
            points: pointsNumber,
            reason: normalizedReason,
            requestId: crypto.randomUUID(),
          })
          setIsConfirmationOpen(false)
          setPoints('')
          setReason('')
        }}
      />
    </>
  )
}
