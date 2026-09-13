import { Accordion } from '@mui/material'
import type { AccordionProps } from '@mui/material'
import { alpha } from '@mui/material/styles'
import type { Theme } from '@mui/material/styles'
import { mergeSx } from '../../theme/merge-sx.ts'

type AppAccordionSurface = 'panel' | 'inset' | 'plain'
type AppAccordionTone = 'default' | 'warning'

interface AppAccordionProps extends Omit<AccordionProps, 'disableGutters' | 'elevation'> {
  surface?: AppAccordionSurface
  tone?: AppAccordionTone
}

function getAccordionSx(theme: Theme, surface: AppAccordionSurface, tone: AppAccordionTone) {
  const isWarning = tone === 'warning'

  return {
    border: surface === 'plain' ? 0 : '1px solid',
    borderColor: isWarning
      ? alpha(theme.palette.warning.main, 0.72)
      : alpha(theme.palette.divider, surface === 'panel' ? 0.88 : 0.78),
    backgroundColor: isWarning
      ? alpha(theme.palette.warning.main, 0.08)
      : surface === 'plain'
        ? 'transparent'
        : alpha(theme.palette.background.paper, surface === 'panel' ? 0.58 : 0.42),
    backgroundImage: 'none',
    boxShadow: isWarning ? `inset 0 0 0 1px ${alpha(theme.palette.warning.main, 0.42)}` : 'none',
    overflow: surface === 'plain' ? 'visible' : 'hidden',
    '&::before': { display: 'none' },
  }
}

export function AppAccordion({
  surface = 'panel',
  tone = 'default',
  sx,
  ...props
}: AppAccordionProps) {
  return (
    <Accordion
      {...props}
      disableGutters
      elevation={0}
      sx={mergeSx((theme) => getAccordionSx(theme, surface, tone), sx)}
    />
  )
}
