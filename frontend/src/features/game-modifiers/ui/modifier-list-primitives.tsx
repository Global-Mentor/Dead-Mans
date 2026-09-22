import { Box, Stack, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameModifierAvailability } from '../../../shared/api/contracts/index.ts'

export function ModifierSectionHeading({ title, count }: { title: string; count?: number }) {
  return (
    <Stack direction="row" spacing={0.75} justifyContent="space-between" alignItems="center">
      <Typography component="h2" variant="subtitle2" sx={{ fontWeight: 850 }}>
        {title}
      </Typography>
      {count === undefined ? null : <ModifierCountBadge count={count} />}
    </Stack>
  )
}

export function ModifierCountBadge({ count }: { count: number }) {
  const { t } = useTranslation()

  return (
    <Box
      component="span"
      sx={(theme) => ({
        display: 'inline-flex',
        alignItems: 'center',
        minHeight: 24,
        borderRadius: '999px',
        border: `1px solid ${alpha(theme.palette.primary.main, 0.56)}`,
        backgroundColor: alpha(theme.palette.primary.main, 0.12),
        color: 'text.primary',
        px: 0.8,
        typography: 'caption',
        fontWeight: 850,
        whiteSpace: 'nowrap',
      })}
    >
      {t('gameModifiers.categoryCountLabel', { count })}
    </Box>
  )
}

export function ModifierIcon({ emoji }: { emoji: string | null | undefined }) {
  return (
    <Box
      aria-hidden="true"
      sx={(theme) => ({
        width: 32,
        height: 32,
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: alpha(theme.palette.background.paper, 0.52),
        border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
        flexShrink: 0,
      })}
    >
      {emoji ? <Typography sx={{ fontSize: '1rem', lineHeight: 1 }}>{emoji}</Typography> : null}
    </Box>
  )
}

export function InlineMetaPill({
  label,
  tone = 'default',
}: {
  label: string
  tone?: 'default' | 'success' | 'warning' | 'error'
}) {
  return (
    <Box
      component="span"
      sx={(theme) => {
        const accent =
          tone === 'success'
            ? theme.palette.success.main
            : tone === 'warning'
              ? theme.palette.warning.main
              : tone === 'error'
                ? theme.palette.error.main
                : theme.palette.primary.main

        return {
          display: 'inline-flex',
          alignItems: 'center',
          minWidth: 0,
          minHeight: 24,
          borderRadius: '999px',
          border: `1px solid ${alpha(accent, tone === 'default' ? 0.16 : 0.38)}`,
          backgroundColor:
            tone === 'default' ? alpha(theme.palette.background.paper, 0.42) : alpha(accent, 0.12),
          px: 0.75,
          typography: 'caption',
          color: tone === 'default' ? 'text.secondary' : `${tone}.light`,
          fontWeight: 700,
          lineHeight: 1.3,
          py: 0.2,
          overflowWrap: 'anywhere',
        }
      }}
    >
      {label}
    </Box>
  )
}

export function ModifierCategorySection({
  category,
  children,
}: {
  category: GameModifierAvailability['modifier']['category']
  children: ReactNode
}) {
  return (
    <Box
      component="section"
      aria-label={category}
      sx={(theme) => {
        const accent =
          category === 'preparation'
            ? theme.palette.info.main
            : category === 'round'
              ? theme.palette.success.main
              : theme.palette.warning.main

        return {
          borderRadius: '8px',
          backgroundColor: alpha(accent, 0.04),
          boxShadow: `inset 2px 0 0 ${alpha(accent, 0.62)}`,
          px: { xs: 0.7, sm: 0.85 },
          py: 0.7,
        }
      }}
    >
      {children}
    </Box>
  )
}
