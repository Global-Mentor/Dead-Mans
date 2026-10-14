import { memo, useState } from 'react'
import type { components } from '../../shared/api/contracts/generated'
import { Box } from '@mui/material'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  BroadcastBackdrop,
  BroadcastTeam,
  BroadcastBoard,
  BroadcastRound,
  BroadcastGameplay,
  BroadcastSummary,
} from '../../shared/game-ui/index.ts'
import { useOverlayFrame } from './use-overlay-frame.ts'
import { OverlayPresence } from './OverlayPresence.tsx'

const centeredSceneSx = {
  position: 'absolute',
  left: '50%',
  top: '50%',
  width: 'min(1152px, 100%)',
  height: 'var(--overlay-scene-height)',
  transform: 'translate(-50%, -50%)',
}

export function GameOverlayPage() {
  const { hash } = useLocation()
  const key = new URLSearchParams(hash.slice(1)).get('key') ?? ''
  return <OverlaySession key={key} overlayKey={key} />
}

function OverlaySession({ overlayKey }: { overlayKey: string }) {
  const state = useOverlayFrame(overlayKey)
  return (
    <OverlayFrame
      frame={state?.snapshot}
      receivedAtMonotonicMs={
        state?.snapshot.phase === 'in_progress' ? state.receivedAtMonotonicMs : 0
      }
    />
  )
}

