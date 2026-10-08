import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActionIcon, ActionMenu, ActionMenuItem, HelpTooltip } from '../../../shared/ui/index.ts'

export function AdminPlayerActionsMenu({
  name,
  disabled,
  onMove,
  onRemove,
}: {
  name: string
  disabled: boolean
  onMove: () => void
  onRemove: () => void
}) {
  const { t } = useTranslation()
  const id = useId()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  return (
    <>
      <HelpTooltip title={t('teamRegistrations.playerActionsHint')} describeChild arrow>
        <ActionIcon
          appearance="outlined"
          aria-label={t('teamRegistrations.playerActions', { name })}
          aria-haspopup="menu"
          aria-expanded={Boolean(anchor)}
          aria-controls={anchor ? id : undefined}
          disabled={disabled}
          onClick={(event) => setAnchor(event.currentTarget)}
        >
          <svg aria-hidden width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <circle cx="4" cy="10" r="1.5" />
            <circle cx="10" cy="10" r="1.5" />
            <circle cx="16" cy="10" r="1.5" />
          </svg>
        </ActionIcon>
      </HelpTooltip>
      <ActionMenu id={id} anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        <ActionMenuItem
          disabled={disabled}
          aria-label={t('teamRegistrations.movePlayer', { name })}
          onClick={() => {
            setAnchor(null)
            onMove()
          }}
        >
          {t('teamRegistrations.move')}
        </ActionMenuItem>
        <ActionMenuItem
          disabled={disabled}
          sx={{ color: 'error.main' }}
          onClick={() => {
            setAnchor(null)
            onRemove()
          }}
        >
          {t('gameApplication.adminPanel.removePlayer')}
        </ActionMenuItem>
      </ActionMenu>
    </>
  )
}
