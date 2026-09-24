import { Box, Stack, Typography } from '@mui/material'
import type { Control } from 'react-hook-form'
import { Controller } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { GameModifierDefinition } from '../../../shared/api/contracts/index.ts'
import { Combobox, FormTextField, StatusBadge, TaskProgress } from '../../../shared/ui/index.ts'
import {
  normalizeModifierTags,
  suggestedModifierTags,
  type ModifierFormValues,
} from '../model/modifier-form-schema.ts'

export function ModifierConflictField({
  control,
  currentModifierId,
  disabled,
  modifiers,
}: {
  control: Control<ModifierFormValues>
  currentModifierId?: string | undefined
  disabled: boolean
  modifiers: GameModifierDefinition[]
}) {
  const { t } = useTranslation()
  const options = modifiers.filter((modifier) => modifier.id !== currentModifierId)

  return (
    <Controller
      control={control}
      name="conflictingModifierIds"
      render={({ field, fieldState }) => (
        <Combobox
          multiple
          disabled={disabled}
          options={options}
          value={options.filter((option) => field.value.includes(option.id))}
          getOptionLabel={(option) => option.name}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          onChange={(_, value) => field.onChange(value.map((option) => option.id))}
          renderInput={(params) => (
            <FormTextField
              {...params}
              label={t('gameCatalog.modifiers.fields.conflicts')}
              error={fieldState.invalid}
              helperText={
                fieldState.error?.message ?? t('gameCatalog.modifiers.fields.conflictsHint')
              }
            />
          )}
        />
      )}
    />
  )
}

export function ModifierTagField({
  control,
  disabled,
}: {
  control: Control<ModifierFormValues>
  disabled: boolean
}) {
  const { t } = useTranslation()
  return (
    <Controller
      control={control}
      name="tags"
      render={({ field, fieldState }) => (
        <Combobox
          multiple
          freeSolo
          disabled={disabled}
          options={suggestedModifierTags.map((tag) =>
            t(`gameCatalog.modifiers.wizard.suggestedTags.${tag}`),
          )}
          value={field.value}
          onChange={(_, value) => field.onChange(normalizeModifierTags(value))}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <StatusBadge label={option} size="small" {...getTagProps({ index })} key={option} />
            ))
          }
          renderInput={(params) => (
            <FormTextField
              {...params}
              label={t('gameCatalog.modifiers.wizard.tags')}
              error={fieldState.invalid}
              helperText={fieldState.error?.message ?? t('gameCatalog.modifiers.wizard.tagsHint')}
            />
          )}
        />
      )}
    />
  )
}

export function ModifierWizardProgress({
  kind,
  step,
}: {
  kind: ModifierFormValues['kind']
  step: number
}) {
  const { t } = useTranslation()
  if (step !== 0 && step !== 1 && step !== 2 && step !== 3) return null
  const visibleSteps = kind === 'rule' ? [0, 1, 3] : [0, 1, 2, 3]
  const current = visibleSteps.indexOf(step) + 1
  const total = visibleSteps.length
  return (
    <Box sx={{ mb: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 1 }}>
        <Typography variant="subtitle2">
          {t('gameCatalog.modifiers.wizard.step', { current, total })}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {t('gameCatalog.modifiers.wizard.steps', { returnObjects: true })[step]}
        </Typography>
      </Stack>
      <TaskProgress variant="determinate" value={(current / total) * 100} aria-hidden />
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {t('gameCatalog.modifiers.wizard.stepDescriptions', { returnObjects: true })[step]}
      </Typography>
    </Box>
  )
}
