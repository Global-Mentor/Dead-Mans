import { Box, Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ContentList, StatusBadge } from '../ui/index.ts'

/** The same category frame and count in both modifier catalogs. */
export function ModifierCatalogGroup({
  title,
  count,
  children,
}: {
  title: string
  count: number
  children: ReactNode
}) {
  return (
    <Box
      component="section"
      aria-label={title}
      data-modifier-catalog-group
      sx={{ border: '1px solid', borderColor: 'divider', minWidth: 0 }}
    >
      <ModifierCatalogHeading title={title} count={count} />
      <ContentList disablePadding component="ul" sx={{ display: 'grid', gap: 0.5, px: 0.25 }}>
        {children}
      </ContentList>
    </Box>
  )
}

export function ModifierCatalogHeading({ title, count }: { title: string; count: number }) {
  const { t } = useTranslation()
  return (
    <Stack
      component="header"
      data-modifier-group-heading
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      gap={1}
      sx={{
        px: 1,
        py: 0.25,
        bgcolor: 'action.selected',
        borderBottom: '1px solid',
        borderColor: 'divider',
        borderLeft: '3px solid',
        borderLeftColor: 'primary.main',
      }}
    >
      <Typography
        component="h3"
        variant="body1"
        color="primary.light"
        fontWeight={700}
        sx={{ minWidth: 0, overflowWrap: 'anywhere' }}
      >
        {title}
      </Typography>
      <StatusBadge
        density="compact"
        variant="outlined"
        label={count}
        aria-label={t('gameModifiers.categoryCountLabel', { count })}
      />
    </Stack>
  )
}
