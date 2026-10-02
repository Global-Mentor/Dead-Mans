import { Box, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { modifierDetailBlockSx } from './modifier-detail-block-sx.ts'

export function ModifierActivatorsBlock({
  names,
  children,
}: {
  names: readonly string[]
  children?: ReactNode
}) {
  const { t } = useTranslation()
  return (
    <Box
      component="section"
      role="region"
      aria-label={t('gameModifiers.activatorsLabel')}
      sx={modifierDetailBlockSx}
    >
      <Typography variant="body2" sx={{ overflowWrap: 'anywhere', lineHeight: 1.55 }}>
        <Box component="span" sx={{ fontWeight: 700 }}>
          {t('gameModifiers.activatorsLabel')}:
        </Box>{' '}
        {names.map((name, index) => (
          <Box component="span" key={index}>
            {index > 0 ? ', ' : null}
            <Box component="span">{name}</Box>
          </Box>
        ))}
      </Typography>
      {children ? <Box sx={{ mt: 1, minWidth: 0 }}>{children}</Box> : null}
    </Box>
  )
}
