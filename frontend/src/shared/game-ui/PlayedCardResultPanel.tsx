import { ItemCard } from '../ui/index.ts'
import { Metric } from '../ui/index.ts'
import { StatusBadge } from '../ui/index.ts'
import { Box, Stack, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import type { components } from '../api/contracts/generated'
import {
  formatPlayedCardModifierOutcomeStatus,
  getPlayedCardModifierOutcomeColor,
  normalizePlayedCardModifierOutcomeStatus,
} from '../lib/played-card-formatters.ts'
import { ParticipantNamesList } from './ParticipantNamesList.tsx'
import { RoundScoreBreakdown } from './RoundScoreBreakdown.tsx'

type PlayedCardPreviewRound = components['schemas']['GameHistoryRoundItemDto']
type PlayedCardPreviewModifier = PlayedCardPreviewRound['modifiers'][number]

interface PlayedCardModifierGroup {
  groupKey: string
  modifierId: string
  modifierName: string
  modifierDescription: string
  count: number
  scoreDelta: number
  killDelta: number
  outcomeStatuses: readonly PlayedCardModifierOutcomeSummary[]
  multiplierAppliedValues: readonly number[]
  definitionRevision: number | null
  violationComments: readonly string[]
}

interface PlayedCardModifierOutcomeSummary {
  status: string
  count: number
}

export function PlayedCardResultPanel({
  cardCost,
  round,
  isLoading,
  isError,
}: {
  cardCost: number
  round: PlayedCardPreviewRound | null
  isLoading: boolean
  isError: boolean
}) {
  const { t } = useTranslation()
  const participants = round?.participants ?? []
  const modifiers = round ? groupPlayedCardModifiers(round.modifiers ?? []) : []
  const finalScore = round?.scoreDetails.finalScore ?? 0
  const penaltyTotal = round?.scoreDetails.penaltyTotal ?? 0

  return (
    <ItemCard data-testid="played-card-result-panel" sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
      <Stack spacing={1}>
        <Typography variant="subtitle2" sx={{ fontWeight: 850 }}>
          {t('gameHistory.cardPlayResultTitle')}
        </Typography>

        {isLoading ? (
          <Typography variant="body2" color="text.secondary">
            {t('gameHistory.cardPlayResultLoading')}
          </Typography>
        ) : isError ? (
          <Typography variant="body2" color="error.main">
            {t('gameHistory.cardPlayResultError')}
          </Typography>
        ) : !round ? (
          <Typography variant="body2" color="text.secondary">
            {t('gameHistory.cardPlayResultEmpty')}
          </Typography>
        ) : (
          <>
            <Stack spacing={0.45}>
              <Typography variant="body2" sx={{ fontWeight: 800 }}>
                {formatPlayedCardTeamName(t, round.teamName, round.teamSlotIndex)}
              </Typography>
              <ParticipantNamesList
                names={participants.map((participant) => participant.displayName)}
                emptyLabel={t('gameHistory.noParticipants')}
                variant="caption"
              />
            </Stack>

            <Box
              sx={{
                display: 'grid',
                gap: 0.65,
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              }}
            >
              <Metric
                label={t('gameHistory.cardCostMetricLabel')}
                value={t('gameHistory.pointsValue', { points: cardCost })}
              />
              <Metric
                label={t('gameHistory.summary.finalScore')}
                value={t('gameHistory.pointsValue', { points: finalScore })}
                emphasis="result"
              />
              {penaltyTotal > 0 ? (
                <Metric
                  label={t('gameHistory.cardPenaltyTotalLabel')}
                  value={t('gameHistory.pointsValue', { points: penaltyTotal })}
                />
              ) : null}
              <Metric
                label={t('gameHistory.summary.totalKills')}
                value={t('gameHistory.countValue', { count: round.scoreDetails.totalKillCount })}
              />
              <Metric
                label={t('gameHistory.summary.totalBounties')}
                value={t('gameHistory.countValue', { count: round.bountyCount })}
              />
            </Box>

            <Box
              sx={(theme) => ({
                '& [data-testid="round-score-breakdown"]': {
                  borderColor: alpha(theme.palette.primary.main, 0.2),
                },
              })}
            >
              <RoundScoreBreakdown score={round.scoreDetails} />
            </Box>

            <Stack spacing={0.55}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
                {t('common.entities.modifiers')}
              </Typography>
              {modifiers.length === 0 ? (
                <Typography variant="caption" color="text.secondary">
                  {t('gameHistory.cardPlayResultNoModifiers')}
                </Typography>
              ) : (
                <Stack spacing={0.65}>
                  {modifiers.map((modifier) => (
                    <PlayedCardModifierItem key={modifier.groupKey} modifier={modifier} />
                  ))}
                </Stack>
              )}
            </Stack>
          </>
        )}
      </Stack>
    </ItemCard>
  )
}

function PlayedCardModifierItem({ modifier }: { modifier: PlayedCardModifierGroup }) {
  const { t } = useTranslation()
  const modifierTitle =
    modifier.count > 1 ? `${modifier.modifierName} x${modifier.count}` : modifier.modifierName

  return (
    <ItemCard
      sx={(theme) => ({
        minWidth: 0,
        '&:nth-of-type(even)': { backgroundColor: alpha(theme.palette.primary.main, 0.07) },
      })}
    >
      <Stack spacing={0.55}>
        <Stack
          direction="row"
          spacing={0.7}
          alignItems="center"
          justifyContent="space-between"
          flexWrap="wrap"
          useFlexGap
        >
          <Typography
            variant="body2"
            sx={{ minWidth: 0, fontWeight: 820, overflowWrap: 'anywhere' }}
          >
            {modifierTitle}
          </Typography>
          <Stack direction="row" spacing={0.35} flexWrap="wrap" useFlexGap>
            {modifier.definitionRevision ? (
              <StatusBadge
                size="small"
                variant="outlined"
                label={t('gameHistory.modifierRevision', {
                  revision: modifier.definitionRevision,
                })}
              />
            ) : null}
            {modifier.outcomeStatuses.map((status) => (
              <StatusBadge
                key={status.status}
                size="small"
                color={getPlayedCardModifierOutcomeColor(status.status)}
                variant="outlined"
                label={`${formatPlayedCardModifierOutcomeStatus(t, status.status)}${
                  status.count > 1 ? ` x${status.count}` : ''
                }`}
              />
            ))}
          </Stack>
        </Stack>

        <Stack direction="row" spacing={0.4} flexWrap="wrap" useFlexGap>
          {modifier.scoreDelta !== 0 ? (
            <StatusBadge
              size="small"
              variant="filled"
              label={t('gameHistory.pointsValue', {
                points: formatSignedNumber(modifier.scoreDelta),
              })}
            />
          ) : null}
          {modifier.killDelta !== 0 ? (
            <StatusBadge
              size="small"
              variant="outlined"
              label={t('gameHistory.summary.killDeltaShort', {
                value: formatSignedNumber(modifier.killDelta),
              })}
            />
          ) : null}
          {modifier.multiplierAppliedValues.map((value) => (
            <StatusBadge
              key={value}
              size="small"
              variant="outlined"
              label={t('gameHistory.summary.multiplierShort', { value })}
            />
          ))}
        </Stack>

        {modifier.modifierDescription ? (
          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
            {modifier.modifierDescription}
          </Typography>
        ) : null}
        {modifier.violationComments.map((comment, index) => (
          <Typography
            key={`${modifier.groupKey}-violation-${index}`}
            variant="caption"
            color="warning.main"
          >
            {t('gameHistory.modifierViolationComment', { comment })}
          </Typography>
        ))}
      </Stack>
    </ItemCard>
  )
}

function groupPlayedCardModifiers(
  modifiers: readonly PlayedCardPreviewModifier[],
): PlayedCardModifierGroup[] {
  const grouped = new Map<string, PlayedCardModifierGroup>()

  for (const modifier of modifiers) {
    const groupKey = `${modifier.modifierId}:revision-${modifier.definitionRevision}`
    const current = grouped.get(groupKey)
    if (!current) {
      grouped.set(groupKey, {
        groupKey,
        modifierId: modifier.modifierId,
        modifierName: modifier.modifierName,
        modifierDescription: modifier.modifierDescription,
        count: 1,
        scoreDelta: modifier.scoreDelta,
        killDelta: modifier.killDelta,
        outcomeStatuses: [
          { status: normalizePlayedCardModifierOutcomeStatus(modifier.outcomeStatus), count: 1 },
        ],
        multiplierAppliedValues:
          modifier.multiplierApplied === null || modifier.multiplierApplied === undefined
            ? []
            : [modifier.multiplierApplied],
        definitionRevision: modifier.definitionRevision ?? null,
        violationComments: modifier.violationComment?.trim()
          ? [modifier.violationComment.trim()]
          : [],
      })
      continue
    }

    grouped.set(groupKey, {
      ...current,
      count: current.count + 1,
      scoreDelta: current.scoreDelta + modifier.scoreDelta,
      killDelta: current.killDelta + modifier.killDelta,
      outcomeStatuses: mergeModifierOutcomeStatuses(
        current.outcomeStatuses,
        normalizePlayedCardModifierOutcomeStatus(modifier.outcomeStatus),
      ),
      multiplierAppliedValues: mergeModifierMultiplierValues(
        current.multiplierAppliedValues,
        modifier.multiplierApplied,
      ),
      violationComments: modifier.violationComment?.trim()
        ? [...current.violationComments, modifier.violationComment.trim()]
        : current.violationComments,
    })
  }

  return Array.from(grouped.values())
}

function mergeModifierOutcomeStatuses(
  statuses: readonly PlayedCardModifierOutcomeSummary[],
  nextStatus: string,
) {
  const nextStatuses = [...statuses]
  const existingIndex = nextStatuses.findIndex((item) => item.status === nextStatus)

  const existing = nextStatuses[existingIndex]
  if (!existing) {
    nextStatuses.push({ status: nextStatus, count: 1 })
    return nextStatuses
  }

  nextStatuses[existingIndex] = {
    ...existing,
    count: existing.count + 1,
  }
  return nextStatuses
}

function mergeModifierMultiplierValues(
  values: readonly number[],
  nextValue: number | null | undefined,
) {
  if (nextValue === null || nextValue === undefined || values.includes(nextValue)) {
    return values
  }

  return [...values, nextValue]
}

function formatPlayedCardTeamName(
  t: TFunction,
  teamName: string | null | undefined,
  teamSlotIndex: number,
) {
  return teamName?.trim() || t('common.teamWithSlot', { slot: teamSlotIndex })
}

function formatSignedNumber(value: number) {
  return value > 0 ? `+${value}` : `${value}`
}
