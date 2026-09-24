import { Box } from '@mui/material'
import { ActionIcon } from '../../primitives/buttons/ActionIcon.tsx'
import { HelpTooltip } from './HelpTooltip.tsx'

export function FieldHelp({ title, label = title }: { title: string; label?: string }) {
  return (
    <HelpTooltip title={title} arrow placement="top">
      <ActionIcon size="small" aria-label={label} sx={{ color: 'text.secondary' }}>
        <Box
          component="span"
          aria-hidden
          sx={{
            width: 18,
            height: 18,
            borderRadius: '50%',
            border: 1,
            borderColor: 'divider',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.7rem',
            fontWeight: 700,
          }}
        >
          ?
        </Box>
      </ActionIcon>
    </HelpTooltip>
  )
}
