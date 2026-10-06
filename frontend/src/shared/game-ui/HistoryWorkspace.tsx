import { Box, Stack, Typography, useMediaQuery } from '@mui/material'
import type { ReactNode } from 'react'
import { NativeDisclosure } from '../ui/index.ts'
import { RoundBriefingPanel } from './RoundBriefingPanel.tsx'

/** History navigation stays separate from the selected immutable record. */
export function HistoryWorkspace({
  title,
  selectedLabel,
  hasSelection,
  pickerOpen,
  onPickerOpenChange,
  tools,
  records,
  children,
}: {
  title: string
  selectedLabel?: string | undefined
  hasSelection: boolean
  pickerOpen: boolean
  onPickerOpenChange: (open: boolean) => void
  tools: ReactNode
  records: ReactNode
  children: ReactNode
}) {
  const wide = useMediaQuery('(min-width: 1000px)')
  const content = (
    <Stack gap={1} sx={{ minHeight: 0, flex: 1, height: wide ? '100%' : 'min(440px, 45dvh)' }}>
      <Box sx={{ flexShrink: 0 }}>{tools}</Box>
      <Box
        role="region"
        aria-label={title}
        tabIndex={0}
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overscrollBehaviorY: 'contain',
        }}
      >
        {records}
      </Box>
    </Stack>
  )
  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        display: 'grid',
        gap: 1,
        gridTemplateColumns: 'minmax(0, 1fr)',
        gridTemplateRows: 'auto minmax(0, 1fr)',
        '@media (min-width: 1000px)': {
          gridTemplateColumns: '300px minmax(0, 1fr)',
          gridTemplateRows: 'minmax(0, 1fr)',
        },
      }}
    >
      {wide ? (
        <RoundBriefingPanel
          header={
            <Typography component="h2" variant="h6" textAlign="center">
              {title}
            </Typography>
          }
          sx={{ minHeight: 0 }}
        >
          {content}
        </RoundBriefingPanel>
      ) : (
        <RoundBriefingPanel sx={{ p: 1, minHeight: 0 }}>
          <NativeDisclosure
            indicator="chevron"
            density="compact"
            open={pickerOpen || !hasSelection}
            onExpandedChange={onPickerOpenChange}
            summary={
              <>
                {title}
                {selectedLabel ? ' · ' + selectedLabel : ''}
              </>
            }
          >
            {content}
          </NativeDisclosure>
        </RoundBriefingPanel>
      )}
      <Box sx={{ minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {children}
      </Box>
    </Box>
  )
}
