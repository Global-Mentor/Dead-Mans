import { Box, Stack, Typography } from '@mui/material'
import { useId, type ReactNode } from 'react'
import { useStatisticsFormat } from '../use-statistics-format.ts'
import type { components } from '../../../shared/api/contracts/generated'
import { FieldHelp, Metric } from '../../../shared/ui/index.ts'
import { RoundBriefingPanel } from '../../../shared/game-ui/index.ts'

export type Statistics = components['schemas']['UserProfileStatisticsDto']

export function StatisticsSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  const id = useId()
  return (
    <RoundBriefingPanel
      component="section"
      aria-labelledby={id}
      sx={{ height: '100%' }}
      header={
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '44px minmax(0, 1fr) 44px',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Box aria-hidden />
          <Typography
            id={id}
            component="h2"
            variant="body1"
            fontWeight={700}
            textAlign="center"
            sx={{ overflowWrap: 'anywhere' }}
          >
            {title}
          </Typography>
          {description ? (
            <FieldHelp title={description} label={`${title}: ${description}`} />
          ) : (
            <Box aria-hidden />
          )}
        </Box>
      }
    >
      <Stack spacing={1}>{children}</Stack>
    </RoundBriefingPanel>
  )
}

export function StatisticsMetrics({
  items,
  prominent = false,
  columns = 2,
}: {
  items: ReadonlyArray<readonly [string, string | number | null]>
  prominent?: boolean
  columns?: 2 | 3
}) {
  const { t, number } = useStatisticsFormat()
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: prominent ? 'repeat(2, minmax(0, 1fr))' : 'minmax(0, 1fr)',
          sm: `repeat(${prominent ? 4 : columns}, minmax(0, 1fr))`,
        },
        columnGap: 3,
        rowGap: prominent ? 1.5 : 0,
      }}
    >
      {items.map(([label, value]) => (
        <Metric
          key={label}
          appearance={prominent ? 'summary' : 'row'}
          density={prominent ? 'standard' : 'compact'}
          emphasis={prominent ? 'result' : 'label'}
          label={label}
          value={
            value === null
              ? t('userProfile.stats.noData')
              : typeof value === 'number'
                ? number(value)
                : value
          }
        />
      ))}
    </Box>
  )
}
