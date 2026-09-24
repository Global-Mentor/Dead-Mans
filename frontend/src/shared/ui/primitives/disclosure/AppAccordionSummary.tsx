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
          <Box component="span" aria-hidden sx={{ fontSize: 18, lineHeight: 1 }}>
            ⌄
          </Box>
        )
      }
      sx={mergeSx(
        {
          px: density === 'compact' ? 1.25 : 1.75,
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
