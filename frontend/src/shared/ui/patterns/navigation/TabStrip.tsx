import { Tab, Tabs, type TabProps, type TabsProps } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { huntWornFrame } from '../../../theme/hunt-materials.ts'
import { mergeSx } from '../../../theme/merge-sx.ts'
import { uiTokens } from '../../../theme/tokens.ts'
import { HelpTooltip } from '../../feedback/help/HelpTooltip.tsx'

type TabAppearance = 'underline' | 'framed' | 'category'
type TabDensity = 'comfortable' | 'compact'
/** Controlled tabs for containers that own panel lifetime and selection. */
export function TabStrip({
  appearance = 'underline',
  density = 'comfortable',
  stretch = false,
  sx,
  ...props
}: TabsProps & { appearance?: TabAppearance; density?: TabDensity; stretch?: boolean }) {
  return (
    <Tabs
      {...props}
      sx={mergeSx(
        {
          minHeight: density === 'compact' ? 44 : uiTokens.control.height.large,
          minWidth: 0,
          ...(stretch
            ? {
                height: '100%',
                '& .MuiTabs-scroller': { display: 'flex' },
                '& .MuiTabs-list': { flex: 1, alignItems: 'stretch' },
              }
            : {}),
          ...(appearance === 'framed'
            ? {
                '& .MuiTabs-flexContainer': { gap: density === 'compact' ? 0.5 : 1 },
                '& .MuiTabs-indicator': { display: 'none' },
              }
            : {}),
          ...(appearance === 'category'
            ? { '& .MuiTabs-scrollButtons': { width: uiTokens.control.height.standard } }
            : {}),
        },
        sx,
      )}
    />
  )
}
export function TabOption({
  appearance = 'underline',
  density = 'comfortable',
  sx,
  title,
  ...props
}: TabProps & { appearance?: TabAppearance; density?: TabDensity }) {
  const tab = (
    <Tab
      {...props}
      sx={mergeSx(
        (theme) => ({
          minHeight: density === 'compact' ? 44 : uiTokens.control.height.large,
          minWidth: 0,
          whiteSpace: 'normal',
          overflowWrap: 'anywhere',
          ...(appearance === 'framed'
            ? {
                px: density === 'compact' ? 0.75 : 1,
                py: 0.75,
                textTransform: 'none',
                fontSize: density === 'compact' ? 14 : 16,
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
              }
            : {}),
          ...(appearance === 'category'
            ? {
                minWidth: 64,
                maxWidth: 'min(76vw, 240px)',
                textTransform: 'none',
                fontSize: 'clamp(0.78rem, 3.8vw, 0.9rem)',
              }
            : {}),
        }),
        sx,
      )}
    />
  )
  return title ? (
    <HelpTooltip title={title} describeChild>
      {tab}
    </HelpTooltip>
  ) : (
    tab
  )
}
