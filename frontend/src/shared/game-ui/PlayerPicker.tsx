import { Box, Typography } from '@mui/material'
import type { ComponentProps } from 'react'
import { Combobox, createFilterOptions, FormTextField } from '../ui/index.ts'

export interface PickerPlayer {
  userId: string
  displayName: string
  login?: string | null
}

/** The same searchable player identity in host tools and manual point adjustments. */
export function PlayerPicker<T extends PickerPlayer>({
  players,
  value,
  onChange,
  label,
  disabled = false,
}: {
  players: readonly T[]
  value: T | null
  onChange: (player: T | null) => void
  label: string
  disabled?: boolean
}) {
  return (
    <Combobox
      size="small"
      autoHighlight
      selectOnFocus
      options={players}
      value={value}
      filterOptions={createFilterOptions<T>({
        limit: 30,
        stringify: (player) => `${player.displayName} ${player.login ?? ''}`,
      })}
      onChange={(_, player) => onChange(player)}
      getOptionLabel={(player) => player.displayName}
      getOptionKey={(player) => player.userId}
      isOptionEqualToValue={(option, selected) => option.userId === selected.userId}
      disabled={disabled}
      renderOption={({ key, ...props }, player) => (
        <Box component="li" key={key} {...props}>
          <Typography variant="body2">{player.displayName}</Typography>
        </Box>
      )}
      renderInput={(params) => (
        <FormTextField
          {...(params as unknown as ComponentProps<typeof FormTextField>)}
          size="small"
          label={label}
        />
      )}
    />
  )
}
