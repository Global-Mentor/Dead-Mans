import { Box } from '@mui/material'
import type { ReactNode } from 'react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { PanelTriggerPlacement } from '../../../shared/ui/index.ts'
import { PanelTrigger, SidePanel, TabOption, TabStrip } from '../../../shared/ui/index.ts'
export interface AdminToolDescriptor {
  id: string
  label: string
  tabLabel?: string
  content: ReactNode
}

interface AdminToolDrawerProps {
  tools: readonly AdminToolDescriptor[]
  initialToolId: string
  triggerPlacement?: PanelTriggerPlacement
}

export function AdminToolDrawer({
  tools,
  initialToolId,
  triggerPlacement = 'edge',
}: AdminToolDrawerProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [activeToolId, setActiveToolId] = useState(initialToolId)
  const panelId = useId()
  const availableToolIds = useMemo(() => tools.map((tool) => tool.id), [tools])
  const resolvedActiveToolId = availableToolIds.includes(activeToolId)
    ? activeToolId
    : availableToolIds.includes(initialToolId)
      ? initialToolId
      : availableToolIds[0]
  const activeToolIndex = tools.findIndex((tool) => tool.id === resolvedActiveToolId)
  const activeTool = tools[activeToolIndex] ?? null
  const hasMultipleTools = tools.length > 1
  const openerRef = useRef<HTMLButtonElement | null>(null)
  const shouldRestoreFocusRef = useRef(false)

  useEffect(() => {
    if (isOpen) {
      shouldRestoreFocusRef.current = true
      return
    }

    if (shouldRestoreFocusRef.current) {
      shouldRestoreFocusRef.current = false
      openerRef.current?.focus()
    }
  }, [isOpen])

  if (!activeTool) {
    return null
  }

  return (
    <>
      <PanelTrigger
        ref={openerRef}
        placement={triggerPlacement}
        size="medium"
        onClick={() => setIsOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
        aria-label={t('adminTools.openAction')}
      >
        {t(triggerPlacement !== 'edge' ? 'adminTools.inlineOpenAction' : 'adminTools.openAction')}
      </PanelTrigger>

      <SidePanel
        id={panelId}
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title={t('adminTools.inlineOpenAction')}
        label={t('adminTools.drawerLabel')}
        closeLabel={t('adminTools.closeAction')}
        width="wide"
        bodyTestId="admin-tool-drawer-scroll-body"
        header={
          <>
            {hasMultipleTools ? (
              <TabStrip
                value={resolvedActiveToolId}
                onChange={(_, value: string) => setActiveToolId(value)}
                aria-label={t('adminTools.chooseTool')}
                variant="fullWidth"
                appearance="framed"
                sx={{ mt: 2 }}
              >
                {tools.map((tool) => (
                  <TabOption
                    key={tool.id}
                    value={tool.id}
                    label={tool.tabLabel ?? tool.label}
                    aria-label={tool.label}
                    id={`${panelId}-tab-${tool.id}`}
                    aria-controls={`${panelId}-panel-${tool.id}`}
                    appearance="framed"
                  />
                ))}
              </TabStrip>
            ) : null}
          </>
        }
      >
        {tools.map((tool) => (
          <Box
            key={tool.id}
            role="tabpanel"
            id={`${panelId}-panel-${tool.id}`}
            aria-labelledby={hasMultipleTools ? `${panelId}-tab-${tool.id}` : undefined}
            aria-label={tool.label}
            hidden={tool.id !== resolvedActiveToolId}
          >
            {tool.content}
          </Box>
        ))}
      </SidePanel>
    </>
  )
}
