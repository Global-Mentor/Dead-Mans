import type { TableCellProps, TableRowProps } from '@mui/material'
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  styled,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import type { ReactNode } from 'react'

/** Stable row identity across breakpoints keeps edits and in-flight actions intact. */
export function DataTable({
  label,
  columns,
  children,
  density = 'standard',
}: {
  label: string
  columns: readonly (
    | string
    | {
        label: string
        mobileLabel?: string
        width?: string
        align?: 'left' | 'center' | 'right'
        sortDirection?: 'asc' | 'desc' | false
        onSort?: () => void
      }
  )[]
  density?: 'standard' | 'compact'
  children: ReactNode
}) {
  const theme = useTheme()
  const mobile = useMediaQuery(theme.breakpoints.down('md'))
  const sortableCount = columns.filter(
    (column) => typeof column !== 'string' && column.onSort,
  ).length
  const mobileHidden = {
    position: 'absolute',
    width: '1px',
    height: '1px',
    overflow: 'hidden',
    clipPath: 'inset(50%)',
  } as const
  return (
    <TableContainer>
      <Table
        aria-label={label}
        role="table"
        data-density={density}
        size={density === 'compact' ? 'small' : 'medium'}
        sx={(theme) => ({
          tableLayout: 'fixed',
          [theme.breakpoints.down('md')]: { display: 'block' },
        })}
      >
        <TableHead
          role="rowgroup"
          sx={(theme) => ({
            [theme.breakpoints.down('md')]: {
              ...(sortableCount ? { display: 'block' } : mobileHidden),
            },
          })}
        >
          <TableRow
            role="row"
            sx={(theme) => ({
              [theme.breakpoints.down('md')]: sortableCount
                ? {
                    display: 'grid',
                    gridTemplateColumns: `repeat(${sortableCount}, minmax(0, 1fr))`,
                  }
                : {},
            })}
          >
            {columns.map((column, index) => (
              <TableCell
                key={index}
                scope="col"
                role="columnheader"
                align={typeof column === 'string' ? undefined : column.align}
                sx={(theme) => ({
                  ...(typeof column === 'string' ? {} : { width: column.width }),
                  ...(density === 'compact' ? { verticalAlign: 'middle' } : {}),
                  [theme.breakpoints.down('md')]:
                    typeof column !== 'string' && column.onSort
                      ? {
                          display: 'block',
                          width: 'auto',
                          p: 1,
                          ...(density === 'compact'
                            ? { fontSize: theme.typography.body2.fontSize, lineHeight: 1.25 }
                            : {}),
                        }
                      : mobileHidden,
                })}
                sortDirection={typeof column === 'string' ? false : (column.sortDirection ?? false)}
              >
                {typeof column === 'string' ? (
                  column
                ) : column.onSort ? (
                  <TableSortLabel
                    aria-label={column.label}
                    hideSortIcon={density === 'compact'}
                    active={Boolean(column.sortDirection)}
                    direction={column.sortDirection || 'asc'}
                    onClick={column.onSort}
                    sx={(theme) => ({
                      ...(column.align === 'center'
                        ? { width: '100%', justifyContent: 'center' }
                        : {}),
                      [theme.breakpoints.down('md')]: {
                        minHeight: 44,
                        width: '100%',
                      },
                    })}
                  >
                    {mobile ? (column.mobileLabel ?? column.label) : column.label}
                  </TableSortLabel>
                ) : (
                  column.label
                )}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody
          role="rowgroup"
          sx={(theme) => ({
            [theme.breakpoints.down('md')]: {
              display: 'grid',
              gap: density === 'compact' ? 1 : 1.5,
              p: density === 'compact' ? 1 : 1.5,
            },
          })}
        >
          {children}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
export const DataTableRow = styled(function DataRow(props: TableRowProps) {
  return <TableRow role="row" {...props} />
})(({ theme }) => ({
  verticalAlign: 'top',
  'table[data-density="compact"] &': {
    [theme.breakpoints.down('md')]: { gap: theme.spacing(1), padding: theme.spacing(1) },
  },
  [theme.breakpoints.down('md')]: {
    display: 'grid',
    gap: theme.spacing(1.5),
    padding: theme.spacing(1.5),
    border: `1px solid ${theme.palette.divider}`,
  },
}))
export const DataTableCell = styled(function DataCell(props: TableCellProps) {
  return <TableCell role="cell" {...props} />
})(({ theme }) => ({
  overflowWrap: 'anywhere',
  minWidth: 0,
  'table[data-density="compact"] &': { verticalAlign: 'middle' },
  [theme.breakpoints.down('md')]: { display: 'block', padding: 0, border: 0 },
}))
