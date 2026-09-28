import { Box } from '@mui/material'
import { useId, useState, type ReactNode } from 'react'
import { TabOption, TabStrip } from './TabStrip.tsx'

interface ContentTab {
  id: string
  label: string
  content: ReactNode
}

/** Panels stay mounted to preserve selection and unsaved input. */
export function ContentTabs({ label, items }: { label: string; items: readonly ContentTab[] }) {
  const prefix = useId()
  const [selected, setSelected] = useState(items[0]?.id)
  const active = items.some((item) => item.id === selected) ? selected : items[0]?.id
  return (
    <Box sx={{ minWidth: 0 }}>
      <TabStrip
        value={active}
        onChange={(_, value: string) => setSelected(value)}
        aria-label={label}
        variant="fullWidth"
        sx={{ mb: 2, borderBottom: '1px solid', borderColor: 'divider' }}
      >
        {items.map((item) => (
          <TabOption
            key={item.id}
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
          sx={{ minWidth: 0 }}
        >
          {item.content}
        </Box>
      ))}
    </Box>
  )
}
