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
  FormSection,
  ItemCard,
  PanelTrigger,
  SectionCard,
  SidePanel,
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
  inline?: boolean
}

export function TeamQueuePanel({
  teams,
  isLoading,
  isError,
  hasData,
  isRefreshing,
  onRetry,
  activeTeamId,
  inline = false,
}: TeamQueuePanelProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [previousInline, setPreviousInline] = useState(inline)
  if (previousInline !== inline) {
    setPreviousInline(inline)
    if (inline) setIsOpen(false)
  }
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

  const searchField =
    hasData && teams.length > 0 ? (
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
    ) : null
  const content = (compact: boolean) => (
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
        <Stack spacing={compact ? 1.5 : 2.5}>
          <TeamQueueSection
            title={t('gameBoard.teamQueueRemainingTitle')}
            count={remainingTeams.length}
            emptyMessage={t('gameBoard.teamQueueRemainingEmpty')}
            compact={compact}
          >
            {remainingTeams.map(({ team }) => (
              <TeamQueueCard
                key={team.teamId}
                team={team}
                isActive={team.teamId === activeTeamId}
                compact={compact}
              />
            ))}
          </TeamQueueSection>
          <TeamQueueSection
            title={t('gameBoard.teamQueuePlayedTitle')}
            count={playedTeams.length}
            emptyMessage={t('gameBoard.teamQueuePlayedEmpty')}
            compact={compact}
          >
            {playedTeams.map(({ team, playedOrder }) => (
              <TeamQueueCard
                key={team.teamId}
                team={team}
                isActive={team.teamId === activeTeamId}
                playedOrder={playedOrder}
                compact={compact}
              />
            ))}
          </TeamQueueSection>
        </Stack>
      )}
    </AsyncSection>
  )

  if (inline) {
    return (
      <SectionCard
        component="section"
        aria-labelledby={`${panelId}-inline-title`}
        data-testid="team-queue-inline"
        sx={{ p: 1.25, display: 'flex', flexDirection: 'column', gap: 1.25 }}
      >
        <Stack
          component="header"
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          gap={1}
          sx={{ pb: 1, borderBottom: '1px solid', borderColor: 'divider' }}
        >
          <Typography id={`${panelId}-inline-title`} component="h2" variant="h6">
            {t('gameBoard.teamQueueTitle')}
          </Typography>
          {hasData ? <StatusBadge size="small" label={teams.length} /> : null}
        </Stack>
        {searchField}
        {content(true)}
      </SectionCard>
    )
  }

  return (
    <>
      <PanelTrigger
        placement="responsiveEdge"
        side="left"
        aria-label={t('gameBoard.teamQueueOpen')}
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
        onClick={() => setIsOpen(true)}
      >
        <Stack direction="row" spacing={1} useFlexGap alignItems="center">
          <Typography component="span" variant="body2" fontWeight={700} fontSize="inherit">
            {t('common.entities.teams')}
          </Typography>
          {hasData ? (
            <Typography component="span" variant="body2" color="primary.light" fontSize="inherit">
              {teams.length}
            </Typography>
          ) : null}
        </Stack>
      </PanelTrigger>
      <SidePanel
        id={panelId}
        open={isOpen}
        onClose={() => setIsOpen(false)}
        side="left"
        title={t('gameBoard.teamQueueTitle')}
        closeLabel={t('gameBoard.teamQueueClose')}
        bodyTestId="team-queue-scroll-body"
        header={searchField ? <Box sx={{ mt: 2 }}>{searchField}</Box> : null}
      >
        {content(false)}
      </SidePanel>
    </>
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
  compact = false,
}: {
  title: string
  count: number
  emptyMessage: string
  children: ReactNode
  compact?: boolean
}) {
  if (compact) {
    return (
      <Stack component="section" spacing={1} sx={{ minWidth: 0 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
          <Typography component="h3" variant="subtitle2">
            {title}
          </Typography>
          <StatusBadge size="small" variant="outlined" label={count} />
        </Stack>
        {count === 0 ? (
          <Typography variant="caption" color="text.secondary">
            {emptyMessage}
          </Typography>
        ) : (
          <Stack spacing={0.75}>{children}</Stack>
        )}
      </Stack>
    )
  }
  return (
    <FormSection
      title={title}
      action={<StatusBadge size="small" variant="outlined" label={count} />}
    >
      {count === 0 ? (
        <ItemCard>
          <Typography variant="body2" color="text.secondary">
            {emptyMessage}
          </Typography>
        </ItemCard>
      ) : (
        <Stack spacing={1}>{children}</Stack>
      )}
    </FormSection>
  )
}

function TeamQueueCard({
  team,
  isActive,
  playedOrder,
  compact = false,
}: {
  team: GameTeamQueueItem
  isActive: boolean
  playedOrder?: number
  compact?: boolean
}) {
  const { t } = useTranslation()

  return (
    <ItemCard
      component="article"
      aria-label={formatTeamQueueName(t, team.teamName)}
      emphasis={isActive ? 'selected' : 'none'}
      sx={compact ? { p: 1 } : undefined}
    >
      <TeamIdentity
        name={formatTeamQueueName(t, team.teamName)}
        participants={team.participants.map((participant) => participant.displayName)}
        emptyLabel={t('gameBoard.roundSummaryNoParticipants')}
        compact={compact}
        status={
          <Stack direction="row" gap={1} flexWrap="wrap">
            {playedOrder ? (
              <StatusBadge
                size="small"
                color="success"
                variant="outlined"
                appearance="plain"
                label={t('gameBoard.teamQueuePlayedOrderLabel', { order: playedOrder })}
              />
            ) : null}
            {isActive ? (
              <StatusBadge
                size="small"
                color="primary"
                variant="outlined"
                label={t('gameBoard.teamQueueActiveChip')}
              />
            ) : null}
          </Stack>
        }
      />
    </ItemCard>
  )
}

function formatTeamQueueName(t: TFunction, teamName: string | null | undefined) {
  return formatTeamNameWithFallback(teamName, t('gameBoard.teamQueueUnnamedTeam'))
}
