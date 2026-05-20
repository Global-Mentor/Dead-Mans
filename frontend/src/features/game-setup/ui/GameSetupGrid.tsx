import { Box, Paper, TextField, Typography } from '@mui/material'
import { Fragment, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameSetupSnapshot } from '../../../shared/api/contracts/index.ts'
import {
  getGameSetupCellAt,
  upsertGameSetupCellDraft,
  type GameSetupDraftState,
} from '../model/game-setup-draft.ts'

interface GameSetupGridProps {
  snapshot: GameSetupSnapshot
  draft: GameSetupDraftState
  onDraftChange: (updater: (current: GameSetupDraftState) => GameSetupDraftState) => void
}

export function GameSetupGrid({ snapshot, draft, onDraftChange }: GameSetupGridProps) {
  const { t } = useTranslation()
  const mediaUrlByCellId = useMemo(() => {
    return new Map(
      snapshot.cells
        .filter((cell) => cell.media[0]?.url)
        .map((cell) => [cell.id, cell.media[0]!.url] as const),
    )
  }, [snapshot.cells])

  return (
    <Box sx={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
      <Box sx={{ minWidth: { xs: 680, sm: 'auto' } }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `auto repeat(${draft.colLabels.length}, 1fr)`,
            columnGap: 0.75,
            rowGap: 0.75,
            mb: 1,
            alignItems: 'center',
          }}
        >
          <Box sx={{ minWidth: 72 }} />
          {draft.colLabels.map((columnLabel, columnIndex) => (
            <TextField
              key={`column-${columnIndex}`}
              label={t('gameSetup.columnLabel', { column: columnIndex + 1 })}
              value={columnLabel}
              onChange={(event) => {
                const nextValue = event.target.value
                onDraftChange((current) => ({
                  ...current,
                  colLabels: current.colLabels.map((label, index) =>
                    index === columnIndex ? nextValue : label,
                  ),
                }))
              }}
              size="small"
              inputProps={{ sx: { textAlign: 'center', fontWeight: 600 } }}
            />
          ))}
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `auto repeat(${draft.colLabels.length}, 1fr)`,
            columnGap: 0.75,
            rowGap: 0.75,
            alignItems: 'stretch',
          }}
        >
          {draft.rowLabels.map((rowLabel, rowIndex) => (
            <Fragment key={`row-${rowIndex}`}>
              <TextField
                label={t('gameSetup.rowLabel', { row: rowIndex + 1 })}
                value={rowLabel}
                onChange={(event) => {
                  const nextValue = event.target.value
                  onDraftChange((current) => ({
                    ...current,
                    rowLabels: current.rowLabels.map((label, index) =>
                      index === rowIndex ? nextValue : label,
                    ),
                  }))
                }}
                size="small"
                inputProps={{ sx: { textAlign: 'center', fontWeight: 600 } }}
              />
              {draft.colLabels.map((_, colIndex) => {
                const cellDraft = getGameSetupCellAt(draft, rowIndex, colIndex)
                const imageUrl = cellDraft?.id ? mediaUrlByCellId.get(cellDraft.id) : undefined

                return (
                  <Paper
                    key={`${rowIndex}-${colIndex}`}
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
                          alt={cellDraft?.title ?? rowLabel}
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
                      value={cellDraft?.title ?? ''}
                      onChange={(event) => {
                        const nextValue = event.target.value
                        onDraftChange((current) =>
                          upsertGameSetupCellDraft(current, rowIndex, colIndex, {
                            title: nextValue,
                          }),
                        )
                      }}
                      size="small"
                    />
                    <TextField
                      label={t('gameSetup.cellPriceLabel')}
                      value={cellDraft?.cost ?? 0}
                      onChange={(event) => {
                        const parsed = Number.parseInt(event.target.value, 10)
                        const nextCost = Number.isNaN(parsed) ? 0 : Math.max(0, parsed)
                        onDraftChange((current) =>
                          upsertGameSetupCellDraft(current, rowIndex, colIndex, {
                            cost: nextCost,
                          }),
                        )
                      }}
                      size="small"
                      type="number"
                      inputProps={{ min: 0 }}
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
