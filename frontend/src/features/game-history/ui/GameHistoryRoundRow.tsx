import { Box, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { components } from '../../../shared/api/contracts/generated'
import { ParticipantNamesList } from '../../../shared/game-ui/index.ts'
import {
  AppAccordion,
  AppAccordionDetails,
  AppAccordionSummary,
  AppButton,
  DisclosureSection,
  ItemCard,
  StatusBadge,
} from '../../../shared/ui/index.ts'
import { formatCardLabel, formatHistoryTeamName } from '../model/game-history-formatters.ts'
import { getRoundBonusDelta, getRoundScore } from '../model/game-history-team-leaderboard.ts'
import {
  formatOptionalDateTime,
  formatSignedNumber,
  getRoundStatusColor,
  normalizeRoundStatus,
} from '../model/game-history-view.ts'
type GameHistoryRound = components['schemas']['GameHistoryRoundItemDto']

export function RoundHistoryRow({
  round,
  onPreviewCard,
}: {
  round: GameHistoryRound
  onPreviewCard: (round: GameHistoryRound) => void
}) {
  const { t, i18n } = useTranslation()
  const participants = round.participants ?? []
  const modifiers = round.modifiers ?? []
  const modifierScoreDelta = round.scoreDetails.modifierScoreDelta

  return (
    <AppAccordion>
      <AppAccordionSummary>
        <Box sx={{ width: '100%' }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems="flex-start">
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Typography variant="body1" sx={{ fontWeight: 800 }}>
                  {formatHistoryTeamName(t, round.teamName, round.teamSlotIndex)}
                </Typography>
                <StatusBadge
                  size="small"
                  label={t(`gameHistory.roundStatus.${normalizeRoundStatus(round.status)}`, {
                    defaultValue: t('gameHistory.notAvailable'),
                  })}
                  color={getRoundStatusColor(round.status)}
                />
                <StatusBadge
                  size="small"
                  variant="outlined"
                  label={t('gameHistory.pointsValue', { points: getRoundScore(round) })}
                />
              </Stack>

              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.55 }}>
                {formatCardLabel(round, t)}
              </Typography>
            </Box>

            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
              <StatusBadge
                density="compact"
                variant="outlined"
                label={t('gameHistory.cardCostLabel', { cost: round.cellCost })}
              />
              <StatusBadge
                density="compact"
                variant="outlined"
                label={t('gameHistory.summary.killsShort', {
                  count: round.scoreDetails.totalKillCount,
                })}
              />
              <StatusBadge
                density="compact"
                variant="outlined"
                label={t('gameHistory.summary.bountiesShort', { count: round.bountyCount })}
              />
              <StatusBadge
                density="compact"
                variant="outlined"
                label={t('gameHistory.summary.bonusShort', {
                  value: formatSignedNumber(getRoundBonusDelta(round)),
                })}
              />
            </Stack>
          </Stack>
        </Box>
      </AppAccordionSummary>

      <AppAccordionDetails sx={{ px: 1.75, pt: 0, pb: 1.75 }}>
        <Stack spacing={1.2}>
          <Typography variant="caption" color="text.secondary">
            {formatOptionalDateTime(
              round.finishedAtUtc ?? round.startedAtUtc,
              t,
              i18n.resolvedLanguage,
            )}
          </Typography>

          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
            <StatusBadge
              density="compact"
              variant="outlined"
              label={t('gameHistory.summary.baseScoreShort', {
                points: round.baseScore,
              })}
            />
            {modifierScoreDelta !== 0 ? (
              <StatusBadge
                density="compact"
                variant="outlined"
                label={t('gameHistory.summary.modifierDeltaShort', {
                  value: formatSignedNumber(modifierScoreDelta),
                })}
              />
            ) : null}
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.2} alignItems="flex-start">
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {t('gameHistory.participantsLabel')}
              </Typography>
              <ParticipantNamesList
                names={participants.map((participant) => participant.displayName)}
                emptyLabel={t('gameHistory.noParticipants')}
              />
            </Box>

            <AppButton
              size="small"
              tone="secondary"
              onClick={() => onPreviewCard(round)}
              sx={{ flexShrink: 0 }}
            >
              {t('common.actions.openCard')}
            </AppButton>
          </Stack>

          {modifiers.length > 0 ? (
            <DisclosureSection
              title={t('common.entities.modifiers')}
              description={t('gameHistory.summary.roundModifierDescription')}
              countLabel={t('gameHistory.summary.modifierCountShort', {
                count: modifiers.length,
              })}
            >
              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                {modifiers.map((modifier) => (
                  <ItemCard key={modifier.modifierResultId} sx={{ minWidth: 0 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
                      {t('gameHistory.modifierChipLabel', {
                        modifier: modifier.modifierName,
                        value: formatSignedNumber(modifier.scoreDelta),
                      })}
                    </Typography>
                    {modifier.modifierDescription ? (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block', mt: 0.25, whiteSpace: 'pre-line' }}
                      >
                        {modifier.modifierDescription}
                      </Typography>
                    ) : null}
                  </ItemCard>
                ))}
              </Stack>
            </DisclosureSection>
          ) : null}

          {round.notes ? (
            <Typography variant="body2" color="text.secondary">
              {t('gameHistory.notesLabel', { notes: round.notes })}
            </Typography>
          ) : null}
        </Stack>
      </AppAccordionDetails>
    </AppAccordion>
  )
}
