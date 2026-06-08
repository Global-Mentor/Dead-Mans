import { Alert, Box, type SxProps, Stack, type Theme, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { huntBrassTitleSx } from '../../theme/surface-sx.ts'

export interface PlannedFeatureRoadmapItem {
  titleKey: string
  descriptionKey: string
}

interface PlannedFeatureRoadmapProps {
  items: readonly PlannedFeatureRoadmapItem[]
  sx?: SxProps<Theme>
}

export function PlannedFeatureRoadmap({ items, sx }: PlannedFeatureRoadmapProps) {
  const { t } = useTranslation()

  if (items.length === 0) {
    return null
  }

  return (
    <Alert severity="info" variant="outlined" sx={{ ...sx }}>
      <Typography variant="subtitle2" sx={huntBrassTitleSx} gutterBottom>
        {t('plannedFeatures.roadmapTitle')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        {t('plannedFeatures.roadmapHint')}
      </Typography>
      <Stack
        component="ul"
        spacing={1.5}
        sx={{ m: 0, pl: 2.5, listStyleType: 'disc' }}
      >
        {items.map((item) => (
          <Box component="li" key={item.titleKey}>
            <Typography variant="body2" fontWeight={600}>
              {t(item.titleKey)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t(item.descriptionKey)}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Alert>
  )
}
