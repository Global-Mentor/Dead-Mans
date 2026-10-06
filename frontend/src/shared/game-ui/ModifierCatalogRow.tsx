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
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gap: 0.5,
          minWidth: 0,
          gridTemplateColumns: 'minmax(0, 1fr) auto',
          alignItems: 'center',
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          gap={1}
          sx={{
            minWidth: 0,
            ...(limit != null ? { '@container (max-width:319px)': { gridColumn: '1 / -1' } } : {}),
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
        <Stack
          alignItems="flex-end"
          gap={0.5}
          sx={{
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
          }}
        >
          <AppButton
            tone="subtle"
            size="small"
            aria-expanded={children ? detailsOpen : undefined}
            onClick={onDetails ?? (() => setDetailsOpen(!detailsOpen))}
          >
            {t('gameModifiers.detailsAction')}
          </AppButton>
          {actions}
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
