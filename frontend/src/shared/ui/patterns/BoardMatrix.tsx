import { Box } from '@mui/material'
import { Fragment, type ReactNode } from 'react'

interface BoardMatrixProps {
  colLabels: readonly string[]
  rowLabels: readonly string[]
  minWidth?: number
  gap?: number
  leadCell?: ReactNode
  renderColumnLabel: (columnLabel: string, columnIndex: number) => ReactNode
  renderRowLabel: (rowLabel: string, rowIndex: number) => ReactNode
  renderCell: (rowIndex: number, colIndex: number, rowLabel: string) => ReactNode
}

export function BoardMatrix({
  colLabels,
  rowLabels,
  minWidth = 680,
  gap = 0.75,
  leadCell,
  renderColumnLabel,
  renderRowLabel,
  renderCell,
}: BoardMatrixProps) {
  return (
    <Box sx={{ overflow: 'auto' }}>
      <Box sx={{ minWidth: { xs: minWidth, sm: 'auto' } }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `auto repeat(${colLabels.length}, 1fr)`,
            columnGap: gap,
            rowGap: gap,
            mb: 1,
            alignItems: 'center',
          }}
        >
          {leadCell ?? <Box sx={{ minWidth: 72 }} />}
          {colLabels.map((columnLabel, columnIndex) => (
            <Fragment key={`column-${columnIndex}`}>
              {renderColumnLabel(columnLabel, columnIndex)}
            </Fragment>
          ))}
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `auto repeat(${colLabels.length}, 1fr)`,
            columnGap: gap,
            rowGap: gap,
            alignItems: 'stretch',
          }}
        >
          {rowLabels.map((rowLabel, rowIndex) => (
            <Fragment key={`row-${rowIndex}`}>
              {renderRowLabel(rowLabel, rowIndex)}
              {colLabels.map((_, colIndex) => (
                <Fragment key={`${rowIndex}-${colIndex}`}>
                  {renderCell(rowIndex, colIndex, rowLabel)}
                </Fragment>
              ))}
            </Fragment>
          ))}
        </Box>
      </Box>
    </Box>
  )
}
