import { Box, Chip, Typography } from '@mui/material'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameBoardCell, GameBoardSnapshot } from '../../../shared/api/contracts/index.ts'
import { BoardMatrix } from '../../../shared/ui/index.ts'

interface GameBoardGridProps {
  snapshot: GameBoardSnapshot
  canOpenCells: boolean
  onCellRequestOpen: (cell: GameBoardCell) => void
}

export function GameBoardGrid({ snapshot, canOpenCells, onCellRequestOpen }: GameBoardGridProps) {
  const { t } = useTranslation()
  const cellMap = useMemo(() => {
    return new Map(snapshot.cells.map((cell) => [`${cell.row}:${cell.col}`, cell] as const))
  }, [snapshot.cells])

  return (
    <Box sx={{ mt: 2 }}>
      <BoardMatrix
        colLabels={snapshot.colLabels}
        rowLabels={snapshot.rowLabels}
        minWidth={480}
        gap={0.5}
        leadCell={<Box sx={{ textAlign: 'center', fontWeight: 700 }}> </Box>}
        renderColumnLabel={(col) => (
          <Box
            sx={{
              textAlign: 'center',
              fontWeight: 600,
              fontSize: { xs: '0.7rem', sm: '0.8rem' },
              px: 0.5,
            }}
          >
            {col}
          </Box>
        )}
        renderRowLabel={(rowLabel) => (
          <Box
            sx={{
              textAlign: 'center',
              fontWeight: 600,
              fontSize: { xs: '0.7rem', sm: '0.8rem' },
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              px: 0.5,
            }}
          >
            {rowLabel}
          </Box>
        )}
        renderCell={(rowIndex, colIndex, rowLabel) => {
          const cell = cellMap.get(`${rowIndex}:${colIndex}`)
          const isOpen = cell?.state === 'open'
          const url = isOpen ? cell?.media[0]?.url : undefined
          const isClickable = Boolean(cell) && !isOpen && canOpenCells

          return (
            <Box
              role={isClickable ? 'button' : undefined}
              tabIndex={isClickable ? 0 : undefined}
              aria-disabled={isClickable ? undefined : true}
              aria-label={
                cell
                  ? t('gameBoard.openConfirmDescription', {
                      cost: cell.cost,
                      row: cell.row,
                      col: cell.col,
                    })
                  : undefined
              }
              onClick={() => {
                if (cell && !isOpen && canOpenCells) {
                  onCellRequestOpen(cell)
                }
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  if (cell && !isOpen && canOpenCells) {
                    onCellRequestOpen(cell)
                  }
                }
              }}
              sx={{
                border: '1px solid',
                borderColor: isOpen ? 'primary.main' : 'divider',
                borderWidth: isOpen ? 2 : 1,
                borderRadius: 1,
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                aspectRatio: '5 / 6',
                gap: 0.5,
                p: 0.5,
                cursor: isClickable ? 'pointer' : 'default',
                transition: 'border-color 0.15s ease, transform 0.15s ease',
                '&:hover': isClickable
                  ? {
                      borderColor: 'primary.light',
                      transform: 'translateY(-1px)',
                    }
                  : undefined,
                '&:focus-visible': isClickable
                  ? {
                      outline: '2px solid',
                      outlineColor: 'primary.main',
                      outlineOffset: 2,
                    }
                  : undefined,
              }}
            >
              {url ? (
                <Box
                  component="img"
                  src={url}
                  alt={cell?.title ?? rowLabel}
                  loading="lazy"
                  decoding="async"
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              ) : null}
              <Box
                sx={{
                  position: 'relative',
                  zIndex: 1,
                  textAlign: 'center',
                  px: 0.5,
                  pointerEvents: 'none',
                }}
              >
                {cell ? (
                  <>
                    {isOpen && !url ? (
                      <Typography variant="subtitle2" color="text.primary">
                        {cell.title || t('gameBoard.cellLabel')}
                      </Typography>
                    ) : null}
                    {!isOpen ? (
                      <Typography
                        variant="subtitle2"
                        color="text.secondary"
                        sx={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}
                      >
                        {t('gameBoard.closedCellLabel')}
                      </Typography>
                    ) : null}
                    <Chip size="small" label={t('gameBoard.costLabel', { cost: cell.cost })} />
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
