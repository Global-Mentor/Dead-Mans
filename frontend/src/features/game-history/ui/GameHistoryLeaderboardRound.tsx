import { Box, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { components } from '../../../shared/api/contracts/generated'
import { ParticipantNamesList } from '../../../shared/game-ui/index.ts'
import { formatPlayedCardModifierOutcomeStatus } from '../../../shared/lib/played-card-formatters.ts'
import {
  AppAccordion,
  AppAccordionDetails,
  AppAccordionSummary,
  AppButton,
  DisclosureSection,
  ItemCard,
  StatusBadge,
} from '../../../shared/ui/index.ts'
import { getRoundBonusDelta, getRoundScore } from '../model/game-history-team-leaderboard.ts'
import { formatSignedNumber } from '../model/game-history-view.ts'
type GameHistoryRound = components['schemas']['GameHistoryRoundItemDto']

export function LeaderboardRoundCard({
  round,
  isBestRound,
  onPreviewCard,
}: {
  round: GameHistoryRound
  isBestRound: boolean
  onPreviewCard: (round: GameHistoryRound) => void
}) {
  const { t } = useTranslation()
  const participants = round.participants ?? []
  const modifiers = round.modifiers ?? []
  const modifierScoreDelta = round.scoreDetails.modifierScoreDelta

  return (
    <AppAccordion defaultExpanded={isBestRound} tone={isBestRound ? 'warning' : 'default'}>
      <AppAccordionSummary density="compact">
        <Box sx={{ width: '100%' }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={0.75} alignItems="flex-start">
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                <Typography variant="body2" sx={{ fontWeight: 800 }}>
                  {round.cellTitle || t('gameHistory.cardDialogFallbackTitle')}
                </Typography>
                <StatusBadge
                  size="small"
                  variant="outlined"
                  label={t('gameHistory.pointsValue', { points: getRoundScore(round) })}
                />
              </Stack>
            </Box>

            <Stack direction="row" spacing={0.55} flexWrap="wrap" useFlexGap>
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

      <AppAccordionDetails sx={{ px: 1.25, pt: 0, pb: 1.25 }}>
        <Stack spacing={1.2}>
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
            <StatusBadge
              density="compact"
              variant="outlined"
              label={t('gameHistory.summary.baseScoreShort', {
                points: round.baseScore,
              })}
            />
            <StatusBadge
              density="compact"
              variant="outlined"
              label={t('gameHistory.summary.finalScoreShort', {
                points: getRoundScore(round),
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

          {round.cellDescription ? (
            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
              {round.cellDescription}
            </Typography>
          ) : null}

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
              <Stack spacing={0.75}>
                {modifiers.map((modifier) => (
                  <ItemCard key={modifier.modifierResultId} sx={{ minWidth: 0 }}>
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={0.75}
                      alignItems="flex-start"
                    >
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {modifier.modifierName}
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
                        <Typography variant="caption" color="text.secondary">
                          {t('gameHistory.summary.modifierImpactLabel', {
                            value: formatSignedNumber(modifier.scoreDelta),
                          })}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        <StatusBadge
                          density="compact"
                          variant="outlined"
                          label={formatPlayedCardModifierOutcomeStatus(t, modifier.outcomeStatus)}
                        />
                        {modifier.killDelta !== 0 ? (
                          <StatusBadge
                            density="compact"
                            variant="outlined"
                            label={t('gameHistory.summary.killDeltaShort', {
                              value: formatSignedNumber(modifier.killDelta),
                            })}
                          />
                        ) : null}
                      </Stack>
                    </Stack>
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
