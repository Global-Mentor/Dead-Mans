import { Box, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { TeamPresentation } from './TeamPresentation.tsx'
import { RoundBriefingPanel } from './RoundBriefingPanel.tsx'
import { HelpTooltip, ItemCard, RankBadge, SelectionRow } from '../ui/index.ts'
import type { ReactNode } from 'react'

type TeamStanding = {
  id: string
  name: string
  players: readonly string[]
  rank: number | null
  roundsPlayed: number
  totalKills: number
  totalBounties: number
  finalScore: number | null
  ownTeam?: boolean
}

const columns = '44px minmax(0, 1fr) minmax(44px, 0.35fr)'
const rankCellSx = {
  display: 'flex',
  alignSelf: 'stretch',
  alignItems: 'center',
  justifyContent: 'center',
  borderRight: '1px solid',
  borderColor: 'divider',
} as const
const statisticCellSx = {
  minWidth: 0,
  alignSelf: 'stretch',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderLeft: '1px solid',
  borderColor: 'divider',
  pl: 0.5,
  fontVariantNumeric: 'tabular-nums',
} as const

const roundsVisibility = {
  display: 'none',
  '@container standings (min-width: 480px)': { display: 'flex' },
}
const rowLayout = {
  display: 'grid',
  gridTemplateColumns: columns,
  '@container standings (min-width: 480px)': {
    gridTemplateColumns:
      '44px minmax(0, 1.2fr) minmax(48px, 0.3fr) repeat(2, minmax(60px, 0.4fr)) minmax(56px, 0.35fr)',
  },
  gap: 0.5,
  alignItems: 'center',
  px: 0.75,
  py: 0.75,
}

export function TeamStandingsTable({
  entries,
  selection,
  broadcast = false,
  footer,
}: {
  entries: readonly TeamStanding[]
  selection?: {
    teamId: string | null
    onSelect: (teamId: string) => void
    inlineDetails: boolean
  }
  broadcast?: boolean
  footer?: ReactNode
}) {
  const { t, i18n } = useTranslation()
  const number = (value: number) => new Intl.NumberFormat(i18n.resolvedLanguage).format(value)
  const title = (
    <Typography
      component={broadcast ? 'h1' : 'h2'}
      variant="h6"
      textAlign="center"
      tabIndex={broadcast ? undefined : 0}
    >
      {t('common.teamStandings.title')}
    </Typography>
  )
  return (
    <RoundBriefingPanel
      data-testid={broadcast ? 'overlay-leaderboard' : 'current-leaderboard-table'}
      sx={{ minHeight: 0, containerType: 'inline-size', containerName: 'standings' }}
      header={
        broadcast ? (
          <Stack spacing={0.5}>
            {title}
            <Typography variant="body2" color="text.secondary" textAlign="center">
              {t('common.teamStandings.description')}
            </Typography>
          </Stack>
        ) : (
          <HelpTooltip title={t('common.teamStandings.description')} describeChild>
            {title}
          </HelpTooltip>
        )
      }
    >
      <Box
        role="table"
        aria-label={t('common.teamStandings.title')}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          flex: 1,
        }}
      >
        <Box
          role="row"
          sx={{
            ...rowLayout,
            flexShrink: 0,
            borderBottom: '1px solid',
            borderColor: 'divider',
            mb: 0.5,
          }}
        >
          {[
            t('common.teamStandings.rank'),
            t('common.entities.team'),
            t('common.teamStandings.rounds'),
            t('common.teamStandings.totalKills'),
            t('common.teamStandings.totalBounties'),
            t('common.teamStandings.final'),
          ].map((label, index) => (
            <Typography
              key={label}
              role="columnheader"
              variant="caption"
              textAlign="center"
              sx={{
                fontWeight: 700,
                ...(index === 0 ? rankCellSx : {}),
                ...(index >= 2 ? statisticCellSx : {}),
                ...(index >= 2 && index <= 4 ? roundsVisibility : {}),
              }}
            >
              {label}
            </Typography>
          ))}
        </Box>
        <Stack
          role="rowgroup"
          spacing={0.5}
          sx={{
            minHeight: 0,
            overflowY: broadcast ? 'visible' : 'auto',
            overscrollBehaviorY: 'contain',
          }}
        >
          {entries.map((entry, index) => {
            const selected = entry.id === selection?.teamId
            const cells = (
              <>
                <Box role="cell" sx={rankCellSx}>
                  {entry.rank ? (
                    <RankBadge rank={entry.rank} compact />
                  ) : (
                    t('common.teamStandings.notAvailable')
                  )}
                </Box>
                <ItemCard
                  role="cell"
                  frame={selected ? 'corner' : 'standard'}
                  transparent
                  density="compact"
                  data-testid="leaderboard-team-frame"
                  sx={{ minWidth: 0 }}
                >
                  <TeamPresentation
                    density="compact"
                    name={entry.name}
                    members={entry.players.map((name, index) => ({
                      id: String(index),
                      name,
                    }))}
                    emptyLabel={t('common.teamStandings.noPlayers')}
                  />
                </ItemCard>
                <Typography
                  role="cell"
                  variant="body2"
                  textAlign="center"
                  sx={{ ...statisticCellSx, ...roundsVisibility }}
                >
                  {number(entry.roundsPlayed)}
                </Typography>
                <Typography
                  role="cell"
                  variant="body2"
                  textAlign="center"
                  sx={{ ...statisticCellSx, ...roundsVisibility }}
                >
                  {number(entry.totalKills)}
                </Typography>
                <Typography
                  role="cell"
                  variant="body2"
                  textAlign="center"
                  sx={{ ...statisticCellSx, ...roundsVisibility }}
                >
                  {number(entry.totalBounties)}
                </Typography>
                <Typography
                  role="cell"
                  variant="body2"
                  textAlign="center"
                  sx={{ ...statisticCellSx, overflowWrap: 'anywhere' }}
                >
                  {entry.finalScore === null
                    ? t('common.teamStandings.notPlayed')
                    : number(entry.finalScore)}
                </Typography>
              </>
            )
            return selection ? (
              <SelectionRow
                component="div"
                tabIndex={0}
                key={entry.id}
                role="row"
                data-own-team={entry.ownTeam || undefined}
                emphasis={entry.ownTeam ? 'selected' : 'none'}
                selected={selected}
                aria-label={entry.name}
                aria-controls={selection.inlineDetails ? 'leaderboard-team-details' : undefined}
                aria-haspopup={selection.inlineDetails ? undefined : 'dialog'}
                onClick={() => selection.onSelect(entry.id)}
                tone={index % 2 ? 'alternate' : 'default'}
                sx={{ ...rowLayout, width: '100%', flexShrink: 0 }}
              >
                {cells}
              </SelectionRow>
            ) : (
              <ItemCard
                key={entry.id}
                role="row"
                tone={index % 2 ? 'alternate' : 'default'}
                sx={rowLayout}
              >
                {cells}
              </ItemCard>
            )
          })}
        </Stack>
      </Box>
      {entries.length === 0 ? (
        <Typography textAlign="center">{t('common.teamStandings.empty')}</Typography>
      ) : null}
      {footer}
    </RoundBriefingPanel>
  )
}
