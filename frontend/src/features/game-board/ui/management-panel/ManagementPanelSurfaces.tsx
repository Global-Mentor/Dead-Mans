import { AccordionDetails, Alert, Box, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import type { ReactNode } from 'react'
import { AppAccordion, AppAccordionSummary, SectionCard } from '../../../../shared/ui/index.ts'

export function ManagementControlSurface({
  kind,
  children,
}: {
  kind: 'round' | 'team'
  children: ReactNode
}) {
  return (
    <SectionCard
      surface="panel"
      data-testid={`management-${kind}-section`}
      sx={(theme) => ({
        p: { xs: 1.5, sm: 2 },
        minWidth: 0,
        borderRadius: 0,
        boxShadow: `inset 0 1px 0 ${alpha(theme.palette.text.primary, 0.05)}`,
        ...(kind === 'round'
          ? {
              borderColor: alpha(theme.palette.primary.main, 0.5),
              borderLeft: `3px solid ${theme.palette.primary.main}`,
              backgroundColor: alpha(theme.palette.primary.main, 0.12),
            }
          : {
              border: `1px solid ${alpha(theme.palette.primary.main, 0.36)}`,
              backgroundColor: alpha(theme.palette.common.black, 0.28),
            }),
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
      surface="panel"
      data-testid={`management-${sectionId}-section`}
      defaultExpanded={defaultExpanded}
      aria-labelledby={headerId}
      sx={(theme) => ({
        border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
        borderRadius: 0,
        backgroundColor: alpha(theme.palette.background.paper, 0.78),
        '&.Mui-expanded': {
          borderColor: alpha(theme.palette.primary.main, 0.45),
          backgroundColor: alpha(theme.palette.background.paper, 0.92),
        },
        '& .MuiAccordionSummary-root.Mui-expanded': {
          borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.22)}`,
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
      <AccordionDetails id={contentId} sx={{ px: 1.5, pt: 1.5, pb: 1.5 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {tooltip}
        </Typography>
        {children}
      </AccordionDetails>
    </AppAccordion>
  )
}

export function ManagementSectionTitle({
  title,
  tooltip,
  icon,
}: {
  title: string
  tooltip: string
  icon?: 'round' | 'team'
}) {
  return (
    <Typography
      variant="subtitle2"
      component={icon ? 'h3' : 'span'}
      fontWeight={600}
      title={tooltip}
      sx={{
        minWidth: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        overflowWrap: 'anywhere',
        color: icon === 'round' ? 'primary.light' : 'text.primary',
        fontSize: icon === 'round' ? 16 : 20,
        lineHeight: 1.2,
      }}
    >
      {icon ? (
        <Box
          component="svg"
          aria-hidden
          viewBox="0 0 24 24"
          sx={{
            width: 22,
            height: 22,
            flexShrink: 0,
            fill: 'none',
            stroke: 'currentColor',
            strokeWidth: 1.4,
          }}
        >
          {icon === 'round' ? (
            <path d="M5 5h14v14H5z M9 8l6 4-6 4z" />
          ) : (
            <>
              <circle cx="9" cy="8" r="3" />
              <path d="M3 20v-2a6 6 0 0112 0v2 M16 5a3 3 0 010 6 M17 14a5 5 0 014 4v2" />
            </>
          )}
        </Box>
      ) : null}
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
