import { Stack, SvgIcon, Typography, useMediaQuery, useTheme } from '@mui/material'
import { AppButton } from '../../primitives/buttons/AppButton.tsx'

export function PagePagination({
  page,
  pageSize,
  total,
  previousLabel,
  nextLabel,
  summary,
  onChange,
  pageLabel,
  navigationLabel,
  disabled = false,
  density = 'standard',
}: {
  page: number
  pageSize: number
  total: number
  previousLabel: string
  nextLabel: string
  summary: string
  onChange: (page: number) => void
  pageLabel?: (page: number) => string
  navigationLabel?: string
  disabled?: boolean
  density?: 'standard' | 'compact'
}) {
  const theme = useTheme()
  const narrow = useMediaQuery(theme.breakpoints.down('sm'))
  const compact = density === 'compact'
  const count = Math.max(1, Math.ceil(total / pageSize))
  const start = Math.max(1, Math.min(page - 1, count - 4))
  const end = Math.min(count, Math.max(page + 1, 5))
  const pages = [
    ...new Set([
      1,
      ...(compact && narrow
        ? [page, page === 1 ? Math.min(2, count) : page === count ? Math.max(1, count - 1) : page]
        : Array.from({ length: end - start + 1 }, (_, index) => start + index)),
      count,
    ]),
  ].sort((left, right) => left - right)
  const controls = (
    <>
      <AppButton
        tone="ghost"
        size={compact || pageLabel ? 'small' : 'medium'}
        aria-label={compact ? previousLabel : undefined}
        sx={compact ? { minWidth: 44 } : undefined}
        disabled={disabled || page <= 1}
        onClick={() => onChange(page - 1)}
      >
        {compact ? (
          <SvgIcon aria-hidden>
            <path
              d="m15 6-6 6 6 6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </SvgIcon>
        ) : (
          previousLabel
        )}
      </AppButton>
      {pageLabel
        ? pages.map((value, index) => (
            <Stack key={value} direction="row" alignItems="center" gap={0.5}>
              {index > 0 && value > (pages[index - 1] ?? 0) + 1 ? (
                <Typography component="span" aria-hidden>
                  …
                </Typography>
              ) : null}
              <AppButton
                size="small"
                tone={value === page ? 'secondary' : 'ghost'}
                aria-label={pageLabel(value)}
                aria-current={value === page ? 'page' : undefined}
                disabled={disabled}
                onClick={() => onChange(value)}
                sx={{ minWidth: 44 }}
              >
                {value}
              </AppButton>
            </Stack>
          ))
        : null}
      <AppButton
        tone="ghost"
        size={compact || pageLabel ? 'small' : 'medium'}
        aria-label={compact ? nextLabel : undefined}
        sx={compact ? { minWidth: 44 } : undefined}
        disabled={disabled || page >= count}
        onClick={() => onChange(page + 1)}
      >
        {compact ? (
          <SvgIcon aria-hidden>
            <path
              d="m9 6 6 6-6 6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </SvgIcon>
        ) : (
          nextLabel
        )}
      </AppButton>
    </>
  )
  return (
    <Stack
      direction="row"
      useFlexGap
      spacing={1}
      alignItems="center"
      justifyContent={compact ? 'space-between' : 'flex-end'}
      sx={{ p: compact ? 0.5 : 1.5, flexWrap: 'wrap' }}
    >
      <Typography variant="body2" role="status">
        {summary}
      </Typography>
      {pageLabel ? (
        <Stack
          component="nav"
          aria-label={navigationLabel}
          direction="row"
          alignItems="center"
          useFlexGap
          gap={0.5}
          sx={{ flexWrap: 'wrap' }}
        >
          {controls}
        </Stack>
      ) : (
        controls
      )}
    </Stack>
  )
}
