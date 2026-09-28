import { Box, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { components } from '../api/contracts/generated'
import {
  DisclosureSection,
  InlineNotice,
  ItemCard,
  SectionCard,
  SectionDivider,
} from '../ui/index.ts'
import { RoundScoreBreakdown } from './RoundScoreBreakdown.tsx'
import { RoundScoreTotal } from './RoundScoreTotal.tsx'
import { getPlayedCardModifierPoints } from './played-card-modifiers.ts'

type PlayedCardPreviewRound = components['schemas']['GameHistoryRoundItemDto']

export function PlayedCardResultPanel({
  round,
  isLoading,
  isError,
}: {
  round: PlayedCardPreviewRound | null
  isLoading: boolean
  isError: boolean
}) {
  const { t } = useTranslation()
  const finalScore = round?.scoreDetails.finalScore ?? 0
  const modifierPoints = getPlayedCardModifierPoints(round)

  return (
    <Stack
      data-testid="played-card-result-panel"
      spacing={1.5}
      sx={{ minWidth: 0, width: '100%', overflowWrap: 'anywhere' }}
    >
      {isLoading || isError || !round ? (
        <InlineNotice severity={isError ? 'error' : 'info'}>
          {t(
            isLoading
              ? 'gameHistory.cardPlayResultLoading'
              : isError
                ? 'gameHistory.cardPlayResultError'
                : 'gameHistory.cardPlayResultEmpty',
          )}
        </InlineNotice>
      ) : (
        <>
          <DisclosureSection title={t('common.scoreBreakdown.title')}>
            <RoundScoreBreakdown score={round.scoreDetails} showHeading={false} />
          </DisclosureSection>
          <ItemCard sx={{ flex: 1, display: 'flex', minWidth: 0 }}>
            <Stack spacing={1.5} sx={{ flex: 1, minWidth: 0 }}>
              <Typography component="h3" variant="subtitle1" fontWeight={700}>
                {t('gameHistory.cardPlayResultTitle')}
              </Typography>
              <SectionDivider />
              <PlayedCardTeam round={round} />
              <SectionDivider />
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' },
                  gap: 1,
                }}
              >
                <PlayedCardStat
                  label={t('gameHistory.cardKillsLabel')}
                  value={t('gameHistory.countValue', { count: round.scoreDetails.totalKillCount })}
                />
                <PlayedCardStat
                  label={t('gameHistory.cardBountiesLabel')}
                  value={t('gameHistory.countValue', { count: round.bountyCount })}
                />
                <PlayedCardStat
                  label={t('gameHistory.cardModifierBonusLabel')}
                  value={t('gameHistory.pointsValue', {
                    points: formatSignedNumber(modifierPoints.bonus),
                  })}
                  tone={modifierPoints.bonus > 0 ? 'success' : 'default'}
                />
                <PlayedCardStat
                  label={t('gameHistory.cardModifierPenaltyLabel')}
                  value={t('gameHistory.pointsValue', { points: modifierPoints.penalty })}
                  tone={modifierPoints.penalty < 0 ? 'error' : 'default'}
                />
              </Box>
              <RoundScoreTotal
                label={t('gameHistory.summary.finalScore')}
                value={t('gameHistory.pointsValue', { points: finalScore })}
                score={finalScore}
              />
            </Stack>
          </ItemCard>
        </>
      )}
    </Stack>
  )
}

function PlayedCardTeam({ round }: { round: PlayedCardPreviewRound }) {
  const { t } = useTranslation()
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr)',
        flex: 1,
        alignContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        gap: 2,
      }}
    >
      <Stack spacing={0.5}>
        <Typography component="h4" variant="body2" color="text.secondary">
          {t('gameHistory.participantsLabel')}
        </Typography>
        <Typography component="h4" variant="h5" fontWeight={700}>
          {round.teamName?.trim() || t('common.teamWithSlot', { slot: round.teamSlotIndex })}
        </Typography>
      </Stack>
      {round.participants.length > 0 ? (
        <Stack component="ul" spacing={0.5} sx={{ m: 0, p: 0, listStyle: 'none' }}>
          {round.participants.map((participant, index) => (
            <Stack
              component="li"
              key={`${participant.displayName}-${index}`}
              direction="row"
              spacing={1}
              alignItems="center"
              justifyContent="center"
              sx={{ minWidth: 0 }}
            >
              <Box
                aria-hidden
                sx={{
                  width: 5,
                  height: 5,
                  flex: '0 0 5px',
                  transform: 'rotate(45deg)',
                  bgcolor: 'text.secondary',
                }}
              />
              <Typography variant="body1" fontWeight={700} sx={{ minWidth: 0 }}>
                {participant.displayName}
              </Typography>
              <Box
                aria-hidden
                sx={{
                  width: 5,
                  height: 5,
                  flex: '0 0 5px',
                  transform: 'rotate(45deg)',
                  bgcolor: 'text.secondary',
                }}
              />
            </Stack>
          ))}
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary">
          {t('gameHistory.noParticipants')}
        </Typography>
      )}
    </Box>
  )
}

function PlayedCardStat({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: string
  tone?: 'default' | 'success' | 'error'
}) {
  return (
    <SectionCard
      surface="inset"
      component="dl"
      sx={{
        m: 0,
        p: 1.25,
        minWidth: 0,
        overflowWrap: 'anywhere',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 0.75,
      }}
    >
      <Typography
        component="dt"
        variant="body2"
        color="text.secondary"
        fontWeight={700}
        sx={{ flex: 1, lineHeight: 1.3 }}
      >
        {label}
      </Typography>
      <Typography
        component="dd"
        variant="h5"
        sx={{
          m: 0,
          textAlign: 'right',
          flexShrink: 0,
          minWidth: 0,
          fontWeight: 800,
          fontVariantNumeric: 'tabular-nums',
          color: tone === 'default' ? 'text.primary' : `${tone}.main`,
        }}
      >
        {value}
      </Typography>
    </SectionCard>
  )
}

function formatSignedNumber(value: number) {
  return value > 0 ? `+${value}` : `${value}`
}
