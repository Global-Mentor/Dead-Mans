import { Box, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'
import { GameControlIcon, type GameControlIconName } from '../../../../shared/game-ui/index.ts'
import {
  AppAccordion,
  AppAccordionDetails,
  AppAccordionSummary,
  InlineNotice,
  SectionCard,
  HelpTooltip,
} from '../../../../shared/ui/index.ts'
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
      sx={{ minWidth: 0, p: 2 }}
    >
      {children}
    </SectionCard>
  )
}

export function SecondaryManagementSection({
  sectionId,
  title,
  children,
  defaultExpanded = false,
  icon,
}: {
  sectionId: 'launch' | 'manual-quiz' | 'round-safety' | 'finish-game'
  title: string
  children: ReactNode
  defaultExpanded?: boolean
  icon?: GameControlIconName
}) {
  const { t } = useTranslation()
  return (
    <AppAccordion
      surface="inset"
      data-testid={`management-${sectionId}-section`}
      defaultExpanded={defaultExpanded}
    >
      <AppAccordionSummary
        density="compact"
        id={`management-${sectionId}-header`}
        aria-controls={`management-${sectionId}-content`}
      >
        <Typography
          component="span"
          variant="body2"
          fontWeight={700}
          sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
        >
          {icon ? <GameControlIcon name={icon} /> : null}
          <HelpTooltip
            placement="left"
            describeChild
            title={t(`gameBoard.managementHelp.${sectionId}`)}
          >
            <Box component="span" tabIndex={0}>
              {title}
            </Box>
          </HelpTooltip>
        </Typography>
      </AppAccordionSummary>
      <AppAccordionDetails>{children}</AppAccordionDetails>
    </AppAccordion>
  )
}

export function ManagementSectionTitle({
  title,
  icon,
  help,
}: {
  help?: string
  title: string
  icon?: GameControlIconName
}) {
  return (
    <Typography
      variant="subtitle2"
      component={icon ? 'h3' : 'span'}
      fontWeight={600}
      sx={{
        minWidth: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        overflowWrap: 'anywhere',
        color: icon === 'round' ? 'primary.light' : 'text.primary',
        fontSize: 16,
        lineHeight: 1.2,
      }}
    >
      {icon ? <GameControlIcon name={icon} /> : null}
      {help ? (
        <HelpTooltip placement="left" describeChild title={help}>
          <Box component="span" tabIndex={0}>
            {title}
          </Box>
        </HelpTooltip>
      ) : (
        title
      )}
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
