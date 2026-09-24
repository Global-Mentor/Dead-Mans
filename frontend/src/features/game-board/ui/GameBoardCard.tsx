import { Box, Stack, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useTranslation } from 'react-i18next'
import type { GameBoardCell } from '../../../shared/api/contracts/index.ts'
import { resolveBackendMediaUrl } from '../../../shared/api/media-url.ts'
import { ImageFrame, SurfaceButton } from '../../../shared/ui/index.ts'
import type { GameBoardCellPlayResult } from '../model/game-board-cell-results.ts'
import { createBoardCellSx } from '../theme/board-cell-sx.ts'

interface GameBoardCardProps {
  cell: GameBoardCell | undefined
  category: string
  rowLabel: string
  activeCellId: string | null
  playResult: GameBoardCellPlayResult | undefined
  canOpenCells: boolean
  onCellRequestOpen: (cell: GameBoardCell) => void
  onCellPreviewMedia: (cell: GameBoardCell) => void
  onCellOpenCurrentRound?: ((cell: GameBoardCell) => void) | undefined
}

export function GameBoardCard({
  cell,
  category,
  rowLabel,
  activeCellId,
  playResult,
  canOpenCells,
  onCellRequestOpen,
  onCellPreviewMedia,
  onCellOpenCurrentRound,
}: GameBoardCardProps) {
  const { t } = useTranslation()
  const isOpen = cell?.state === 'open'
  const isCancelled = cell?.state === 'cancelled'
  const isRevealed = isOpen || isCancelled
  const isClickable = Boolean(cell) && cell?.state === 'closed' && canOpenCells
  const isPlayed = Boolean(playResult)
  const isActiveRound = cell?.id === activeCellId
  const isCurrentRoundCell = isActiveRound && !isPlayed
  const opensCurrentRound = isCurrentRoundCell && isOpen && Boolean(onCellOpenCurrentRound)
  const previewMediaUrl = isRevealed ? resolveBackendMediaUrl(cell?.media[0]?.url) : ''
  const hasPreviewMedia = previewMediaUrl.length > 0
  const isPreviewable = Boolean(cell) && isRevealed
  const isInteractive = isClickable || isPreviewable

  return (
    <SurfaceButton
      type="button"
      disabled={!isInteractive}
      disableRipple
      data-cell-id={cell?.id}
      title={cell ? `${category} · ${rowLabel}` : undefined}
      aria-label={
        cell
          ? opensCurrentRound
            ? t('gameBoard.currentRoundScreen.open')
            : isPreviewable
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
        if (cell && opensCurrentRound) {
          onCellOpenCurrentRound?.(cell)
          return
        }

        if (cell?.state === 'closed' && canOpenCells) {
          onCellRequestOpen(cell)
          return
        }

        if (cell && isPreviewable) {
          onCellPreviewMedia(cell)
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
        <ImageFrame
          src={previewMediaUrl}
          alt=""
          decorative
          fit="cover"
          loading="lazy"
          loadingLabel={t('common.media.loading')}
          errorLabel={t('common.media.error')}
          sx={{
            position: 'absolute',
            inset: 0,
            height: '100%',
            opacity: 0.24,
            filter: 'saturate(0.96)',
            pointerEvents: 'none',
          }}
        />
      ) : null}
      {isCurrentRoundCell ? (
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
            fontSize: '0.63rem',
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
      {!isCurrentRoundCell ? (
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
            '& .MuiTypography-body2, & .MuiTypography-subtitle2': { fontSize: '0.9rem' },
            '& .MuiTypography-caption': { fontSize: '0.7875rem' },
            '@container (max-width: 130px)': {
              '& .MuiTypography-root:not([data-card-value])': {
                fontSize: 'clamp(10px, 10cqw, 12px)',
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
                      overflowWrap: 'anywhere',
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
                    fontSize: 'clamp(12.6px, 18cqw, 27px)',
                    color: 'primary.light',
                  }}
                >
                  {t('gameBoard.costLabel', { cost: cell.cost })}
                </Typography>
              ) : null}
            </>
          ) : (
            <Typography variant="caption" color="text.disabled">
              -
            </Typography>
          )}
        </Box>
      ) : null}
    </SurfaceButton>
  )
}

function PlayedCellSummary({ playResult }: { playResult: GameBoardCellPlayResult }) {
  const { t } = useTranslation()
  const finalScore = playResult.scoreDetails.finalScore
  const penaltyTotal = playResult.scoreDetails.penaltyTotal
  const hasPenalty = penaltyTotal > 0
  const resultColor = finalScore < 0 ? 'error.main' : 'success.main'

  return (
    <Stack spacing={0.5} alignItems="center" sx={{ width: '100%', minWidth: 0 }}>
      <Typography
        data-testid="played-cell-result-label"
        variant="subtitle2"
        color={resultColor}
        sx={{ fontWeight: 850, lineHeight: 1, whiteSpace: 'nowrap' }}
      >
        {t(hasPenalty ? 'gameBoard.cellPlayedPenaltyLabel' : 'gameBoard.cellPlayedScoreLabel')}
      </Typography>
      <Typography
        data-card-value
        data-testid="played-cell-result-points"
        variant="h6"
        color={resultColor}
        sx={{
          fontWeight: 950,
          fontSize: 'clamp(10px, 16.2cqw, 21.6px)',
          lineHeight: 1,
          whiteSpace: 'nowrap',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {t('gameBoard.cellPlayedPoints', { score: hasPenalty ? penaltyTotal : finalScore })}
      </Typography>
    </Stack>
  )
}
