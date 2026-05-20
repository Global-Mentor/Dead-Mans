import { Box, Paper, TextField, Typography } from '@mui/material'
import { Fragment, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameSetupSnapshot } from '../../../shared/api/contracts/index.ts'

interface GameSetupGridProps {
  snapshot: GameSetupSnapshot
}

export function GameSetupGrid({ snapshot }: GameSetupGridProps) {
  const { t } = useTranslation()
  const cellMap = useMemo(() => {
    return new Map(snapshot.cells.map((cell) => [`${cell.row}:${cell.col}`, cell] as const))
  }, [snapshot.cells])

  return (
    <Box sx={{ mt: 3, overflow: 'auto' }}>
      <Box sx={{ minWidth: { xs: 680, sm: 'auto' } }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `auto repeat(${snapshot.colLabels.length}, 1fr)`,
            columnGap: 0.75,
            rowGap: 0.75,
            mb: 1,
            alignItems: 'center',
          }}
        >
          <Box sx={{ width: 36 }} />
          {snapshot.colLabels.map((columnLabel, columnIndex) => (
            <TextField
              key={`${columnIndex}-${columnLabel}`}
              label={t('gameSetup.columnLabel', { column: columnIndex + 1 })}
              defaultValue={columnLabel}
              size="small"
              inputProps={{ sx: { textAlign: 'center', fontWeight: 600 } }}
            />
          ))}
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `auto repeat(${snapshot.colLabels.length}, 1fr)`,
            columnGap: 0.75,
            rowGap: 0.75,
            alignItems: 'stretch',
          }}
        >
          {snapshot.rowLabels.map((rowLabel, rowIndex) => (
            <Fragment key={rowLabel}>
              <Box
                sx={{
                  width: 36,
                  textAlign: 'center',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'text.secondary',
                }}
              >
                {rowLabel}
              </Box>
              {snapshot.colLabels.map((_, colIndex) => {
                const cell = cellMap.get(`${rowIndex}:${colIndex}`)
                const imageUrl = cell?.media[0]?.url

                return (
                  <Paper
                    key={`${rowLabel}-${colIndex}`}
                    variant="outlined"
                    sx={{
                      p: 1,
                      aspectRatio: '5 / 6',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1,
                      borderStyle: 'dashed',
                      bgcolor: 'rgba(255,255,255,0.02)',
                    }}
                  >
                    <Box
                      sx={{
                        flex: 1,
                        borderRadius: 1,
                        border: '1px dashed',
                        borderColor: 'divider',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        px: 1,
                        color: 'text.secondary',
                        overflow: 'hidden',
                        position: 'relative',
                      }}
                    >
                      {imageUrl ? (
                        <Box
                          component="img"
                          src={imageUrl}
                          alt={cell?.title ?? rowLabel}
                          sx={{
                            position: 'absolute',
                            inset: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                      ) : (
                        <Typography variant="caption">{t('gameSetup.imagePlaceholder')}</Typography>
                      )}
                    </Box>
                    <TextField
                      label={t('gameSetup.cellTitleLabel')}
                      defaultValue={cell?.title ?? ''}
                      size="small"
                    />
                    <TextField
                      label={t('gameSetup.cellPriceLabel')}
                      defaultValue={cell?.cost ?? 0}
                      size="small"
                      type="number"
                    />
                  </Paper>
                )
              })}
            </Fragment>
          ))}
        </Box>
      </Box>
    </Box>
  )
}
