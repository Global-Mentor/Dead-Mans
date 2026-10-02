import { Box, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { modifierDetailBlockSx } from './modifier-detail-block-sx.ts'

export interface ModifierConflict {
  id: string
  name: string
  isActive: boolean
}

export function ModifierConflictNotice({ conflicts }: { conflicts: readonly ModifierConflict[] }) {
  const { t } = useTranslation()
  if (conflicts.length === 0) return null

  return (
    <Box
      component="section"
      role="region"
      aria-label={t('gameModifiers.conflictDetailsTitle')}
      sx={modifierDetailBlockSx}
    >
      <Typography variant="body2" sx={{ overflowWrap: 'anywhere', lineHeight: 1.55 }}>
        <Box component="span" sx={{ fontWeight: 700 }}>
          {t('gameModifiers.conflictDetailsHeading')}
        </Box>{' '}
        {conflicts.map(({ id, name, isActive }, index) => (
          <Box component="span" key={id}>
            {index > 0 ? ', ' : null}
            <Box
              component="span"
              title={isActive ? t('gameModifiers.conflictAlreadyActive') : undefined}
              sx={{ color: isActive ? 'error.light' : 'text.primary' }}
            >
              {name}
            </Box>
          </Box>
        ))}
      </Typography>
    </Box>
  )
}
