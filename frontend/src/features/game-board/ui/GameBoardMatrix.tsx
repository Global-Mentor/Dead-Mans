import { Box, Stack, Tab, Tabs, Typography, useMediaQuery } from '@mui/material'
import { useId, useState, type ComponentProps } from 'react'
import { useTranslation } from 'react-i18next'
import { AppButton, BoardMatrix } from '../../../shared/ui/index.ts'
import { ViewportBoard } from './ViewportBoard.tsx'

interface GameBoardMatrixProps extends ComponentProps<typeof BoardMatrix> {
  activeColumnIndex?: number | undefined
}

export function GameBoardMatrix({ activeColumnIndex, ...props }: GameBoardMatrixProps) {
  const { t } = useTranslation()
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('sm'))
  const [selectedColumn, setSelectedColumn] = useState<number | null>(null)
  const id = useId()
  const candidateColumn = selectedColumn ?? activeColumnIndex ?? 0
  const column =
    candidateColumn >= 0 && candidateColumn < props.colLabels.length ? candidateColumn : 0

  if (!isMobile || props.colLabels.length === 0)
    return (
      <ViewportBoard
        columns={props.colLabels.length}
        rows={props.rowLabels.length}
        gap={(props.gap ?? 0.75) * 8}
        leadWidth={typeof props.leadColumnWidth === 'number' ? props.leadColumnWidth : 40}
      >
        <BoardMatrix {...props} minWidth={0} />
      </ViewportBoard>
    )

  return (
    <Box>
      <Stack direction="row" justifyContent="flex-end">
        {activeColumnIndex !== undefined && activeColumnIndex !== column ? (
          <AppButton
            tone="ghost"
            size="small"
            sx={{ minHeight: 44 }}
            onClick={() => setSelectedColumn(activeColumnIndex)}
          >
            {t('gameBoard.cellActiveRound')}
          </AppButton>
        ) : null}
      </Stack>
      <Stack direction="row" alignItems="center" sx={{ mb: 1, minWidth: 0 }}>
        <Tabs
          value={column}
          onChange={(_, value: number) => setSelectedColumn(value)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          aria-label={t('gameBoard.mobileCategories')}
          sx={{ minWidth: 0, flex: 1, minHeight: 48, '& .MuiTabs-scrollButtons': { width: 24 } }}
        >
          {props.colLabels.map((label, index) => (
            <Tab
              key={index}
              id={`${id}-tab-${index}`}
              aria-controls={`${id}-panel`}
              label={
                <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  {label}
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
              sx={{
                minWidth: 64,
                minHeight: 48,
                maxWidth: 200,
                textTransform: 'none',
                fontSize: 16,
              }}
            />
          ))}
        </Tabs>
      </Stack>
      <ViewportBoard columns={2} rows={Math.ceil(props.rowLabels.length / 2)} gap={8} mobile>
        <Box
          role="tabpanel"
          id={`${id}-panel`}
          aria-labelledby={`${id}-tab-${column}`}
          sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1 }}
        >
          {props.rowLabels.map((rowLabel, rowIndex) => (
            <Box
              key={`${rowIndex}-${column}`}
              sx={{ minWidth: 0, display: 'grid', gridTemplateRows: 'auto 1fr' }}
            >
              <Typography
                data-board-row-label
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mb: 0.5 }}
              >
                {rowLabel}
              </Typography>
              {props.renderCell(rowIndex, column, rowLabel)}
            </Box>
          ))}
        </Box>
      </ViewportBoard>
    </Box>
  )
}
