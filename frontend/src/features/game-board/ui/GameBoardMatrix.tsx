import { Box, Stack, Typography } from '@mui/material'
import { useId, useState, type ComponentProps } from 'react'
import { useTranslation } from 'react-i18next'
import { BoardMatrix } from '../../../shared/game-ui/index.ts'
import { ActionIcon, TabOption, TabStrip } from '../../../shared/ui/index.ts'
import { ViewportBoard } from './ViewportBoard.tsx'
import { boardGridMetrics } from '../theme/board-grid-metrics.ts'

interface GameBoardMatrixProps extends ComponentProps<typeof BoardMatrix> {
  categoryLayout?: boolean
  activeColumnIndex?: number | undefined
}

export function GameBoardMatrix({
  categoryLayout = false,
  activeColumnIndex,
  ...props
}: GameBoardMatrixProps) {
  const { t } = useTranslation()
  const [selectedColumn, setSelectedColumn] = useState<number | null>(null)
  const id = useId()
  const candidateColumn = selectedColumn ?? activeColumnIndex ?? 0
  const column =
    candidateColumn >= 0 && candidateColumn < props.colLabels.length ? candidateColumn : 0

  if (!categoryLayout || props.colLabels.length === 0)
    return (
      <ViewportBoard
        columns={props.colLabels.length}
        rows={props.rowLabels.length}
        gap={(props.gap ?? 0.75) * 8}
        cardAspectRatio={boardGridMetrics.cardAspectRatio}
        leadWidth={typeof props.leadColumnWidth === 'number' ? props.leadColumnWidth : 40}
        trailingWidth={typeof props.leadColumnWidth === 'number' ? props.leadColumnWidth : 40}
      >
        <BoardMatrix {...props} minWidth={0} trailingSpacer />
      </ViewportBoard>
    )

  return (
    <Box>
      <Stack direction="row" alignItems="center" sx={{ mb: 1, minWidth: 0 }}>
        <TabStrip
          value={column}
          onChange={(_, value: number) => setSelectedColumn(value)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          aria-label={t('gameBoard.mobileCategories')}
          appearance="category"
          sx={{ flex: 1 }}
        >
          {props.colLabels.map((label, index) => (
            <TabOption
              key={index}
              id={`${id}-tab-${index}`}
              aria-controls={`${id}-panel`}
              label={
                <Box
                  component="span"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    minWidth: 0,
                  }}
                >
                  <Box
                    component="span"
                    sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {label}
                  </Box>
                  {index === activeColumnIndex ? (
                    <Box
                      component="span"
                      aria-label={t('gameBoard.cellActiveRound')}
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        bgcolor: 'primary.light',
                        flexShrink: 0,
                      }}
                    />
                  ) : null}
                </Box>
              }
              appearance="category"
            />
          ))}
        </TabStrip>
      </Stack>
      <Stack direction="row" alignItems="center" sx={{ mb: 1, minHeight: 56 }}>
        {activeColumnIndex !== undefined ? <Box sx={{ width: 44, flexShrink: 0 }} /> : null}
        <Box sx={{ display: 'grid', flex: 1, minWidth: 0 }}>
          {props.colLabels.map((label, index) =>
            index === column ? null : (
              <Typography
                key={index}
                component="span"
                variant="subtitle1"
                aria-hidden
                sx={{
                  gridArea: '1 / 1',
                  visibility: 'hidden',
                  textAlign: 'center',
                  overflowWrap: 'anywhere',
                  lineHeight: 1.2,
                }}
              >
                {label}
              </Typography>
            ),
          )}
          <Typography
            component="h2"
            variant="subtitle1"
            data-testid="board-selected-category"
            sx={{
              gridArea: '1 / 1',
              textAlign: 'center',
              overflowWrap: 'anywhere',
              lineHeight: 1.2,
            }}
          >
            {props.colLabels[column]}
          </Typography>
        </Box>
        {activeColumnIndex !== undefined ? (
          <ActionIcon
            aria-label={t('gameBoard.cellActiveRound')}
            appearance="outlined"
            disabled={activeColumnIndex === column}
            sx={{ visibility: activeColumnIndex === column ? 'hidden' : 'visible' }}
            onClick={() => setSelectedColumn(activeColumnIndex)}
          >
            <Box component="svg" viewBox="0 0 24 24" aria-hidden sx={{ width: 20, height: 20 }}>
              <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="12" cy="12" r="2.5" fill="currentColor" />
            </Box>
          </ActionIcon>
        ) : null}
      </Stack>
      <ViewportBoard
        columns={2}
        rows={Math.ceil(props.rowLabels.length / 2)}
        gap={8}
        cardAspectRatio={boardGridMetrics.cardAspectRatio}
        mobile
      >
        <Box
          role="tabpanel"
          id={`${id}-panel`}
          aria-labelledby={`${id}-tab-${column}`}
          sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1 }}
        >
          {props.rowLabels.map((rowLabel, rowIndex) => {
            const isShortLabel = rowLabel.trim().length <= 6
            return (
              <Box
                key={`${rowIndex}-${column}`}
                sx={{ minWidth: 0, display: 'grid', gridTemplateRows: 'auto 1fr' }}
              >
                <Typography
                  data-board-row-label
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    height: isShortLabel ? '1.5rem' : '2.25rem',
                    mb: 0.5,
                    overflowWrap: 'anywhere',
                    containerType: 'inline-size',
                  }}
                >
                  <Box
                    component="span"
                    sx={{
                      fontSize: isShortLabel ? '0.875rem' : 'clamp(0.75rem, 10cqw, 0.875rem)',
                      lineHeight: 1.05,
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {rowLabel}
                  </Box>
                </Typography>
                {props.renderCell(rowIndex, column, rowLabel)}
              </Box>
            )
          })}
        </Box>
      </ViewportBoard>
    </Box>
  )
}
