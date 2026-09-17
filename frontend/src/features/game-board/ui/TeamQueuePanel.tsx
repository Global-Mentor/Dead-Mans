import type { TFunction } from 'i18next'
import {
  Box,
  ButtonBase,
  Chip,
  Drawer,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useId, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameTeamQueueItem } from '../../../shared/api/contracts/index.ts'
import { SectionCard } from '../../../shared/ui/index.ts'
import {
  sidePanelCloseSx,
  sidePanelHeaderSx,
  sidePanelPaperSx,
  sidePanelTitleSx,
} from '../../../shared/theme/side-panel-sx.ts'
import { formatTeamNameWithFallback } from '../../game-registration/model/team-name.ts'
import { huntWornFrame } from '../../../shared/theme/hunt-materials.ts'
import { huntPalette } from '../../../shared/theme/hunt-palette.ts'

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
      <ButtonBase
        aria-label={t('gameBoard.teamQueueOpen')}
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
        onClick={() => setIsOpen(true)}
        sx={(theme) => ({
          minHeight: 44,
          px: 1.5,
          border: 0,
          backgroundColor: 'transparent',
          color: theme.palette.text.primary,
          '&:hover': {
            backgroundColor: alpha(theme.palette.primary.main, 0.14),
          },
          '&:focus-visible': {
            outline: `2px solid ${theme.palette.primary.main}`,
            outlineOffset: 2,
          },
        })}
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
      </ButtonBase>

      <Drawer
        anchor="left"
        open={isOpen}
        onClose={() => setIsOpen(false)}
        ModalProps={{ keepMounted: true }}
        PaperProps={{
          sx: (theme) => ({
            ...sidePanelPaperSx(theme),
            borderLeft: 0,
            borderRight: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
            width: { xs: '100vw', sm: 400 },
            height: '100dvh',
            overflow: 'hidden',
            maxWidth: '100vw',
          }),
        }}
      >
        <SectionCard
          id={panelId}
          component="aside"
          aria-label={t('gameBoard.teamQueueTitle')}
          sx={{
            width: '100%',
            height: '100%',
            minHeight: 0,
            borderRadius: 0,
            border: 0,
            backgroundImage: 'none',
            backgroundColor: 'transparent',
            display: 'grid',
            gridTemplateRows: 'auto minmax(0, 1fr)',
            p: 0,
          }}
        >
          <Box sx={sidePanelHeaderSx}>
            <Stack direction="row" gap={1} alignItems="center" justifyContent="space-between">
              <Typography component="h2" variant="h6" sx={sidePanelTitleSx}>
                {t('gameBoard.teamQueueTitle')}
              </Typography>
              <IconButton
                aria-label={t('gameBoard.teamQueueClose')}
                onClick={() => setIsOpen(false)}
                sx={sidePanelCloseSx}
              >
                <Box component="span" aria-hidden sx={{ fontSize: 24, lineHeight: 1 }}>
                  ×
                </Box>
              </IconButton>
            </Stack>
            {!isLoading && !isError && teams.length > 0 ? (
              <TextField
                fullWidth
                size="small"
                label={t('gameBoard.teamQueueSearch')}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                sx={{ mt: 2 }}
                slotProps={{
                  input: {
                    endAdornment: search ? (
                      <IconButton
                        aria-label={t('gameBoard.teamQueueClearSearch')}
                        onClick={() => setSearch('')}
                        edge="end"
                        sx={{ minWidth: 44, minHeight: 44 }}
                      >
                        <Box component="span" aria-hidden>
                          ×
                        </Box>
                      </IconButton>
                    ) : undefined,
                  },
                }}
              />
            ) : null}
          </Box>
          <Box
            data-testid="team-queue-scroll-body"
            sx={{
              minHeight: 0,
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              px: { xs: 2, sm: 2.5 },
              pt: 2,
              pb: 'max(20px, env(safe-area-inset-bottom))',
            }}
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
          </Box>
        </SectionCard>
      </Drawer>
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
    <Stack spacing={0.85}>
      <Stack
        direction="row"
        spacing={0.75}
        alignItems="center"
        justifyContent="space-between"
        sx={(theme) => ({
          minHeight: 52,
          px: 1.25,
          py: 1,
          bgcolor: alpha(theme.palette.common.black, 0.16),
          boxShadow: `inset 2px 0 0 ${alpha(theme.palette.text.secondary, 0.42)}`,
        })}
      >
        <Typography
          component="h3"
          variant="subtitle1"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            fontWeight: 700,
            fontSize: 20,
            lineHeight: 1.2,
            letterSpacing: '0.025em',
            '&::before': {
              content: '""',
              width: 8,
              height: 8,
              flexShrink: 0,
              transform: 'rotate(45deg)',
              bgcolor: 'text.secondary',
              opacity: 0.58,
            },
          }}
        >
          {title}
        </Typography>
        <Chip
          size="small"
          variant="outlined"
          label={count}
          sx={{ border: 0, bgcolor: 'transparent', color: 'text.secondary' }}
        />
      </Stack>

      {count === 0 ? (
        <Box
          sx={(theme) => ({
            borderRadius: 2,
            border: `1px dashed ${alpha(theme.palette.divider, 0.72)}`,
            backgroundColor: alpha(theme.palette.background.default, 0.32),
            px: 1.2,
            py: 1,
          })}
        >
          <Typography variant="body2" color="text.secondary">
            {emptyMessage}
          </Typography>
        </Box>
      ) : (
        <Stack spacing={1}>{children}</Stack>
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
    <SectionCard
      component="article"
      aria-label={formatTeamQueueName(t, team.teamName)}
      sx={(theme) => ({
        p: 1.5,
        borderColor: isActive ? alpha(huntPalette.amber, 0.65) : 'divider',
        backgroundImage: `linear-gradient(110deg, ${alpha(huntPalette.ember, isActive ? 0.26 : 0)}, transparent 70%), ${theme.custom.gradients.panelSurface}`,
        backgroundSize: 'auto, auto, 640px auto',
        ...(isActive ? huntWornFrame : {}),
      })}
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
                <Chip
                  size="small"
                  color="success"
                  variant="outlined"
                  sx={{ border: 0, bgcolor: 'transparent', color: 'text.secondary' }}
                  label={t('gameBoard.teamQueuePlayedOrderLabel', { order: playedOrder })}
                />
              ) : null}
              {isActive ? (
                <Chip
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={(theme) => ({
                    borderColor: alpha(theme.palette.primary.main, 0.4),
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: 'primary.light',
                    borderRadius: 0,
                  })}
                  label={t('gameBoard.teamQueueActiveChip')}
                />
              ) : null}
            </Stack>
          </Stack>
        </Stack>

        <Stack component="ul" spacing={0.75} sx={{ listStyle: 'none', p: 0, m: 0 }}>
          {team.participants.map((participant) => (
            <Box
              component="li"
              key={participant.userId}
              sx={{
                display: 'flex',
                gap: 1.25,
                alignItems: 'flex-start',
                minWidth: 0,
                '&::before': {
                  content: '""',
                  width: 5,
                  height: 5,
                  mt: '0.6em',
                  flexShrink: 0,
                  transform: 'rotate(45deg)',
                  bgcolor: 'primary.main',
                },
              }}
            >
              <Typography
                variant="body2"
                title={participant.displayName}
                sx={{ minWidth: 0, overflowWrap: 'anywhere' }}
              >
                {participant.displayName}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Stack>
    </SectionCard>
  )
}

function formatTeamQueueName(t: TFunction, teamName: string | null | undefined) {
  return formatTeamNameWithFallback(teamName, t('gameBoard.teamQueueUnnamedTeam'))
}
