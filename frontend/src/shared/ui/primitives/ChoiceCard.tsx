import { Box, FormControlLabel, Radio, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { huntWornFrame } from '../../theme/hunt-materials.ts'

interface ChoiceCardProps {
  value: string
  selected: boolean
  title: string
  description: string
  disabled?: boolean
  density?: 'comfortable' | 'compact'
}

/** A native radio option: selection, keyboard navigation and disabled state stay in RadioGroup. */
export function ChoiceCard({
  value,
  selected,
  title,
  description,
  disabled,
  density = 'comfortable',
}: ChoiceCardProps) {
  return (
    <FormControlLabel
      value={value}
      disabled={disabled}
      control={<Radio size="small" sx={{ p: 0.75, mr: 1, mt: 0.25 }} />}
      sx={(theme) => ({
        m: 0,
        p: density === 'compact' ? 1.25 : 1.5,
        minWidth: 0,
        alignItems: 'flex-start',
        border: '1px solid',
        borderColor: selected ? 'primary.main' : 'divider',
        position: 'relative',
        backgroundColor: selected ? alpha(theme.palette.primary.main, 0.09) : 'transparent',
        '& .MuiFormControlLabel-label': { minWidth: 0 },
        '&::after': selected
          ? {
              content: '""',
              position: 'absolute',
              inset: 0,
              border: '1px solid transparent',
              ...huntWornFrame,
              pointerEvents: 'none',
            }
          : {},
        '&:not(.Mui-disabled):hover': { backgroundColor: alpha(theme.palette.primary.main, 0.13) },
        '&:has(.Mui-focusVisible)': {
          outline: '2px solid',
          outlineColor: 'primary.light',
          outlineOffset: 4,
        },
        '&.Mui-disabled': { opacity: 0.55 },
      })}
      label={
        <Box component="span" sx={{ display: 'block' }}>
          <Typography component="span" variant="subtitle2">
            {title}
          </Typography>
          <Typography
            component="span"
            variant={density === 'compact' ? 'caption' : 'body2'}
            color="text.secondary"
            sx={{ display: 'block', mt: 0.25 }}
          >
            {description}
          </Typography>
        </Box>
      }
    />
  )
}
