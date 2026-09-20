import { Box, Stack, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameBoardCell, GameBoardSnapshot } from '../../../shared/api/contracts/index.ts'
import { resolveBackendMediaUrl } from '../../../shared/api/media-url.ts'
import { GameBoardMatrix } from './GameBoardMatrix.tsx'
import { formatTeamNameWithFallback } from '../../game-registration/model/team-name.ts'
import type { GameBoardCellPlayResult } from '../model/game-board-cell-results.ts'
import { createBoardCellSx } from '../theme/board-cell-sx.ts'
import { boardGridMetrics } from '../theme/board-grid-metrics.ts'

interface GameBoardGridProps {
  snapshot: GameBoardSnapshot
  playResultsByCellId?: ReadonlyMap<string, GameBoardCellPlayResult>
  activeCellId?: string | null
  canOpenCells: boolean
  onCellRequestOpen: (cell: GameBoardCell) => void
  onCellPreviewMedia: (cell: GameBoardCell) => void
}

export function GameBoardGrid({
  snapshot,
  playResultsByCellId,
  activeCellId = null,
  canOpenCells,
  onCellRequestOpen,
  onCellPreviewMedia,
}: GameBoardGridProps) {
  const { t } = useTranslation()
  const cellMap = useMemo(() => {
    return new Map(snapshot.cells.map((cell) => [`${cell.row}:${cell.col}`, cell] as const))
  }, [snapshot.cells])

  return (
    <Box sx={{ minWidth: 0 }}>
      <GameBoardMatrix
        activeColumnIndex={snapshot.cells.find((cell) => cell.id === activeCellId)?.col}
        colLabels={snapshot.colLabels}
        rowLabels={snapshot.rowLabels}
        minWidth={520}
        gap={boardGridMetrics.gap}
        leadColumnWidth={boardGridMetrics.leadColumnWidth}
        leadCell={<Box />}
        renderColumnLabel={(col) => (
          <Box
            role="columnheader"
            title={col}
            sx={{
              textAlign: 'center',
              fontWeight: 850,
              color: 'text.primary',
              letterSpacing: '0.015em',
              px: 0.5,
              py: 0.5,
              height: '3rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              whiteSpace: 'normal',
              overflowWrap: 'anywhere',
              containerType: 'inline-size',
            }}
          >
            <Box
              component="span"
              sx={{
                fontSize: 'clamp(0.65rem, 12cqw, 0.95rem)',
                lineHeight: 1.05,
                overflowWrap: 'anywhere',
              }}
            >
              {col}
            </Box>
          </Box>
        )}
        renderRowLabel={(rowLabel) => {
          const isShortLabel = rowLabel.trim().length <= 6
          return (
            <Box
              data-board-row-label
              title={rowLabel}
              sx={{
                textAlign: 'center',
                fontWeight: 750,
                color: 'text.secondary',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                px: 0.35,
                overflowWrap: 'anywhere',
                containerType: 'inline-size',
              }}
            >
              <Box
                component="span"
                sx={{
                  fontSize: isShortLabel ? '0.76rem' : 'clamp(0.6rem, 22cqw, 0.76rem)',
                  lineHeight: 1.05,
                  overflowWrap: 'anywhere',
                }}
              >
                {rowLabel}
              </Box>
            </Box>
          )
        }}
        renderCell={(rowIndex, colIndex) => {
          const cell = cellMap.get(`${rowIndex}:${colIndex}`)
          const isOpen = cell?.state === 'open'
          const isCancelled = cell?.state === 'cancelled'
          const isRevealed = isOpen || isCancelled
          const isClickable = Boolean(cell) && cell?.state === 'closed' && canOpenCells
          const playResult = cell ? playResultsByCellId?.get(cell.id) : undefined
          const isPlayed = Boolean(playResult)
          const isActiveRound = cell?.id === activeCellId
          const previewMediaUrl = isRevealed ? resolveBackendMediaUrl(cell?.media[0]?.url) : ''
          const hasPreviewMedia = previewMediaUrl.length > 0
          const isPreviewable = Boolean(cell) && isRevealed
          const isInteractive = isClickable || isPreviewable

          return (
            <Box
              role={isInteractive ? 'button' : undefined}
              tabIndex={isInteractive ? 0 : undefined}
              aria-disabled={isInteractive ? undefined : true}
              data-cell-id={cell?.id}
              title={
                cell
                  ? `${snapshot.colLabels[colIndex]} · ${snapshot.rowLabels[rowIndex]}`
                  : undefined
              }
              aria-label={
                cell
                  ? isPreviewable
                    ? t('gameBoard.cellMediaPreviewAction', {
                        title: cell.title || t('gameBoard.cellLabel'),
                      })
                    : t('gameBoard.cellOpenAction', {
                        title: cell.title || t('gameBoard.cellLabel'),
                        cost: cell.cost,
                      })
                  : undefined
              }
              onClick={() => {
                if (cell?.state === 'closed' && canOpenCells) {
                  onCellRequestOpen(cell)
                  return
                }

                if (cell && isPreviewable) {
                  onCellPreviewMedia(cell)
                }
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  if (cell?.state === 'closed' && canOpenCells) {
                    onCellRequestOpen(cell)
                    return
                  }

                  if (cell && isPreviewable) {
                    onCellPreviewMedia(cell)
                  }
                }
              }}
              sx={createBoardCellSx({
                isOpen: isRevealed,
                isInteractive,
                isPlayed,
                isActiveRound,
              })}
            >
              {hasPreviewMedia ? (
                <Box
                  component="img"
                  src={previewMediaUrl}
                  alt={cell?.title || t('gameBoard.cellMediaDialogTitle')}
                  loading="lazy"
                  decoding="async"
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    opacity: 0.24,
                    filter: 'saturate(0.96)',
                    pointerEvents: 'none',
                  }}
                />
              ) : null}
              {isActiveRound && !isPlayed ? (
                <Box
                  role="status"
                  sx={(theme) => ({
                    position: 'absolute',
                    zIndex: 2,
                    top: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: alpha(theme.palette.warning.main, 0.92),
                    color: theme.palette.getContrastText(theme.palette.warning.main),
                    px: 0.6,
                    py: 0.45,
                    fontSize: '0.7rem',
                    fontWeight: 900,
                    lineHeight: 1.2,
                    textAlign: 'center',
                  })}
                >
                  {t('gameBoard.cellActiveRound')}
                </Box>
              ) : null}
              {isRevealed ? (
                <Box
                  sx={(theme) => ({
                    position: 'absolute',
                    inset: 0,
                    background: hasPreviewMedia
                      ? `linear-gradient(180deg, rgba(7,10,16,0.08) 0%, rgba(7,10,16,0.26) 52%, ${theme.palette.background.paper} 100%)`
                      : 'transparent',
                    pointerEvents: 'none',
                  })}
                />
              ) : null}
              <Box
                sx={{
                  position: 'relative',
                  zIndex: 1,
                  textAlign: 'center',
                  width: '100%',
                  minWidth: 0,
                  px: 0.35,
                  pointerEvents: 'none',
                  '& [data-card-compact]': { display: 'none' },
                  '@container (max-width: 130px)': {
                    '& .MuiTypography-root:not([data-card-value])': {
                      fontSize: 12,
                      lineHeight: 1.15,
                      overflowWrap: 'anywhere',
                    },
                  },
                  '@container (max-width: 100px)': {
                    '& [data-card-secondary]': { display: 'none' },
                    '& [data-card-compact]': { display: 'block' },
                  },
                }}
              >
                {cell ? (
                  <>
                    {isPlayed && playResult ? (
                      <PlayedCellSummary playResult={playResult} />
                    ) : isCancelled ? (
                      <Stack spacing={0.45} alignItems="center" sx={{ minWidth: 0 }}>
                        <Typography variant="body2" color="text.primary" sx={{ fontWeight: 800 }}>
                          {cell.title || t('gameBoard.cellLabel')}
                        </Typography>
                        <Typography
                          data-card-secondary
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontWeight: 700 }}
                        >
                          {t('gameBoard.cellCostLabel', { cost: cell.cost })}
                        </Typography>
                        <Typography
                          data-card-secondary
                          variant="caption"
                          color="error.main"
                          sx={{ fontWeight: 850 }}
                        >
                          {t('gameBoard.cellTechnicalCancelled')}
                        </Typography>
                        <Typography data-card-compact variant="caption" color="error.main">
                          {t('gameBoard.cellCancelledShort')}
                        </Typography>
                      </Stack>
                    ) : isOpen ? (
                      <Stack spacing={0.45} alignItems="center" sx={{ minWidth: 0 }}>
                        <Typography
                          variant="body2"
                          color="text.primary"
                          sx={{
                            display: '-webkit-box',
                            WebkitBoxOrient: 'vertical',
                            WebkitLineClamp: 2,
                            overflow: 'hidden',
                            fontWeight: 750,
                            lineHeight: 1.2,
                          }}
                        >
                          {cell.title || t('gameBoard.cellLabel')}
                        </Typography>
                        <Typography
                          data-card-secondary
                          variant="caption"
                          color="text.primary"
                          sx={{ fontWeight: 800, lineHeight: 1.15 }}
                        >
                          {t('gameBoard.cellCostLabel', { cost: cell.cost })}
                        </Typography>
                        <Typography
                          data-card-secondary
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontWeight: 700, lineHeight: 1.15 }}
                        >
                          {t('gameBoard.cellOpenPendingResult')}
                        </Typography>
                      </Stack>
                    ) : null}
                    {!isRevealed ? (
                      <Typography
                        data-card-value
                        variant="h6"
                        color="text.primary"
                        sx={{
                          fontWeight: 700,
                          lineHeight: 1,
                          fontSize: 'clamp(14px, 20cqw, 30px)',
                          color: 'primary.light',
                        }}
                      >
                        {t('gameBoard.costLabel', { cost: cell.cost })}
                      </Typography>
                    ) : null}
                  </>
                ) : (
                  <Typography variant="caption" color="text.disabled">
                    —
                  </Typography>
                )}
              </Box>
            </Box>
          )
        }}
      />
    </Box>
  )
}

