import { Box, Stack, Typography } from '@mui/material'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AppButton, ItemCard, StatusBadge } from '../ui/index.ts'
import { ModifierIconTile } from './ModifierIconTile.tsx'

/** Compact modifier presentation shared by the round drawer and modifier tab. */
export function ModifierCatalogRow({
  name,
  emoji,
  cost,
  limit,
  activationsCount = 0,
  showActivationsCount = false,
  isActive = false,
  actions,
  managementActions,
  status,
  onDetails,
  metadata,
  children,
}: {
  name: string
  emoji?: string | null | undefined
  cost: number
  limit?: number | null | undefined
  activationsCount?: number
  showActivationsCount?: boolean
  isActive?: boolean
  actions?: ReactNode
  managementActions?: ReactNode
  status?: ReactNode
  onDetails?: (() => void) | undefined
  metadata?: ReactNode
  children?: ReactNode
}) {
  const { t } = useTranslation()
  const [detailsOpen, setDetailsOpen] = useState(false)
  return (
    <ItemCard
      component="li"
      aria-label={name}
      aria-description={isActive ? t('gameModifiers.activeTag') : undefined}
      data-modifier-catalog-row
      sx={{
        listStyle: 'none',
        minWidth: 0,
        px: 1,
        py: 0.5,
        containerType: 'inline-size',
        ...(managementActions ? { minHeight: 104, display: 'grid', alignItems: 'center' } : {}),
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gap: 0.5,
          minWidth: 0,
          gridTemplateColumns: 'minmax(0, 1fr) auto',
          alignItems: 'center',
          ...(managementActions
            ? {
                gridTemplateColumns: 'minmax(0, 1fr)',
                gap: 1,
                '@container (min-width:600px)': { gridTemplateColumns: 'minmax(0, 1fr) 272px' },
                '@container (min-width:900px)': {
                  gridTemplateColumns: 'minmax(0, 1fr) 220px 272px',
                },
              }
            : {}),
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          gap={1}
          sx={{
            minWidth: 0,
            ...(managementActions
              ? { gridColumn: 1, gridRow: 1, minHeight: 80 }
              : limit != null
                ? { '@container (max-width:319px)': { gridColumn: '1 / -1' } }
                : {}),
          }}
        >
          <ModifierIconTile emoji={emoji} size="large" />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              component="h4"
              variant="body1"
              fontWeight={700}
              sx={{ overflowWrap: 'anywhere', lineHeight: 1.25 }}
            >
              {name}
            </Typography>
            <Box sx={{ mt: 0.25, display: 'flex', gap: 0.5, flexWrap: 'wrap', minWidth: 0 }}>
              <Stack
                direction="row"
                alignItems="center"
                gap={0.5}
                sx={{ minWidth: 0, maxWidth: '100%' }}
              >
                <StatusBadge
                  density="tight"
                  variant="outlined"
                  color="warning"
                  label={t('gameModifiers.costLabel', { cost })}
                />
                {limit != null ? (
                  <StatusBadge
                    density="tight"
                    variant="outlined"
                    color={activationsCount >= limit ? 'error' : 'default'}
                    aria-label={t('gameModifiers.limitProgressLabel', {
                      count: activationsCount,
                      limit,
                    })}
                    label={t('gameModifiers.limitProgressShortLabel', {
                      count: activationsCount,
                      limit,
                    })}
                  />
                ) : null}
                {limit == null && showActivationsCount ? (
                  <StatusBadge
                    density="tight"
                    variant="outlined"
                    aria-label={t('gameModifiers.activeGroupCount', { count: activationsCount })}
                    label={t('gameModifiers.activeStackMultiplier', { count: activationsCount })}
                  />
                ) : null}
              </Stack>
            </Box>
            {metadata}
          </Box>
        </Stack>
        {managementActions ? (
          <Box
            data-modifier-catalog-status
            sx={{
              minWidth: 0,
              minHeight: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gridColumn: 1,
              gridRow: 2,
              '@container (min-width:900px)': { gridColumn: 2, gridRow: 1 },
            }}
          >
            {status}
          </Box>
        ) : null}
        <Stack
          alignItems="flex-end"
          gap={0.5}
          sx={{
            ...(managementActions
              ? {
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gridAutoRows: 'minmax(44px, auto)',
                  gap: 1,
                  alignItems: 'stretch',
                  gridColumn: 1,
                  gridRow: 3,
                  '@container (min-width:460px)': {
                    flexDirection: 'column',
                    alignItems: 'stretch',
                  },
                  '@container (min-width:600px)': { gridColumn: 2, gridRow: '1 / span 2' },
                  '@container (min-width:900px)': { gridColumn: 3, gridRow: 1 },
                }
              : {
                  gridColumn: 2,
                  gridRow: 1,
                  '@container (min-width:460px)': { flexDirection: 'row', alignItems: 'center' },
                  ...(limit != null
                    ? {
                        '@container (max-width:319px)': {
                          gridColumn: '1 / -1',
                          gridRow: 2,
                          flexDirection: 'row',
                          justifyContent: 'flex-end',
                          alignItems: 'center',
                        },
                      }
                    : {}),
                }),
          }}
        >
          <AppButton
            tone="subtle"
            size="small"
            fullWidth={Boolean(managementActions)}
            aria-expanded={children ? detailsOpen : undefined}
            onClick={onDetails ?? (() => setDetailsOpen(!detailsOpen))}
          >
            {t('gameModifiers.detailsAction')}
          </AppButton>
          {actions}
          {managementActions}
        </Stack>
      </Box>
      {children ? (
        <Stack spacing={1} sx={{ pt: 1, pb: 0.75, display: detailsOpen ? 'flex' : 'none' }}>
          {children}
        </Stack>
      ) : null}
    </ItemCard>
  )
}
