import { TeamIdentity } from '../../../shared/game-ui/index.ts'
import { Box, Stack, Typography } from '@mui/material'
import type { TFunction } from 'i18next'
import { useId, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameTeamQueueItem } from '../../../shared/api/contracts/index.ts'
import {
  ActionIcon,
  AppButton,
  AsyncSection,
  FormTextField,
  ItemCard,
  SectionCard,
  StatusBadge,
} from '../../../shared/ui/index.ts'
import { formatTeamNameWithFallback } from '../../game-registration/model/team-name.ts'

interface TeamQueuePanelProps {
  teams: readonly GameTeamQueueItem[]
  isLoading: boolean
  isError: boolean
  hasData: boolean
  isRefreshing: boolean
  onRetry: () => void
  activeTeamId?: string | null
}

export function TeamQueuePanel({
  teams,
  isLoading,
  isError,
  hasData,
  isRefreshing,
  onRetry,
  activeTeamId,
}: TeamQueuePanelProps) {
  const { t } = useTranslation()
  const panelId = useId()
  const [search, setSearch] = useState('')
  const query = search.trim().toLocaleLowerCase()
  const matchingTeams = teams.filter(
    (team) =>
      !query ||
      [
        formatTeamQueueName(t, team.teamName),
        ...team.participants.map((player) => player.displayName),
      ].some((value) => value.toLocaleLowerCase().includes(query)),
  )
  const groupedTeams = groupTeamQueueTeams(teams)
  // Search must not renumber the historical play order.
  const matchingIds = new Set(matchingTeams.map((team) => team.teamId))
  const remainingTeams = groupedTeams.remainingTeams.filter(({ team }) =>
    matchingIds.has(team.teamId),
  )
  const playedTeams = groupedTeams.playedTeams.filter(({ team }) => matchingIds.has(team.teamId))

  return (
    <SectionCard
      component="section"
      aria-labelledby={`${panelId}-title`}
      data-testid="team-queue-panel"
      sx={{ p: { xs: 2, sm: 2.5 }, minWidth: 0 }}
    >
      <Stack spacing={2.5}>
        <Stack
          component="header"
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          gap={1}
          sx={{ pb: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}
        >
          <Typography id={`${panelId}-title`} component="h1" variant="h5">
            {t('gameBoard.teamQueueTitle')}
          </Typography>
          {hasData ? <StatusBadge size="small" label={teams.length} /> : null}
        </Stack>
        {hasData && teams.length > 0 ? (
          <FormTextField
            label={t('gameBoard.teamQueueSearch')}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            slotProps={{
              input: {
                endAdornment: search ? (
                  <ActionIcon
                    aria-label={t('gameBoard.teamQueueClearSearch')}
                    onClick={() => setSearch('')}
                    edge="end"
                  >
                    <Box component="span" aria-hidden>
                      ×
                    </Box>
                  </ActionIcon>
                ) : undefined,
              },
            }}
          />
        ) : null}
        <AsyncSection
          isLoading={isLoading}
          isError={isError}
          isEmpty={teams.length === 0}
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
          {matchingTeams.length === 0 ? (
            <Typography role="status" variant="body2" color="text.secondary">
              {t('gameBoard.teamQueueNoResults')}
            </Typography>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))' },
                gap: { xs: 3, md: 2.5 },
                alignItems: 'start',
              }}
            >
              <TeamQueueSection
                title={t('gameBoard.teamQueueRemainingTitle')}
                count={remainingTeams.length}
                emptyMessage={t('gameBoard.teamQueueRemainingEmpty')}
              >
                {remainingTeams.map(({ team }) => (
                  <TeamQueueCard
                    key={team.teamId}
                    team={team}
                    isActive={team.teamId === activeTeamId}
                  />
                ))}
              </TeamQueueSection>
              <TeamQueueSection
                title={t('gameBoard.teamQueuePlayedTitle')}
                count={playedTeams.length}
                emptyMessage={t('gameBoard.teamQueuePlayedEmpty')}
              >
                {playedTeams.map(({ team, playedOrder }) => (
                  <TeamQueueCard
                    key={team.teamId}
                    team={team}
                    isActive={team.teamId === activeTeamId}
                    playedOrder={playedOrder}
                  />
                ))}
              </TeamQueueSection>
            </Box>
          )}
        </AsyncSection>
      </Stack>
    </SectionCard>
  )
}

