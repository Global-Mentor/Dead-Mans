import { Box, Paper, TextField } from '@mui/material'
import { Fragment, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameSetupSnapshot } from '../../../shared/api/contracts/index.ts'
import {
  getGameSetupCellAt,
  upsertGameSetupCellDraft,
  type GameSetupDraftState,
} from '../model/game-setup-draft.ts'
import type { GameSetupCellMediaDisplayState } from '../model/game-setup-cell-media-display.ts'
import { resolveGameSetupCellImageUrl } from '../model/game-setup-cell-media-display.ts'
import {
  GAME_SETUP_MAX_CELL_TITLE_LENGTH,
  GAME_SETUP_MAX_COLUMN_LABEL_LENGTH,
  GAME_SETUP_MAX_ROW_LABEL_LENGTH,
} from '../model/game-setup-limits.ts'
import { GameSetupCellImage } from './GameSetupCellImage.tsx'

interface GameSetupGridProps {
  snapshot: GameSetupSnapshot
  draft: GameSetupDraftState
  onDraftChange: (updater: (current: GameSetupDraftState) => GameSetupDraftState) => void
  cellMediaDisplayByCellId: Record<string, GameSetupCellMediaDisplayState>
  isCellMediaBusy: (cellId: string | undefined) => boolean
  onUploadCellMedia: (cellId: string | undefined, file: File) => void
  onDeleteCellMedia: (cellId: string | undefined) => void
}

export function GameSetupGrid({
  snapshot,
  draft,
  onDraftChange,
  cellMediaDisplayByCellId,
  isCellMediaBusy,
  onUploadCellMedia,
  onDeleteCellMedia,
}: GameSetupGridProps) {
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
              inputProps={{
                maxLength: GAME_SETUP_MAX_COLUMN_LABEL_LENGTH,
                sx: { textAlign: 'center', fontWeight: 600 },
              }}
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
                inputProps={{
                  maxLength: GAME_SETUP_MAX_ROW_LABEL_LENGTH,
                  sx: { textAlign: 'center', fontWeight: 600 },
                }}
              />
              {draft.colLabels.map((_, colIndex) => {
                const cellDraft = getGameSetupCellAt(draft, rowIndex, colIndex)
                const cellId = cellDraft?.id
                const serverImageUrl = cellId ? mediaUrlByCellId.get(cellId) : undefined
                const cellDisplay = cellId ? cellMediaDisplayByCellId[cellId] : undefined
                const imageUrl = resolveGameSetupCellImageUrl(serverImageUrl, cellDisplay)
                const cellImageBusy = isCellMediaBusy(cellId)
                const imageKey = cellId
                  ? `${cellId}:${cellDisplay?.cacheRevision ?? 0}:${cellDisplay?.phase ?? 'idle'}`
                  : undefined

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
                    <GameSetupCellImage
                      imageUrl={imageUrl}
                      imageKey={imageKey}
                      alt={cellDraft?.title ?? rowLabel}
                      cellId={cellId}
                      phase={cellDisplay?.phase ?? 'idle'}
                      canManageMedia
                      isBusy={cellImageBusy}
                      onUpload={onUploadCellMedia}
                      onDelete={onDeleteCellMedia}
                    />
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
                      inputProps={{ maxLength: GAME_SETUP_MAX_CELL_TITLE_LENGTH }}
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
