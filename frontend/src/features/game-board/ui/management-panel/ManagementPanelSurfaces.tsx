import { AccordionDetails, Alert, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import type { ReactNode } from 'react'
import { AppAccordion, AppAccordionSummary, SectionCard } from '../../../../shared/ui/index.ts'

export function ManagementControlSurface({
  accent,
  children,
}: {
  accent: 'info' | 'warning' | 'success'
  children: ReactNode
}) {
  return (
    <SectionCard
      surface="plain"
      sx={(theme) => ({
        p: { xs: 1.75, sm: 2 },
        borderRadius: '8px',
        border: `1px solid ${alpha(
          accent === 'warning' ? theme.palette.warning.main : theme.palette.primary.main,
          0.22,
        )}`,
        background: `linear-gradient(115deg, ${alpha(theme.palette.primary.main, 0.06)}, ${alpha(theme.palette.background.paper, 0.65)} 75%)`,
        boxShadow: `inset 0 1px 0 ${alpha(theme.palette.primary.light, 0.04)}`,
      })}
    >
      {children}
    </SectionCard>
  )
}

export function SecondaryManagementSection({
  sectionId,
  title,
  tooltip,
  children,
  defaultExpanded = false,
}: {
  sectionId: string
  title: string
  tooltip: string
  children: ReactNode
  defaultExpanded?: boolean
}) {
  const headerId = `management-${sectionId}-header`
  const contentId = `management-${sectionId}-content`

  return (
    <AppAccordion
      surface="plain"
      defaultExpanded={defaultExpanded}
      aria-labelledby={headerId}
      sx={(theme) => ({
        borderTop: `1px solid ${alpha(theme.palette.primary.main, 0.14)}`,
        '&.Mui-expanded': {
          backgroundColor: alpha(theme.palette.primary.main, 0.035),
          borderRadius: '0 0 8px 8px',
        },
      })}
    >
      <AppAccordionSummary
        density="compact"
        id={headerId}
        aria-controls={contentId}
        aria-description={tooltip}
        sx={{ minHeight: 52, px: 1.5 }}
      >
        <ManagementSectionTitle title={title} tooltip={tooltip} />
      </AppAccordionSummary>
      <AccordionDetails id={contentId} sx={{ px: 1.5, pt: 0.5, pb: 1.5 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {tooltip}
        </Typography>
        {children}
      </AccordionDetails>
    </AppAccordion>
  )
}

export function ManagementSectionTitle({ title, tooltip }: { title: string; tooltip: string }) {
  return (
    <Typography
      variant="subtitle2"
      fontWeight={600}
      title={tooltip}
      sx={{ minWidth: 0, overflowWrap: 'anywhere', color: 'primary.light', fontSize: 14 }}
    >
      {title}
    </Typography>
  )
}

export function ManagementStateNotice({
  children,
  tone = 'warning',
}: {
  children: ReactNode
  tone?: 'warning' | 'error' | 'info' | 'success'
}) {
  return (
    <Alert severity={tone} variant="outlined" sx={{ borderRadius: 1.5, m: 0 }}>
      {children}
    </Alert>
  )
}
