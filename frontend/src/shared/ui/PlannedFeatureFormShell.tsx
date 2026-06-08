import { Box, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { SectionCard } from './SectionCard.tsx'

interface PlannedFeatureFormShellProps {
  titleKey: string
  descriptionKey?: string
  children: ReactNode
  sx?: object
}

export function PlannedFeatureFormShell({
  titleKey,
  descriptionKey,
  children,
  sx,
}: PlannedFeatureFormShellProps) {
  const { t } = useTranslation()

  return (
    <SectionCard
      inset
      sx={{
        borderStyle: 'dashed',
        borderColor: 'divider',
        opacity: 0.92,
        ...sx,
      }}
    >
      <Typography variant="overline" color="text.secondary" display="block">
        {t('plannedFeatures.formShellBadge')}
      </Typography>
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        {t(titleKey)}
      </Typography>
      {descriptionKey ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t(descriptionKey)}
        </Typography>
      ) : null}
      <Box sx={{ pointerEvents: 'none', userSelect: 'none' }} aria-hidden>
        {children}
      </Box>
    </SectionCard>
  )
}