function PlayedCellSummary({ playResult }: { playResult: GameBoardCellPlayResult }) {
  const { t } = useTranslation()
  const visibleParticipants = playResult.participants.slice(0, 3)
  const hiddenParticipantCount = Math.max(
    0,
    playResult.participants.length - visibleParticipants.length,
  )
  const finalScore = playResult.scoreDetails.finalScore
  const penaltyTotal = playResult.scoreDetails.penaltyTotal
  const teamName = formatTeamNameWithFallback(
    playResult.teamName,
    t('common.teamWithSlot', { slot: playResult.teamSlotIndex }),
  )

  return (
    <Stack spacing={0.45} alignItems="center" sx={{ width: '100%', minWidth: 0 }}>
      <Typography
        variant="body2"
        color="text.primary"
        sx={{
          width: '100%',
          fontWeight: 850,
          lineHeight: 1.15,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {teamName}
      </Typography>
      <Stack
        data-card-secondary
        spacing={0.1}
        alignItems="center"
        sx={{
          width: '100%',
          maxHeight: '3.7em',
          overflow: 'hidden',
        }}
      >
        {visibleParticipants.length > 0 ? (
          visibleParticipants.map((participant) => (
            <Typography
              key={participant.userId}
              variant="caption"
              color="text.secondary"
              sx={{
                width: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                lineHeight: 1.12,
              }}
            >
              {participant.displayName.trim() || participant.userId}
            </Typography>
          ))
        ) : (
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.12 }}>
            {t('gameBoard.cellPlayedNoParticipants')}
          </Typography>
        )}
        {hiddenParticipantCount > 0 ? (
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.12 }}>
            {t('gameBoard.cellPlayedMoreParticipants', { count: hiddenParticipantCount })}
          </Typography>
        ) : null}
      </Stack>
      <Typography
        variant="subtitle2"
        color={finalScore < 0 ? 'error.main' : 'success.main'}
        sx={{ fontWeight: 950, lineHeight: 1 }}
      >
        {penaltyTotal > 0
          ? t('gameBoard.cellPlayedPenalty', { score: penaltyTotal })
          : t('gameBoard.cellPlayedScore', { score: finalScore })}
      </Typography>
    </Stack>
  )
}
