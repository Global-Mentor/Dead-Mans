import { Box, Stack, Typography } from '@mui/material'
import { Children, useEffect, useRef } from 'react'
import type { Control } from 'react-hook-form'
import { Controller } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { GameModifierDefinition } from '../../../shared/api/contracts/index.ts'
import {
  Combobox,
  FormTextField,
  LockIcon,
  MenuGroupLabel,
  SectionDivider,
  StatusBadge,
  TaskProgress,
} from '../../../shared/ui/index.ts'
import { ModifierIconTile } from '../../../shared/game-ui/index.ts'
import type { ModifierFormValues } from '../model/modifier-form-schema.ts'

export function ModifierConflictField({
  control,
  currentModifierId,
  initialConflictingModifierIds = [],
  disabled,
  modifiers,
}: {
  control: Control<ModifierFormValues>
  currentModifierId?: string | undefined
  initialConflictingModifierIds?: readonly string[]
  disabled: boolean
  modifiers: GameModifierDefinition[]
}) {
  const { t, i18n } = useTranslation()
  const collator = new Intl.Collator(i18n.resolvedLanguage, { numeric: true, sensitivity: 'base' })
  const options = modifiers
    .filter((modifier) => modifier.id !== currentModifierId)
    .sort(
      (a, b) =>
        Number(a.isLockedByActiveGame) - Number(b.isLockedByActiveGame) ||
        collator.compare(a.name, b.name) ||
        a.id.localeCompare(b.id),
    )

  const protectedIds = options
    .filter(
      (option) => option.isLockedByActiveGame && initialConflictingModifierIds.includes(option.id),
    )
    .map((option) => option.id)

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
          getOptionLabel={(option) =>
            option.iconEmoji ? `${option.iconEmoji} ${option.name}` : option.name
          }
          getOptionKey={(option) => option.id}
          groupBy={(option) => (option.isLockedByActiveGame ? 'locked' : 'available')}
          renderGroup={({ key, group, children }) => {
            const label = t(
              group === 'locked'
                ? 'gameCatalog.modifiers.fields.lockedConflicts'
                : 'gameCatalog.modifiers.fields.availableConflicts',
            )
            return (
              <Box component="li" role="presentation" key={key}>
                {key > 0 ? <SectionDivider sx={{ my: 0.75 }} /> : null}
                <Box component="ul" role="group" aria-label={label} sx={{ m: 0, p: 0 }}>
                  <MenuGroupLabel appearance="section" disableSticky>
                    {label}
                  </MenuGroupLabel>
                  {Children.toArray(children).flatMap((child, index) =>
                    index === 0
                      ? [child]
                      : [
                          <Box
                            component="li"
                            role="presentation"
                            aria-hidden
                            key={`divider-${index}`}
                            sx={{ display: 'block', height: 1, overflow: 'hidden' }}
                          >
                            <SectionDivider />
                          </Box>,
                          child,
                        ],
                  )}
                </Box>
              </Box>
            )
          }}
          getOptionDisabled={(option) =>
            option.isLockedByActiveGame &&
            (!initialConflictingModifierIds.includes(option.id) || field.value.includes(option.id))
          }
          renderValue={(selected, getItemProps) =>
            selected.map((option, index) => {
              const { key, onDelete, ...itemProps } = getItemProps({ index })
              return (
                <StatusBadge
                  key={key}
                  {...itemProps}
                  label={option.iconEmoji ? `${option.iconEmoji} ${option.name}` : option.name}
                  onDelete={protectedIds.includes(option.id) ? undefined : onDelete}
                />
              )
            })
          }
          renderOption={({ key, ...props }, option) => (
            <Box component="li" key={key} {...props}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                <ModifierIconTile emoji={option.iconEmoji} />
                <Box sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <Typography variant="body2">{option.name}</Typography>
                    {option.isLockedByActiveGame ? <LockIcon fontSize="small" /> : null}
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {t(`common.modifiers.categories.${option.category}`)}
                  </Typography>
                  {option.isLockedByActiveGame ? (
                    <Typography variant="caption" component="div">
                      {t('gameCatalog.modifiers.fields.conflictLocked')}
                    </Typography>
                  ) : null}
                </Box>
              </Stack>
            </Box>
          )}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          onChange={(_, value) =>
            field.onChange([...new Set([...value.map((option) => option.id), ...protectedIds])])
          }
          renderInput={(params) => (
            <FormTextField
              {...params}
              label={t('gameCatalog.modifiers.fields.conflicts')}
              error={fieldState.invalid}
              helperText={fieldState.error?.message}
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
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    heading.current?.focus()
  }, [step])
  if (step !== 0 && step !== 1 && step !== 2 && step !== 3) return null
  const visibleSteps = kind === 'rule' ? [0, 1, 3] : [0, 1, 2, 3]
  const current = visibleSteps.indexOf(step) + 1
  const total = visibleSteps.length
  return (
    <Box sx={{ mb: 2 }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="baseline"
        gap={1.5}
        sx={{ mb: 1 }}
      >
        <Typography component="h2" variant="h6" tabIndex={-1} ref={heading}>
          {t('gameCatalog.modifiers.wizard.steps', { returnObjects: true })[step]}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
          {t('gameCatalog.modifiers.wizard.step', { current, total })}
        </Typography>
      </Stack>
      <TaskProgress variant="determinate" value={(current / total) * 100} aria-hidden />
      {step !== 3 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {t('gameCatalog.modifiers.wizard.stepDescriptions', { returnObjects: true })[step]}
        </Typography>
      ) : null}
    </Box>
  )
}
