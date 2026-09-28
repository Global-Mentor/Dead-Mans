import type { TableCellProps, TableRowProps } from '@mui/material'
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  styled,
} from '@mui/material'
import type { ReactNode } from 'react'

/** Stable row identity across breakpoints keeps edits and in-flight actions intact. */
export function DataTable({
  label,
  columns,
  children,
}: {
  label: string
  columns: readonly string[]
  children: ReactNode
}) {
  return (
    <TableContainer>
      <Table
        aria-label={label}
        role="table"
        sx={(theme) => ({
          tableLayout: 'fixed',
          [theme.breakpoints.down('md')]: { display: 'block' },
        })}
      >
        <TableHead
          role="rowgroup"
          sx={(theme) => ({
            [theme.breakpoints.down('md')]: {
              position: 'absolute',
              width: '1px',
              height: '1px',
              overflow: 'hidden',
              clipPath: 'inset(50%)',
            },
          })}
        >
          <TableRow role="row">
            {columns.map((column, index) => (
              <TableCell key={index} scope="col" role="columnheader">
                {column}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody
          role="rowgroup"
          sx={(theme) => ({
            [theme.breakpoints.down('md')]: { display: 'grid', gap: 1.5, p: 1.5 },
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
  [theme.breakpoints.down('md')]: { display: 'block', padding: 0, border: 0 },
}))
