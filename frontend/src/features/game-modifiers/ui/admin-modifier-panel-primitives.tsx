import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'
import { Box, Typography } from '@mui/material'
import { GameControlIcon, type GameControlIconName } from '../../../shared/game-ui/index.ts'
import {
  AppAccordion,
  AppAccordionDetails,
  AppAccordionSummary,
  HelpTooltip,
} from '../../../shared/ui/index.ts'
export function AdminModifierBlock({
  sectionId,
  title,
  children,
  icon,
  defaultExpanded = true,
}: {
  sectionId: 'activate' | 'cancel' | 'stop'
  title: string
  children: ReactNode
  icon: GameControlIconName
  defaultExpanded?: boolean
}) {
  const { t } = useTranslation()
  return (
    <AppAccordion surface="inset" defaultExpanded={defaultExpanded}>
      <AppAccordionSummary
        density="compact"
        id={`modifier-management-${sectionId}-header`}
        aria-controls={`modifier-management-${sectionId}-content`}
      >
        <Typography
          component="span"
          variant="body2"
          fontWeight={700}
          sx={{ display: 'flex', gap: 1, alignItems: 'center' }}
        >
          <GameControlIcon name={icon} />
          <HelpTooltip
            placement="left"
            describeChild
            title={t(`gameModifiers.adminPanel.sectionHelp.${sectionId}`)}
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
