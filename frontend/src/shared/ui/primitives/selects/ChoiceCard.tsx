import { Box, FormControlLabel, Radio, Typography } from '@mui/material'
import { useState } from 'react'
import { alpha } from '@mui/material/styles'
import { HelpTooltip } from '../../feedback/help/HelpTooltip.tsx'
import { huntWornFrame } from '../../../theme/hunt-materials.ts'

interface ChoiceCardProps {
  value: string
  selected: boolean
  title: string
  description: string
  disabled?: boolean
  density?: 'comfortable' | 'compact'
  textAlign?: 'left' | 'center'
  descriptionPlacement?: 'inline' | 'tooltip'
}

/** A native radio option: selection, keyboard navigation and disabled state stay in RadioGroup. */
export function ChoiceCard({
  value,
  selected,
  title,
  description,
  disabled,
  density = 'comfortable',
  textAlign = 'left',
  descriptionPlacement = 'inline',
}: ChoiceCardProps) {
  const [helpOpen, setHelpOpen] = useState(false)
  const content = (
    <FormControlLabel
      value={value}
      onTouchStart={descriptionPlacement === 'tooltip' ? () => setHelpOpen(true) : undefined}
      disabled={disabled}
      control={
        <Radio
          size="small"
          slotProps={
            descriptionPlacement === 'tooltip'
              ? { input: { 'aria-description': description } }
              : undefined
          }
          sx={{
            p: 0.75,
            mr: textAlign === 'center' ? 0 : 1,
            mt: textAlign === 'center' ? 0 : 0.25,
          }}
        />
      }
      sx={(theme) => ({
        m: 0,
        p: density === 'compact' ? (textAlign === 'center' ? 0.75 : 1.25) : 1.5,
        minHeight: 44,
        ...(textAlign === 'center'
          ? { display: 'grid', gridTemplateColumns: '32px minmax(0, 1fr) 32px' }
          : {}),
        minWidth: 0,
        alignItems: textAlign === 'center' ? 'center' : 'flex-start',
        border: '1px solid',
        borderColor: selected ? 'primary.main' : 'divider',
        position: 'relative',
        backgroundColor: selected ? alpha(theme.palette.primary.main, 0.09) : 'transparent',
        '& .MuiFormControlLabel-label': {
          minWidth: 0,
          ...(textAlign === 'center' ? { gridColumn: 2, textAlign } : {}),
        },
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
          {descriptionPlacement === 'inline' ? (
            <Typography
              component="span"
              variant={density === 'compact' ? 'caption' : 'body2'}
              color="text.secondary"
              sx={{ display: 'block', mt: 0.25 }}
            >
              {description}
            </Typography>
          ) : null}
        </Box>
      }
    />
  )
  return descriptionPlacement === 'tooltip' ? (
    <HelpTooltip
      title={description}
      arrow
      describeChild
      open={helpOpen}
      onOpen={() => setHelpOpen(true)}
      onClose={() => setHelpOpen(false)}
    >
      {content}
    </HelpTooltip>
  ) : (
    content
  )
}
