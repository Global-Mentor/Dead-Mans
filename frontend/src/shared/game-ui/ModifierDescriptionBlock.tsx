import { Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { DetailBlock } from '../ui/index.ts'

export function ModifierDescriptionBlock({ description }: { description: string }) {
  const { t } = useTranslation()
  if (!description.trim()) return null

  return (
    <DetailBlock data-modifier-description>
      <Typography
        component="div"
        variant="caption"
        color="text.secondary"
        sx={{ mb: 0.75, letterSpacing: '0.1em', textTransform: 'uppercase' }}
      >
        {t('gameModifiers.descriptionLabel')}
      </Typography>
      <Typography
        variant="body2"
        sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.55 }}
      >
        {description}
      </Typography>
    </DetailBlock>
  )
}
