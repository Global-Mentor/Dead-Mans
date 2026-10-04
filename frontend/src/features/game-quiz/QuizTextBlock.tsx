import { Box, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { DetailBlock } from '../../shared/ui/index.ts'

export function QuizTextBlock({
  label,
  inline = false,
  children,
}: {
  label?: string
  inline?: boolean
  children: ReactNode
}) {
  return (
    <DetailBlock>
      <Typography
        variant="body2"
        sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.4 }}
      >
        {label ? (
          <Box
            component="span"
            sx={{ fontWeight: 700, display: inline ? 'inline' : 'block', mb: inline ? 0 : 0.25 }}
          >
            {label}
            {inline ? ' ' : ''}
          </Box>
        ) : null}
        {children}
      </Typography>
    </DetailBlock>
  )
}
