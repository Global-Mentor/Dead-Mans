import { Box, Stack } from '@mui/material'
import { Controller, type Control } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { DefaultTranslation } from '../../../locales/index.ts'
import { FormSelect, ControlledFormTextField, FieldWithHelp } from '../../../shared/ui/index.ts'
import { modifierKinds, type ModifierFormValues } from '../model/modifier-form-schema.ts'

export function ModifierCardStep({
  control,
  disabled,
}: {
  control: Control<ModifierFormValues>
  disabled: boolean
}) {
  const { t } = useTranslation()
  const help = (field: keyof DefaultTranslation['gameCatalog']['modifiers']['wizard']['help']) =>
    t(`gameCatalog.modifiers.wizard.help.${field}`)
  return (
    <Stack spacing={1.5}>
      <FieldWithHelp
        helpAlign="center"
        label={t('gameCatalog.modifiers.wizard.kind')}
        help={help('kind')}
      >
        <Controller
          control={control}
          name="kind"
          render={({ field, fieldState }) => (
            <FormSelect
              inputRef={field.ref}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              name={field.name}
              label={t('gameCatalog.modifiers.wizard.kind')}
              disabled={disabled}
              error={fieldState.invalid}
              helperText={fieldState.error?.message}
              options={modifierKinds.map((kind) => ({
                value: kind,
                label: t(`gameCatalog.modifiers.wizard.kinds.${kind}`),
              }))}
            />
          )}
        />
      </FieldWithHelp>
      <Box
        sx={{
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 3fr) minmax(0, 1fr)' },
        }}
      >
        <FieldWithHelp
          helpAlign="center"
          label={t('gameCatalog.modifiers.fields.name')}
          help={help('name')}
        >
          <ControlledFormTextField
            control={control}
            name="name"
            label={t('gameCatalog.modifiers.fields.name')}
            disabled={disabled}
          />
        </FieldWithHelp>
        <FieldWithHelp
          helpAlign="center"
          label={t('gameCatalog.modifiers.fields.iconEmoji')}
          help={help('iconEmoji')}
        >
          <ControlledFormTextField
            control={control}
            name="iconEmoji"
            label={t('gameCatalog.modifiers.fields.iconEmoji')}
            disabled={disabled}
          />
        </FieldWithHelp>
      </Box>
      <FieldWithHelp
        helpAlign="center"
        label={t('gameCatalog.modifiers.fields.description')}
        help={help('description')}
      >
        <ControlledFormTextField
          control={control}
          name="description"
          label={t('gameCatalog.modifiers.fields.description')}
          multiline
          minRows={3}
          disabled={disabled}
        />
      </FieldWithHelp>
    </Stack>
  )
}
