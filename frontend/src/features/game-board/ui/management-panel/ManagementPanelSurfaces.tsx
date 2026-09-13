import { AccordionDetails, Alert, Box, Stack, Typography } from '@mui/material'
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
        p: 1.15,
        border: `1px solid ${alpha(
          accent === 'success'
            ? theme.palette.success.main
            : accent === 'warning'
              ? theme.palette.warning.main
              : theme.palette.info.main,
          0.3,
        )}`,
        backgroundColor: alpha(theme.palette.background.paper, 0.5),
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
    <AppAccordion surface="inset" defaultExpanded={defaultExpanded} aria-labelledby={headerId}>
      <AppAccordionSummary
        density="compact"
        id={headerId}
        aria-controls={contentId}
        aria-description={tooltip}
      >
        <ManagementSectionTitle title={title} tooltip={tooltip} />
      </AppAccordionSummary>
      <AccordionDetails id={contentId} sx={{ px: 1.15, pt: 0, pb: 1.15 }}>
        {children}
      </AccordionDetails>
    </AppAccordion>
  )
}

export function ManagementSectionTitle({ title, tooltip }: { title: string; tooltip: string }) {
  return (
    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
      <Typography variant="subtitle2" fontWeight={850} noWrap>
        {title}
      </Typography>
      <Box
        component="span"
        aria-hidden
        title={tooltip}
        sx={(theme) => ({
          width: 18,
          height: 18,
          borderRadius: '50%',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
          color: 'text.secondary',
          fontSize: '0.7rem',
          flexShrink: 0,
        })}
      >
        ?
      </Box>
    </Stack>
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
