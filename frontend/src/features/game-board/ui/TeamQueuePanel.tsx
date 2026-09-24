import { Box, Stack, Typography } from '@mui/material'
import type { TFunction } from 'i18next'
import { useId, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameTeamQueueItem } from '../../../shared/api/contracts/index.ts'
import {
  ActionIcon,
  BulletList,
  FormTextField,
  FormSection,
  ItemCard,
  PanelTrigger,
  SidePanel,
  StatusBadge,
} from '../../../shared/ui/index.ts'
import { formatTeamNameWithFallback } from '../../game-registration/model/team-name.ts'

interface TeamQueuePanelProps {
  teams: readonly GameTeamQueueItem[]
  isLoading: boolean
  isError: boolean
  activeTeamId?: string | null
}

export function TeamQueuePanel({ teams, isLoading, isError, activeTeamId }: TeamQueuePanelProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
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
          <Typography component="span" variant="body2" fontWeight={700}>
            {t('common.entities.teams')}
          </Typography>
          {!isLoading && !isError ? (
            <Typography component="span" variant="body2" color="primary.light">
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
        header={
          !isLoading && !isError && teams.length > 0 ? (
            <FormTextField
              label={t('gameBoard.teamQueueSearch')}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              sx={{ mt: 2 }}
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
        }
      >
        {isLoading ? (
          <Typography variant="body2" color="text.secondary">
            {t('gameBoard.teamQueueLoading')}
          </Typography>
        ) : isError ? (
          <Typography variant="body2" color="error">
            {t('gameBoard.teamQueueError')}
          </Typography>
        ) : teams.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {t('gameBoard.teamQueueEmpty')}
          </Typography>
        ) : matchingTeams.length === 0 ? (
          <Typography role="status" variant="body2" color="text.secondary">
            {t('gameBoard.teamQueueNoResults')}
          </Typography>
        ) : (
          <Stack spacing={2.5}>
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
          </Stack>
        )}
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
}: {
  title: string
  count: number
  emptyMessage: string
  children: ReactNode
}) {
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
      <Stack spacing={1}>
        <Stack direction="row" spacing={1.15} alignItems="center">
          <Stack spacing={0.5} sx={{ minWidth: 0, flex: 1 }}>
            <Stack direction="row" spacing={0.8} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography
                component="h4"
                variant="subtitle1"
                fontWeight={700}
                sx={{ fontSize: 24, lineHeight: 1.15, overflowWrap: 'anywhere' }}
              >
                {formatTeamQueueName(t, team.teamName)}
              </Typography>
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
          </Stack>
        </Stack>

        <BulletList>
          {team.participants.map((participant) => (
            <Box component="li" key={participant.userId}>
              <Typography
                variant="body2"
                title={participant.displayName}
                sx={{ minWidth: 0, overflowWrap: 'anywhere' }}
              >
                {participant.displayName}
              </Typography>
            </Box>
          ))}
        </BulletList>
      </Stack>
    </ItemCard>
  )
}

function formatTeamQueueName(t: TFunction, teamName: string | null | undefined) {
  return formatTeamNameWithFallback(teamName, t('gameBoard.teamQueueUnnamedTeam'))
}
