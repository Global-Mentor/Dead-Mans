import type { AccordionSummaryProps } from '@mui/material'
import { AccordionSummary, Box } from '@mui/material'
import { mergeSx } from '../../../theme/merge-sx.ts'

type AppAccordionSummaryDensity = 'compact' | 'standard'

interface AppAccordionSummaryProps extends AccordionSummaryProps {
  density?: AppAccordionSummaryDensity
}

export function AppAccordionSummary({
  density = 'standard',
  expandIcon,
  sx,
  ...props
}: AppAccordionSummaryProps) {
  return (
    <AccordionSummary
      {...props}
      expandIcon={
        expandIcon ?? (
          <Box
            component="svg"
            aria-hidden
            viewBox="0 0 24 24"
            sx={{ width: 20, height: 20, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5 }}
          >
            <path d="m6 9 6 6 6-6" />
          </Box>
        )
      }
      sx={mergeSx(
        {
          px: density === 'compact' ? 2 : 1.75,
          py: density === 'compact' ? 0.1 : 0.25,
          minHeight: density === 'compact' ? 46 : 52,
          '& .MuiAccordionSummary-content': {
            my: density === 'compact' ? 0.65 : 1,
            minWidth: 0,
          },
        },
        sx,
      )}
    />
  )
}