interface OrderedTeamQueueItem {
  team: GameTeamQueueItem
  originalIndex: number
  playedOrder?: number
}

function groupTeamQueueTeams(teams: readonly GameTeamQueueItem[]) {
  const indexedTeams = teams.map((team, originalIndex) => ({ team, originalIndex }))
  const remainingTeams = indexedTeams.filter(({ team }) => !team.isPlayed)
  const playedTeams = indexedTeams
    .filter(({ team }) => team.isPlayed)
    .sort(comparePlayedTeams)
    .map((item, index) => ({
      ...item,
      playedOrder: index + 1,
    }))

  return { remainingTeams, playedTeams }
}

function comparePlayedTeams(left: OrderedTeamQueueItem, right: OrderedTeamQueueItem) {
  const leftPlayedAt = parseOptionalTime(left.team.playedAtUtc)
  const rightPlayedAt = parseOptionalTime(right.team.playedAtUtc)

  if (leftPlayedAt !== null && rightPlayedAt !== null && leftPlayedAt !== rightPlayedAt) {
    return leftPlayedAt - rightPlayedAt
  }

  if (leftPlayedAt !== null && rightPlayedAt === null) {
    return -1
  }

  if (leftPlayedAt === null && rightPlayedAt !== null) {
    return 1
  }

  return left.originalIndex - right.originalIndex
}

function parseOptionalTime(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const timestamp = Date.parse(value)
  return Number.isNaN(timestamp) ? null : timestamp
}

function TeamQueueSection({
  title,
  count,
  emptyMessage,
  children,
}: {
  title: string
  count: number
  emptyMessage: string
  children: ReactNode
}) {
  return (
    <Stack
      component="section"
      spacing={1}
      sx={{ minWidth: 0, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
        <Typography component="h2" variant="h6">
          {title}
        </Typography>
        <StatusBadge size="small" label={count} />
      </Stack>
      {count === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {emptyMessage}
        </Typography>
      ) : (
        <Stack spacing={0.75}>{children}</Stack>
      )}
    </Stack>
  )
}

function TeamQueueCard({
  team,
  isActive,
  playedOrder,
}: {
  team: GameTeamQueueItem
  isActive: boolean
  playedOrder?: number
}) {
  const { t } = useTranslation()

  return (
    <ItemCard
      component="article"
      aria-label={formatTeamQueueName(t, team.teamName)}
      emphasis={isActive ? 'selected' : 'none'}
    >
      <Stack direction="row" spacing={1.25} alignItems="flex-start" sx={{ minWidth: 0 }}>
        <StatusBadge
          size="small"
          variant="outlined"
          color={isActive ? 'primary' : 'default'}
          label={team.teamSlotIndex}
          aria-label={t('gameBoard.teamQueueSlotLabel', { slot: team.teamSlotIndex })}
        />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <TeamIdentity
            name={formatTeamQueueName(t, team.teamName)}
            participants={team.participants.map((participant) => participant.displayName)}
            emptyLabel={t('gameBoard.roundSummaryNoParticipants')}
            status={
              isActive ? (
                <StatusBadge
                  size="small"
                  color="primary"
                  variant="outlined"
                  label={t('gameBoard.teamQueueActiveChip')}
                />
              ) : playedOrder ? (
                <StatusBadge
                  size="small"
                  color="success"
                  variant="outlined"
                  appearance="plain"
                  label={t('gameBoard.teamQueuePlayedOrderLabel', { order: playedOrder })}
                />
              ) : null
            }
          />
        </Box>
      </Stack>
    </ItemCard>
  )
}

function formatTeamQueueName(t: TFunction, teamName: string | null | undefined) {
  return formatTeamNameWithFallback(teamName, t('gameBoard.teamQueueUnnamedTeam'))
}
