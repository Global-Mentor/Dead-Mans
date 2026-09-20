import { Box, Drawer, IconButton, Stack, Tab, Tabs, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import type { ReactNode } from 'react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppButton } from '../../../shared/ui/index.ts'
import { huntWornFrame } from '../../../shared/theme/hunt-materials.ts'
import {
  sidePanelCloseSx,
  sidePanelHeaderSx,
  sidePanelPaperSx,
  sidePanelTitleSx,
} from '../../../shared/theme/side-panel-sx.ts'

export interface AdminToolDescriptor {
  id: string
  label: string
  tabLabel?: string
  content: ReactNode
}

interface AdminToolDrawerProps {
  tools: readonly AdminToolDescriptor[]
  initialToolId: string
  inlineTrigger?: boolean
}

export function AdminToolDrawer({
  tools,
  initialToolId,
  inlineTrigger = false,
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
      <AppButton
        ref={openerRef}
        tone={inlineTrigger ? 'ghost' : 'secondary'}
        size="medium"
        onClick={() => setIsOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
        aria-label={t('adminTools.openAction')}
        sx={(theme) =>
          inlineTrigger
            ? {
                minHeight: 44,
                whiteSpace: 'normal',
                textTransform: 'none',
                fontSize: 14,
                px: 1.5,
              }
            : {
                position: 'fixed',
                zIndex: theme.zIndex.drawer - 1,
                right: { xs: 12, md: 0 },
                top: { xs: 'auto', md: '50%' },
                bottom: { xs: 16, md: 'auto' },
                transform: { xs: 'none', md: 'translateY(-50%)' },
                minWidth: { xs: 0, md: 52 },
                minHeight: { xs: 46, md: 192 },
                px: { xs: 1.6, md: 0.95 },
                py: { xs: 0.9, md: 1.6 },
                borderRadius: { xs: 999, md: '18px 0 0 18px' },
                writingMode: { xs: 'horizontal-tb', md: 'vertical-rl' },
                textOrientation: { xs: 'mixed', md: 'mixed' },
                justifyContent: 'center',
                letterSpacing: '0.03em',
                whiteSpace: 'nowrap',
                boxShadow: `0 14px 28px ${alpha(theme.palette.common.black, 0.38)}`,
              }
        }
      >
        {t(inlineTrigger ? 'adminTools.inlineOpenAction' : 'adminTools.openAction')}
      </AppButton>

      <Drawer
        anchor="right"
        open={isOpen}
        onClose={() => setIsOpen(false)}
        ModalProps={{ keepMounted: true }}
        PaperProps={{
          sx: (theme) => ({
            ...sidePanelPaperSx(theme),
            width: { xs: '100vw', md: 520 },
            maxWidth: '100vw',
            height: '100dvh',
            display: 'grid',
            gridTemplateRows: 'auto minmax(0, 1fr)',
            borderLeft: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
            overflow: 'hidden',
          }),
        }}
      >
        <Box
          id={panelId}
          component="aside"
          aria-label={t('adminTools.drawerLabel')}
          sx={{ display: 'contents' }}
        >
          <Box
            sx={(theme) => ({
              ...sidePanelHeaderSx(theme),
            })}
          >
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
              <Typography component="h2" variant="h6" sx={sidePanelTitleSx}>
                {t('adminTools.inlineOpenAction')}
              </Typography>
              <IconButton
                aria-label={t('adminTools.closeAction')}
                onClick={() => setIsOpen(false)}
                sx={sidePanelCloseSx}
              >
                <Box component="span" aria-hidden sx={{ fontSize: 24, lineHeight: 1 }}>
                  ×
                </Box>
              </IconButton>
            </Stack>
            {hasMultipleTools ? (
              <Tabs
                value={resolvedActiveToolId}
                onChange={(_, value: string) => setActiveToolId(value)}
                aria-label={t('adminTools.chooseTool')}
                variant="fullWidth"
                sx={{
                  mt: 2,
                  minHeight: 44,
                  '& .MuiTabs-flexContainer': { gap: 1 },
                  '& .MuiTabs-indicator': { display: 'none' },
                }}
              >
                {tools.map((tool) => (
                  <Tab
                    key={tool.id}
                    value={tool.id}
                    label={tool.tabLabel ?? tool.label}
                    aria-label={tool.label}
                    id={`${panelId}-tab-${tool.id}`}
                    aria-controls={`${panelId}-panel-${tool.id}`}
                    sx={(theme) => ({
                      minWidth: 0,
                      minHeight: 44,
                      px: 1,
                      py: 0.75,
                      textTransform: 'none',
                      fontSize: 16,
                      lineHeight: 1.3,
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.24)}`,
                      borderRadius: 0,
                      color: 'text.secondary',
                      '&.Mui-selected': {
                        color: 'text.primary',
                        ...huntWornFrame,
                        borderImageOutset: 0,
                        bgcolor: alpha(theme.palette.primary.main, 0.12),
                      },
                      '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.07) },
                    })}
                  />
                ))}
              </Tabs>
            ) : null}
          </Box>

          <Box
            data-testid="admin-tool-drawer-scroll-body"
            sx={{
              minHeight: 0,
              overflowY: 'auto',
              overflowX: 'hidden',
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch',
              px: { xs: 2, sm: 2.5 },
              pt: 2,
              pb: 'max(20px, env(safe-area-inset-bottom))',
            }}
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
          </Box>
        </Box>
      </Drawer>
    </>
  )
}
