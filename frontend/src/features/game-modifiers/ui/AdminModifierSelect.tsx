import { Box, Stack, Typography } from '@mui/material'
import type { ComponentProps } from 'react'
import { useTranslation } from 'react-i18next'
import { ModifierIconTile } from '../../../shared/game-ui/index.ts'
import {
  Combobox,
  createFilterOptions,
  FormTextField,
  FieldAdornment,
  StatusBadge,
} from '../../../shared/ui/index.ts'
import type { ModifierSelectOption } from '../model/admin-modifier-support.ts'

/** Modifier identity, icon and search shared by all host modifier actions. */
export function AdminModifierSelect({
  modifiers,
  value,
  onChange,
  label,
  disabled,
  showCost = false,
}: {
  modifiers: readonly ModifierSelectOption[]
  value: string
  onChange: (modifierId: string) => void
  label: string
  disabled: boolean
  showCost?: boolean
}) {
  const { t } = useTranslation()
  const selected = modifiers.find((modifier) => modifier.id === value) ?? null
  return (
    <Combobox
      size="small"
      autoHighlight
      selectOnFocus
      options={modifiers}
      value={selected}
      filterOptions={createFilterOptions<ModifierSelectOption>({
        limit: 30,
        stringify: (modifier) => modifier.searchText ?? modifier.name,
      })}
      onChange={(_, modifier) => onChange(modifier?.id ?? '')}
      getOptionLabel={(modifier) => modifier.name}
      getOptionKey={(modifier) => modifier.id}
      isOptionEqualToValue={(option, chosen) => option.id === chosen.id}
      disabled={disabled}
      renderOption={({ key, ...props }, modifier) => (
        <Box
          component="li"
          key={key}
          {...props}
          sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
        >
          <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%' }}>
            <ModifierIconTile emoji={modifier.iconEmoji} />
            <Typography variant="body2" sx={{ minWidth: 0, flex: 1 }}>
              {modifier.name}
            </Typography>
            {modifier.activationCount != null ? (
              <StatusBadge
                density="tight"
                variant="outlined"
                label={t('gameModifiers.activeStackMultiplier', {
                  count: modifier.activationCount,
                })}
              />
            ) : null}
            {showCost ? (
              <Typography variant="caption" color="text.secondary">
                {t('gameModifiers.adminPanel.modifierCostOption', {
                  cost: modifier.activationCost,
                })}
              </Typography>
            ) : null}
          </Stack>
        </Box>
      )}
      renderInput={(params) => (
        <FormTextField
          {...(params as unknown as ComponentProps<typeof FormTextField>)}
          label={label}
          InputProps={{
            ...params.InputProps,
            startAdornment: selected ? (
              <FieldAdornment position="start">
                <ModifierIconTile emoji={selected.iconEmoji} />
              </FieldAdornment>
            ) : (
              params.InputProps.startAdornment
            ),
          }}
        />
      )}
    />
  )
}
