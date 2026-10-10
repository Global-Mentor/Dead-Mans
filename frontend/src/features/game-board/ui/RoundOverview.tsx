import { Box, Stack, Typography } from '@mui/material'
import { type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  GameBoardCell,
  GameBoardSnapshot,
  GameModifierState,
  GameTeamQueueItem,
} from '../../../shared/api/contracts/index.ts'
import type { components } from '../../../shared/api/contracts/generated'
import { TeamBriefing, RoundBriefingPanel } from '../../../shared/game-ui/index.ts'
import { AppButton, InlineNotice, ItemCard } from '../../../shared/ui/index.ts'
import { formatTeamNameWithFallback } from '../../game-registration/model/team-name.ts'
import { buildGameManagementFlow } from '../model/game-management-flow.ts'
import { RoundCardSection } from './RoundCardSection.tsx'
import { RoundActiveModifiers } from './RoundActiveModifiers.tsx'

type GameRoundDetails = components['schemas']['GameRoundDetailsDto']

export function RoundOverview({
  snapshot,
  round,
  cell,
  selectedTeam,
  teamLoading,
  teamError,
  onRetryTeam,
  roundLoading,
  roundError,
  modifiers,
  modifiersLoading,
  modifiersError,
  isOffline,
  onRetryModifiers,
  phaseActions,
}: {
  snapshot: GameBoardSnapshot
  round: GameRoundDetails | null
  cell: GameBoardCell | null
  selectedTeam: GameTeamQueueItem | null
  teamLoading: boolean
  teamError: boolean
  onRetryTeam: () => void
  roundLoading: boolean
  roundError: boolean
  modifiers: GameModifierState | null
  modifiersLoading: boolean
  modifiersError: boolean
  isOffline: boolean
  onRetryModifiers: () => void
  phaseActions: ReactNode
}) {
  const { t } = useTranslation()
  const flow = buildGameManagementFlow(snapshot, round)
  const currentStep = flow.steps.find((step) => step.state === 'current')
  const active = round
    ? (modifiers?.gameId === round.gameId
        ? modifiers.activeModifiers
        : snapshot.activeModifiers
      ).filter((item) => item.roundId === round.roundId)
    : []
  const team = round ?? selectedTeam
  const phase = roundLoading
    ? t('gameBoard.currentRoundScreen.loadingRound')
    : roundError
      ? t('gameBoard.currentRoundScreen.roundUnavailable')
      : snapshot.status === 'ready'
        ? t('gameBoard.statusReady')
        : snapshot.status === 'finished'
          ? t('gameBoard.statusFinished')
          : currentStep
            ? t(currentStep.titleKey)
            : t(flow.summaryKey)
  const emptyModifiersKey =
    !round || round.status === 'card_opened'
      ? 'gameBoard.currentRoundScreen.modifiersNotStarted'
      : round.status === 'awaiting_modifiers'
        ? 'gameBoard.currentRoundScreen.modifiersChoosing'
        : 'gameBoard.currentRoundScreen.noModifiers'
  const cardWaitingMessage = t(
    roundLoading
      ? 'gameBoard.currentRoundScreen.loadingRound'
      : roundError
        ? 'gameBoard.currentRoundScreen.roundUnavailable'
        : 'gameBoard.currentRoundScreen.cardNotOpened',
  )

  return (
    <Stack
      data-testid="current-round-overview"
      sx={{
        position: 'relative',
        '--round-header-height': { xs: '160px', lg: '112px' },
        '@media (max-width:359px)': { '--round-header-height': '192px' },
      }}
    >
      <Typography
        component="h1"
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '1px',
          height: '1px',
          p: 0,
          m: '-1px',
          overflow: 'hidden',
          clipPath: 'inset(50%)',
          whiteSpace: 'nowrap',
        }}
      >
        {t('navigation.items.gameRound.label')}
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr)',
          gridTemplateAreas: '"cardMedia" "details"',
          gap: 1.5,
          alignItems: 'start',
          '@media (min-width:768px)': {
            height: 'max(680px, calc(100dvh - 128px))',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gridTemplateAreas: '"cardMedia details"',
            gridTemplateRows: 'minmax(0, 1fr)',
            alignItems: 'stretch',
          },
        }}
      >
        <RoundCardSection
          round={round}
          cell={cell}
          categoryName={cell ? (snapshot.colLabels[cell.col]?.trim() ?? '') : ''}
          waitingMessage={cardWaitingMessage}
        />
        <Box
          data-testid="round-details-panel"
          sx={{
            gridArea: 'details',
            minWidth: 0,
            minHeight: 0,
            display: 'grid',
            gap: 1.5,
            gridTemplateAreas: '"phase" "team" "modifiers"',
            gridTemplateRows: 'var(--round-header-height) auto auto',
            '@media (min-width:768px)': {
              width: '100%',
              justifySelf: 'start',
              gridTemplateRows: 'var(--round-header-height) auto minmax(0, 1fr)',
            },
          }}
        >
          <RoundBriefingPanel
            data-testid="round-phase"
            contentEmphasis="strong"
            sx={{ gridArea: 'phase' }}
            header={
              <Typography
                data-testid="round-phase-label"
                component="div"
                variant="body2"
                color="text.secondary"
                fontWeight={700}
                sx={{ textAlign: 'center' }}
              >
                {t('gameBoard.currentRoundScreen.phaseLabel')}
              </Typography>
            }
          >
            <Stack
              alignItems="center"
              justifyContent="center"
              sx={{ flex: 1, textAlign: 'center' }}
            >
              <Typography
                data-testid="round-phase-value"
                component="p"
                variant="h3"
                color="text.primary"
                fontWeight={700}
                aria-live="polite"
                aria-atomic="true"
                sx={{
                  overflowWrap: 'anywhere',
                }}
              >
                {phase}
              </Typography>
            </Stack>
            <Box
              sx={{
                flexShrink: 0,
                '&:empty': { display: 'none' },
              }}
            >
              {phaseActions}
            </Box>
          </RoundBriefingPanel>
          <ItemCard
            component="section"
            aria-label={t('gameBoard.currentRoundScreen.team')}
            emphasis={team ? 'selected' : 'none'}
            sx={{
              gridArea: 'team',
              minWidth: 0,
              minHeight: { xs: 176, md: 144 },
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Typography
              component="h2"
              variant="overline"
              color="text.secondary"
              fontWeight={600}
              sx={{ textAlign: 'center', fontSize: 12, lineHeight: 1.5, letterSpacing: 0 }}
            >
              {t('gameBoard.currentRoundScreen.team')}
            </Typography>
            <Box
              data-testid="round-team-content"
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 1.25,
                justifyContent: 'safe center',
                alignItems: 'center',
                pt: 0.5,
                textAlign: 'center',
                overflowWrap: 'anywhere',
              }}
            >
              {team ? (
                <TeamBriefing
                  name={formatTeamNameWithFallback(
                    team.teamName,
                    t('common.teamWithSlot', { slot: team.teamSlotIndex }),
                  )}
                  participants={team.participants.map((participant) => participant.displayName)}
                  emptyLabel={t('gameBoard.roundSummaryNoParticipants')}
                />
              ) : teamError && snapshot.activeTeamId ? (
                <InlineNotice
                  severity="warning"
                  action={
                    <AppButton tone="secondary" size="small" onClick={onRetryTeam}>
                      {t('common.actions.retry')}
                    </AppButton>
                  }
                >
                  {t('gameBoard.currentRoundScreen.teamUnavailable')}
                </InlineNotice>
              ) : (
                <Typography color="text.secondary" variant="body2">
                  {t(
                    roundLoading || teamLoading
                      ? 'gameBoard.currentRoundScreen.loadingRound'
                      : roundError
                        ? 'gameBoard.currentRoundScreen.roundUnavailable'
                        : snapshot.activeTeamId
                          ? 'gameBoard.currentRoundScreen.teamUnavailable'
                          : 'gameBoard.currentRoundScreen.teamNotSelected',
                  )}
                </Typography>
              )}
            </Box>
          </ItemCard>
          <RoundActiveModifiers
            key={round?.roundId ?? 'pending'}
            activations={active}
            round={round}
            modifiers={modifiers}
            isError={modifiersError}
            isOffline={isOffline}
            onRetry={onRetryModifiers}
            waitingMessage={t(
              roundLoading || (round && modifiersLoading && !modifiers)
                ? 'gameBoard.currentRoundScreen.loadingRound'
                : roundError
                  ? 'gameBoard.currentRoundScreen.roundUnavailable'
                  : emptyModifiersKey,
            )}
          />
        </Box>
      </Box>
    </Stack>
  )
}
