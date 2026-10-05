import { Box } from '@mui/material'
import { useId, useState, type ReactNode } from 'react'
import { TabOption, TabStrip } from './TabStrip.tsx'

export interface ContentTabsSelection {
  value: string
  onValueChange: (value: string) => void
}

interface ContentTab {
  id: string
  label: string
  content: ReactNode
}

/** Panels stay mounted to preserve selection and unsaved input. */
export function ContentTabs({
  label,
  items,
  value,
  onValueChange,
  layout = 'flow',
  appearance = 'underline',
  variant = 'fullWidth',
}: {
  label: string
  value?: string | undefined
  onValueChange?: (value: string) => void
  items: readonly ContentTab[]
  layout?: 'flow' | 'fill'
  appearance?: 'underline' | 'framed'
  variant?: 'fullWidth' | 'scrollable'
}) {
  const prefix = useId()
  const [selected, setSelected] = useState(items[0]?.id)
  const requested = value ?? selected
  const active = items.some((item) => item.id === requested) ? requested : items[0]?.id
  return (
    <Box
      sx={{
        minWidth: 0,
        ...(layout === 'fill'
          ? { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }
          : {}),
      }}
    >
      <TabStrip
        value={active}
        onChange={(_, nextValue: string) => {
          if (value === undefined) setSelected(nextValue)
          onValueChange?.(nextValue)
        }}
        aria-label={label}
        variant={variant}
        appearance={appearance}
        sx={{
          flexShrink: 0,
          mb: appearance === 'framed' ? 1 : 2,
          ...(appearance === 'underline'
            ? { borderBottom: '1px solid', borderColor: 'divider' }
            : {}),
        }}
      >
        {items.map((item) => (
          <TabOption
            key={item.id}
            appearance={appearance}
            value={item.id}
            label={item.label}
            id={`${prefix}-${item.id}-tab`}
            aria-controls={`${prefix}-${item.id}-panel`}
          />
        ))}
      </TabStrip>
      {items.map((item) => (
        <Box
          key={item.id}
          id={`${prefix}-${item.id}-panel`}
          role="tabpanel"
          aria-labelledby={`${prefix}-${item.id}-tab`}
          hidden={active !== item.id}
          tabIndex={0}
          sx={{
            minWidth: 0,
            ...(layout === 'fill'
              ? {
                  flex: 1,
                  minHeight: 0,
                  display: active === item.id ? 'flex' : 'none',
                  flexDirection: 'column',
                }
              : {}),
          }}
        >
          {item.content}
        </Box>
      ))}
    </Box>
  )
}
