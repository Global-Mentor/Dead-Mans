import { Box, Stack, SvgIcon, Typography } from '@mui/material'
import { useId, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameTeamQueueItem } from '../../../shared/api/contracts/index.ts'
import { RoundBriefingPanel } from '../../../shared/game-ui/index.ts'
import {
  ActionIcon,
  AppButton,
  AsyncSection,
  FieldAdornment,
  FormTextField,
  StatusBadge,
} from '../../../shared/ui/index.ts'
import { formatTeamNameWithFallback } from '../../game-registration/index.ts'
import { groupTeamQueueTeams } from '../model/team-queue-order.ts'
import { TeamQueueCard } from './TeamQueueCard.tsx'
import { scrollRegionSx } from '../../../shared/theme/layout-sx.ts'

interface TeamQueuePanelProps {
  teams: readonly GameTeamQueueItem[]
  isLoading: boolean
  isError: boolean
  hasData: boolean
  isRefreshing: boolean
  onRetry: () => void
  activeTeamId?: string | null
  currentUserId?: string | null
}

export function TeamQueuePanel({
  teams,
  isLoading,
  isError,
  hasData,
  isRefreshing,
  onRetry,
  activeTeamId,
  currentUserId = null,
}: TeamQueuePanelProps) {
  const { t, i18n } = useTranslation()
  const panelId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [search, setSearch] = useState('')
  const query = search.trim().toLocaleLowerCase(i18n.resolvedLanguage)
  const matchingTeams = teams.filter(
    (team) =>
      !query ||
      [
        formatTeamNameWithFallback(team.teamName, t('gameBoard.teamQueueUnnamedTeam')),
        ...team.participants.map((player) => player.displayName),
      ].some((value) => value.toLocaleLowerCase(i18n.resolvedLanguage).includes(query)),
  )
  const grouped = groupTeamQueueTeams(teams)
  // Filtering keeps authoritative queue slots and historical play positions.
  const matchingIds = new Set(matchingTeams.map((team) => team.teamId))
  const remaining = grouped.remainingTeams.filter(({ team }) => matchingIds.has(team.teamId))
  const played = grouped.playedTeams.filter(({ team }) => matchingIds.has(team.teamId))
  const countLabel = (count: number, total: number) =>
    query
      ? t('gameBoard.teamQueueMatches', { matched: count, total })
      : count.toLocaleString(i18n.resolvedLanguage)

  return (
    <Stack
      component="section"
      aria-labelledby={panelId + '-title'}
      data-testid="team-queue-panel"
      spacing={2}
      sx={{ minWidth: 0, minHeight: 0, flex: 1 }}
    >
      <RoundBriefingPanel
        sx={{ flexShrink: 0 }}
        header={
          <Stack direction="row" alignItems="center" justifyContent="center" gap={1.5}>
            <Typography id={panelId + '-title'} component="h1" variant="h6">
              {t('gameBoard.teamQueueTitle')}
            </Typography>
          </Stack>
        }
      >
        {hasData && teams.length > 0 ? (
          <FormTextField
            fullWidth
            inputRef={inputRef}
            label={t('gameBoard.teamQueueSearch')}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            slotProps={{
              input: {
                endAdornment: search ? (
                  <FieldAdornment position="end">
                    <ActionIcon
                      aria-label={t('gameBoard.teamQueueClearSearch')}
                      onClick={() => {
                        setSearch('')
                        inputRef.current?.focus()
                      }}
                      edge="end"
                    >
                      <SvgIcon fontSize="small" aria-hidden>
                        <path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4Z" />
                      </SvgIcon>
                    </ActionIcon>
                  </FieldAdornment>
                ) : undefined,
              },
            }}
          />
        ) : null}
      </RoundBriefingPanel>
      <AsyncSection
        isLoading={isLoading}
        isError={isError}
        isEmpty={false}
        hasData={hasData}
        loadingMessage={t('gameBoard.teamQueueLoading')}
        errorMessage={t('gameBoard.teamQueueError')}
        emptyMessage={t('gameBoard.teamQueueEmpty')}
        retryAction={
          <AppButton tone="secondary" onClick={onRetry} loading={isRefreshing}>
            {t('common.actions.retry')}
          </AppButton>
        }
      >
        {query && matchingTeams.length === 0 ? (
          <Typography role="status" variant="body2" color="text.secondary">
            {t('gameBoard.teamQueueNoResults')}
          </Typography>
        ) : null}
        <Box
          sx={{
            display: 'grid',
            flex: 1,
            minHeight: 0,
            gridTemplateRows: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'minmax(0, 1fr)' },
            gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' },
            gap: 2,
            alignItems: 'stretch',
          }}
        >
          <TeamQueueSection
            title={t('gameBoard.teamQueueRemainingTitle')}
            count={countLabel(remaining.length, grouped.remainingTeams.length)}
            emptyMessage={t(
              query
                ? 'gameBoard.teamQueueNoResults'
                : teams.length
                  ? 'gameBoard.teamQueueRemainingEmpty'
                  : 'gameBoard.teamQueueEmpty',
            )}
            empty={remaining.length === 0}
          >
            {remaining.map(({ team }, index) => (
              <TeamQueueCard
                key={team.teamId}
                team={team}
                isActive={team.teamId === activeTeamId}
                currentUserId={currentUserId}
                tone={index % 2 ? 'alternate' : 'default'}
              />
            ))}
          </TeamQueueSection>
          <TeamQueueSection
            title={t('gameBoard.teamQueuePlayedTitle')}
            count={countLabel(played.length, grouped.playedTeams.length)}
            emptyMessage={t(
              query ? 'gameBoard.teamQueueNoResults' : 'gameBoard.teamQueuePlayedEmpty',
            )}
            empty={played.length === 0}
          >
            {played.map(({ team }, index) => (
              <TeamQueueCard
                key={team.teamId}
                team={team}
                isActive={team.teamId === activeTeamId}
                currentUserId={currentUserId}
                tone={index % 2 ? 'alternate' : 'default'}
              />
            ))}
          </TeamQueueSection>
        </Box>
      </AsyncSection>
    </Stack>
  )
}

function TeamQueueSection({
  title,
  count,
  empty,
  emptyMessage,
  children,
}: {
  title: string
  count: string
  empty: boolean
  emptyMessage: string
  children: ReactNode
}) {
  return (
    <RoundBriefingPanel
      component="section"
      aria-label={title}
      sx={{ minHeight: 0 }}
      header={
        <Box sx={{ position: 'relative', px: 5, minHeight: 28, alignContent: 'center' }}>
          <Typography component="h2" variant="h6" textAlign="center">
            {title}
          </Typography>
          <Box sx={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)' }}>
            <StatusBadge density="compact" variant="outlined" label={count} />
          </Box>
        </Box>
      }
    >
      <Box
        role="group"
        aria-label={title}
        tabIndex={0}
        sx={{
          minHeight: 0,
          flex: 1,
          ...scrollRegionSx,
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: 2,
          },
        }}
      >
        {empty ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
            {emptyMessage}
          </Typography>
        ) : (
          <Stack spacing={0.75}>{children}</Stack>
        )}
      </Box>
    </RoundBriefingPanel>
  )
}