const OverlayFrame = memo(function OverlayFrame({
  frame,
  receivedAtMonotonicMs,
}: {
  frame: components['schemas']['GameOverlaySnapshotDto'] | undefined
  receivedAtMonotonicMs: number
}) {
  const { t } = useTranslation()
  const [boardWidth, setBoardWidth] = useState<number>()
  const showTeam =
    frame?.phase === 'select_card' ||
    frame?.phase === 'card_opened' ||
    frame?.phase === 'awaiting_modifiers' ||
    frame?.phase === 'preparing' ||
    frame?.phase === 'reviewing_results' ||
    frame?.phase === 'showing_results'
  return (
    <Box
      component="main"
      data-testid="obs-overlay"
      aria-label={t('gameOverlay.title')}
      sx={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {frame?.team ? (
        <>
          <BroadcastBackdrop
            visible={Boolean(
              (frame.phase === 'select_card' && frame.board) ||
              frame.summary ||
              (showTeam && frame.round),
            )}
          />
          <Box
            sx={{
              position: 'absolute',
              right: 24,
              top: 24,
              bottom: 24,
              width: 'min(360px, 25vw)',
            }}
          >
            <OverlayPresence direction="left">
              {frame.phase === 'in_progress' && frame.gameplay ? (
                <BroadcastGameplay
                  key={frame.gameplay.roundId}
                  gameplay={frame.gameplay}
                  receivedAtMonotonicMs={receivedAtMonotonicMs}
                  labels={{
                    modifiers: t('gameOverlay.modifiers'),
                    stackedName: (name, count) => t('gameOverlay.stackedName', { name, count }),
                    timer: (name) => t('gameOverlay.modifierTimer', { name }),
                  }}
                />
              ) : null}
            </OverlayPresence>
          </Box>
          <Box
            sx={{
              position: 'absolute',
              inset: 24,
              display: 'grid',
              gridTemplateRows: 'auto minmax(0, 1fr)',
              gap: showTeam ? 1.5 : 0,
              transition: 'gap 180ms ease',
              '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
            }}
          >
            <Box
              style={{
                width: frame.phase === 'select_card' && frame.board ? boardWidth : undefined,
              }}
              sx={{
                width: 'min(1152px, 100%)',
                justifySelf: 'center',
                display: 'grid',
                gridTemplateRows: showTeam ? '1fr' : '0fr',
                overflow: 'hidden',
                visibility: showTeam ? 'visible' : 'hidden',
                opacity: showTeam ? 1 : 0,
                transition: `opacity 180ms ease, grid-template-rows 180ms ease, visibility 0ms ${showTeam ? 0 : 180}ms`,
                '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
              }}
            >
              <Box sx={{ minHeight: 0, overflow: 'hidden' }}>
                <OverlayPresence key={`${frame.gameId}:${frame.team.slotIndex}`} delay={0}>
                  <BroadcastTeam
                    name={
                      (frame.summary ? frame.summary.teamName : frame.team.name) ||
                      t('gameOverlay.teamFallback', {
                        number: frame.summary?.teamSlotIndex ?? frame.team.slotIndex,
                      })
                    }
                    participants={frame.team.players}
                    label={t('gameOverlay.activeTeam')}
                    emptyLabel={t('gameOverlay.emptyRoster')}
                  />
                </OverlayPresence>
              </Box>
            </Box>
            <Box
              data-testid="overlay-scene-region"
              sx={{
                position: 'relative',
                minHeight: 0,
                containerType: 'size',
                '--overlay-scene-height': 'min(900px, 100cqh)',
                '--overlay-content-height': 'min(720px, var(--overlay-scene-height))',
                '--overlay-card-height': 'min(650px, calc(var(--overlay-scene-height) - 216px))',
              }}
            >
              <Box sx={{ ...centeredSceneSx, width: 'min(1600px, 100%)', height: '100%' }}>
                <OverlayPresence>
                  {frame.phase === 'select_card' && frame.board ? (
                    <BroadcastBoard
                      board={frame.board}
                      label={t('gameOverlay.board')}
                      onWidthChange={setBoardWidth}
                    />
                  ) : null}
                </OverlayPresence>
              </Box>
              <Box sx={{ ...centeredSceneSx, top: 0, transform: 'translateX(-50%)' }}>
                <OverlayPresence>
                  {frame.summary ? (
                    <BroadcastSummary
                      key={frame.summary.roundId}
                      summary={frame.summary}
                      labels={{
                        heading: t(
                          frame.summary.isFinal
                            ? 'gameOverlay.summaryFinal'
                            : 'gameOverlay.summaryReview',
                        ),
                        total: t(
                          frame.summary.isFinal
                            ? 'common.scoreBreakdown.final'
                            : 'common.scoreBreakdown.previewTotal',
                        ),
                        outcome: t(
                          frame.summary.scoreDetails.finalScore < 0
                            ? 'gameOverlay.summaryPenalty'
                            : 'gameOverlay.summaryEarned',
                          {
                            points: Math.abs(frame.summary.scoreDetails.finalScore),
                          },
                        ),
                        card: t('gameOverlay.card'),
                        cost: t('boardCard.cellCostLabel', { cost: frame.summary.card.cost }),
                        loading: t('gameOverlay.imageLoading'),
                        imageError: t('gameOverlay.imageError'),
                      }}
                    />
                  ) : null}
                </OverlayPresence>
              </Box>
              <Box sx={{ ...centeredSceneSx, top: 0, transform: 'translateX(-50%)' }}>
                <OverlayPresence>
                  {!frame.summary && frame.round ? (
                    <BroadcastRound
                      key={frame.round.id}
                      round={frame.round}
                      labels={{
                        card: t('gameOverlay.card'),
                        cost: t('boardCard.cellCostLabel', { cost: frame.round.cost }),
                        modifiers: t('gameOverlay.modifiers'),
                        phaseLabel: t('gameOverlay.phaseLabel'),
                        phase: t(
                          frame.phase === 'awaiting_modifiers'
                            ? 'gameOverlay.modifierSelection'
                            : frame.phase === 'preparing'
                              ? 'gameOverlay.preparing'
                              : 'gameOverlay.cardOpened',
                        ),
                        total: t('gameOverlay.totalModifiers', {
                          count: frame.round.modifiers.length,
                        }),
                        loading: t('gameOverlay.imageLoading'),
                        imageError: t('gameOverlay.imageError'),
                        stackedName: (name, count) => t('gameOverlay.stackedName', { name, count }),
                      }}
                    />
                  ) : null}
                </OverlayPresence>
              </Box>
            </Box>
          </Box>
        </>
      ) : null}
    </Box>
  )
})
