import { Box } from '@mui/material'
import type { DragEventHandler } from 'react'
import { useTranslation } from 'react-i18next'
import { ActionIcon } from '../../../shared/ui/index.ts'

export function AdminTeamOrderHandle({
  name,
  disabled,
  onDragStart,
  onDragEnd,
}: {
  name: string
  disabled: boolean
  onDragStart: DragEventHandler<HTMLButtonElement>
  onDragEnd: DragEventHandler<HTMLButtonElement>
}) {
  const { t } = useTranslation()
  return (
    <ActionIcon
      aria-label={t('teamRegistrations.orderTeam', { name })}
      disabled={disabled}
      draggable={!disabled}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      sx={{ cursor: disabled ? undefined : 'grab' }}
    >
      <Box component="svg" aria-hidden viewBox="0 0 24 24" sx={{ width: 20, height: 20 }}>
        {[7, 12, 17].flatMap((y) =>
          [9, 15].map((x) => (
            <circle key={x + ':' + y} cx={x} cy={y} r="1.5" fill="currentColor" />
          )),
        )}
      </Box>
    </ActionIcon>
  )
}
