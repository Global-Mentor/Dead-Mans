import { Box } from '@mui/material'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActionMenu, ActionMenuItem, AppButton, HelpTooltip } from '../../../shared/ui/index.ts'

export function AdminCreateTeamButton({
  canCreate,
  isCreating,
  onCreate,
}: {
  canCreate: boolean
  isCreating: boolean
  onCreate: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const menuId = useId()
  return (
    <>
      <HelpTooltip
        title={!canCreate ? t('teamRegistrations.noSlots') : ''}
        describeChild
        arrow
        disableInteractive
      >
        <Box
          component="span"
          tabIndex={!canCreate ? 0 : undefined}
          sx={{ display: 'flex', flexShrink: 0 }}
        >
          <AppButton
            framePlacement="inset"
            size="large"
            disabled={!canCreate || isCreating}
            aria-haspopup="menu"
            aria-expanded={Boolean(anchor)}
            aria-controls={anchor ? menuId : undefined}
            onClick={(event) => setAnchor(event.currentTarget)}
            sx={{ width: '100%' }}
          >
            {t('teamRegistrations.create')}
          </AppButton>
        </Box>
      </HelpTooltip>
      <ActionMenu
        id={menuId}
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
      >
        {[true, false].map((open) => (
          <ActionMenuItem
            key={String(open)}
            disabled={!canCreate || isCreating}
            onClick={() => {
              setAnchor(null)
              onCreate(open)
            }}
          >
            {t(
              open
                ? 'gameApplication.adminPanel.createOpenTeam'
                : 'gameApplication.adminPanel.createPrivateTeam',
            )}
          </ActionMenuItem>
        ))}
      </ActionMenu>
    </>
  )
}
