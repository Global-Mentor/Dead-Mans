import { Box, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { DisclosureSection, InlineNotice, SectionCard } from '../../../../shared/ui/index.ts'
export function ManagementControlSurface({
  kind,
  children,
}: {
  kind: 'round' | 'team'
  children: ReactNode
}) {
  return (
    <SectionCard surface="panel" data-testid={`management-${kind}-section`} sx={{ minWidth: 0 }}>
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
  return (
    <DisclosureSection
      title={title}
      description={tooltip}
      panelId={`management-${sectionId}-content`}
      data-testid={`management-${sectionId}-section`}
      defaultExpanded={defaultExpanded}
    >
      {children}
    </DisclosureSection>
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
    <InlineNotice severity={tone} variant="outlined" sx={{ m: 0 }}>
      {children}
    </InlineNotice>
  )
}
