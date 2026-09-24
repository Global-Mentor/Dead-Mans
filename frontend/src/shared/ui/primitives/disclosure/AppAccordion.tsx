import { getAppSurfaceSx } from '../../../theme/surface-sx.ts'
import type { AccordionProps } from '@mui/material'
import { Accordion } from '@mui/material'
import type { Theme } from '@mui/material/styles'
import { mergeSx } from '../../../theme/merge-sx.ts'

type AppAccordionSurface = 'panel' | 'inset' | 'plain'
type AppAccordionTone = 'default' | 'warning'

interface AppAccordionProps extends Omit<AccordionProps, 'disableGutters' | 'elevation'> {
  surface?: AppAccordionSurface
  tone?: AppAccordionTone
}

function getAccordionSx(theme: Theme, surface: AppAccordionSurface, tone: AppAccordionTone) {
  const isWarning = tone === 'warning'

  return {
    ...getAppSurfaceSx(theme, surface),
    ...(isWarning ? { borderColor: theme.palette.warning.main } : {}),
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
