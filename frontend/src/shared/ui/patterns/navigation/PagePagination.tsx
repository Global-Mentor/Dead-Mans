import { Stack, Typography } from '@mui/material'
import { AppButton } from '../../primitives/buttons/AppButton.tsx'

export function PagePagination({
  page,
  pageSize,
  total,
  previousLabel,
  nextLabel,
  summary,
  onChange,
}: {
  page: number
  pageSize: number
  total: number
  previousLabel: string
  nextLabel: string
  summary: string
  onChange: (page: number) => void
}) {
  return (
    <Stack
      direction="row"
      useFlexGap
      spacing={1}
      alignItems="center"
      justifyContent="flex-end"
      sx={{ p: 1.5, flexWrap: 'wrap' }}
    >
      <Typography variant="body2" role="status">
        {summary}
      </Typography>
      <AppButton tone="ghost" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        {previousLabel}
      </AppButton>
      <AppButton
        tone="ghost"
        disabled={page * pageSize >= total}
        onClick={() => onChange(page + 1)}
      >
        {nextLabel}
      </AppButton>
    </Stack>
  )
}
