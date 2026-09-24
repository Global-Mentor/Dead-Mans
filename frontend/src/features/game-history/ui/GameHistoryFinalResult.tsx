import { Box, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { components } from '../../../shared/api/contracts/generated'
import { ItemCard, SectionCard, StatusBadge } from '../../../shared/ui/index.ts'
import { formatHistoryTeamName } from '../model/game-history-formatters.ts'
import { formatDateTime } from '../model/game-history-view.ts'

export function FinalResultSnapshot({
  summary,
}: {
  summary: components['schemas']['GameFinishSummaryDto']
}) {
  const { t, i18n } = useTranslation()

  return (
    <SectionCard surface="inset">
      <Stack spacing={1.5}>
        <Stack spacing={0.35}>
          <Typography variant="subtitle1" fontWeight={850}>
            {t('gameHistory.finalResultTitle')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('gameHistory.finalResultMeta', {
              admin: summary.finishedByDisplayName ?? t('gameHistory.unknownValue'),
              date: summary.finishedAtUtc
                ? formatDateTime(summary.finishedAtUtc, i18n.resolvedLanguage)
                : t('gameHistory.unknownValue'),
            })}
          </Typography>
        </Stack>

        {summary.publicNote ? (
          <ItemCard>
            <Typography variant="caption" color="text.secondary">
              {t('gameHistory.finalResultNote')}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.4, whiteSpace: 'pre-wrap' }}>
              {summary.publicNote}
            </Typography>
          </ItemCard>
        ) : null}

        <Stack spacing={0.8}>
          {summary.teams.map((team) => (
            <ItemCard key={team.teamId} sx={{ overflowWrap: 'anywhere' }}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={0.8}
                justifyContent="space-between"
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography fontWeight={800}>
                    {team.placement ? `${team.placement}. ` : ''}
                    {formatHistoryTeamName(t, team.teamName, team.teamSlotIndex)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {team.participantNames.length > 0
                      ? team.participantNames.join(', ')
                      : t('gameHistory.noParticipants')}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap>
                  <StatusBadge
                    density="compact"
                    variant="outlined"
                    label={
                      team.finalScore == null
                        ? t('gameHistory.finalResultDidNotPlay')
                        : t('gameHistory.summary.finalScoreShort', { points: team.finalScore })
                    }
                  />
                  {team.bestScore != null ? (
                    <StatusBadge
                      density="compact"
                      variant="outlined"
                      label={t('gameHistory.summary.bestScoreShort', { points: team.bestScore })}
                    />
                  ) : null}
                  <StatusBadge
                    density="compact"
                    variant="outlined"
                    label={t('gameHistory.summary.penaltyTotalShort', {
                      points: team.penaltyTotal,
                    })}
                  />
                </Stack>
              </Stack>
            </ItemCard>
          ))}
        </Stack>
      </Stack>
    </SectionCard>
  )
}
