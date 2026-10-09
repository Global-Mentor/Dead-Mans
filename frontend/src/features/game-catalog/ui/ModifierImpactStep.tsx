import { Stack } from '@mui/material'
import type { Control, UseFormSetValue } from 'react-hook-form'
import { Controller, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { DefaultTranslation } from '../../../locales/index.ts'
import {
  ChoiceCard,
  ChoiceGroup,
  ControlledFormTextField,
  FieldAdornment,
  FieldGroup,
  FieldWithHelp,
  FormSection,
} from '../../../shared/ui/index.ts'
import {
  modifierEventMaximumKinds,
  modifierEventMeasurementModes,
  modifierKillMeasurementModes,
  modifierMeasurementDomains,
  modifierPayoutKinds,
  type ModifierFormValues,
} from '../model/modifier-form-schema.ts'

export function ModifierImpactStep({
  control,
  disabled,
  setValue,
}: {
  control: Control<ModifierFormValues>
  disabled: boolean
  setValue: UseFormSetValue<ModifierFormValues>
}) {
  const { t } = useTranslation()
  const measurementDomain = useWatch({ control, name: 'measurementDomain' })
  const killMeasurementMode = useWatch({ control, name: 'killMeasurementMode' })
  const eventMeasurementMode = useWatch({ control, name: 'eventMeasurementMode' })
  const eventMaximumKind = useWatch({ control, name: 'eventMaximumKind' })
  const payoutKind = useWatch({ control, name: 'payoutKind' })
  const help = (field: keyof DefaultTranslation['gameCatalog']['modifiers']['wizard']['help']) =>
    t(`gameCatalog.modifiers.wizard.help.${field}`)

  const cards = <T extends string>(
    values: readonly T[],
    selected: T | null,
    label: (value: T, part: 'title' | 'description') => string,
    isDisabled = disabled,
  ) =>
    values.map((value) => (
      <ChoiceCard
        density="compact"
        textAlign="center"
        descriptionPlacement="tooltip"
        key={value}
        value={value}
        selected={selected === value}
        disabled={isDisabled}
        title={label(value, 'title')}
        description={label(value, 'description')}
      />
    ))

  return (
    <Stack spacing={2}>
      <FormSection title={t('gameCatalog.modifiers.wizard.measurement.title')}>
        <Stack gap={2}>
          <Controller
            control={control}
            name="measurementDomain"
            render={({ field, fieldState }) => (
              <FieldGroup
                component="fieldset"
                error={fieldState.invalid}
                fullWidth
                label={<>{t('gameCatalog.modifiers.wizard.measurement.question')}</>}
                helperText={fieldState.error?.message}
              >
                <ChoiceGroup
                  value={field.value ?? ''}
                  onChange={(_, value) => field.onChange(value)}
                  sx={{
                    mt: 0.75,
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                    gap: 1,
                  }}
                >
                  {cards(modifierMeasurementDomains, field.value, (value, part) =>
                    t(`gameCatalog.modifiers.wizard.measurement.domains.${value}.${part}`),
                  )}
                </ChoiceGroup>
              </FieldGroup>
            )}
          />

          {measurementDomain === 'kills' ? (
            <Controller
              control={control}
              name="killMeasurementMode"
              render={({ field }) => (
                <FieldGroup
                  component="fieldset"
                  fullWidth
                  label={<>{t('gameCatalog.modifiers.wizard.measurement.killQuestion')}</>}
                >
                  <ChoiceGroup
                    {...field}
                    sx={{
                      mt: 0.75,
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                      gap: 0.75,
                    }}
                  >
                    {cards(modifierKillMeasurementModes, field.value, (value, part) =>
                      t(`gameCatalog.modifiers.wizard.measurement.killModes.${value}.${part}`),
                    )}
                  </ChoiceGroup>
                </FieldGroup>
              )}
            />
          ) : null}

          {measurementDomain === 'event' ? (
            <Controller
              control={control}
              name="eventMeasurementMode"
              render={({ field }) => (
                <FieldGroup
                  component="fieldset"
                  fullWidth
                  label={<>{t('gameCatalog.modifiers.wizard.measurement.eventQuestion')}</>}
                >
                  <ChoiceGroup
                    {...field}
                    sx={{
                      mt: 0.75,
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                      gap: 0.75,
                    }}
                  >
                    {cards(modifierEventMeasurementModes, field.value, (value, part) =>
                      t(`gameCatalog.modifiers.wizard.measurement.eventModes.${value}.${part}`),
                    )}
                  </ChoiceGroup>
                </FieldGroup>
              )}
            />
          ) : null}

          {(measurementDomain === 'kills' && killMeasurementMode === 'qualifying') ||
          (measurementDomain === 'event' && eventMeasurementMode !== 'perActivation') ? (
            <FieldWithHelp
              helpAlign="center"
              label={t('gameCatalog.modifiers.wizard.measurement.inputLabel')}
              help={help('eventInputLabel')}
            >
              <ControlledFormTextField
                control={control}
                name="eventInputLabel"
                label={t('gameCatalog.modifiers.wizard.measurement.inputLabel')}
                disabled={disabled}
              />
            </FieldWithHelp>
          ) : null}

          {measurementDomain === 'event' && eventMeasurementMode === 'count' ? (
            <>
              <Controller
                control={control}
                name="eventMaximumKind"
                render={({ field }) => (
                  <FieldGroup
                    component="fieldset"
                    fullWidth
                    label={<>{t('gameCatalog.modifiers.wizard.measurement.maximumQuestion')}</>}
                  >
                    <ChoiceGroup
                      {...field}
                      sx={{
                        mt: 0.75,
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                        gap: 1,
                      }}
                    >
                      {cards(modifierEventMaximumKinds, field.value, (value, part) =>
                        t(`gameCatalog.modifiers.wizard.measurement.maximumKinds.${value}.${part}`),
                      )}
                    </ChoiceGroup>
                  </FieldGroup>
                )}
              />
              {eventMaximumKind === 'activations' ? (
                <FieldWithHelp
                  helpAlign="center"
                  label={t('gameCatalog.modifiers.wizard.measurement.eventsPerActivation')}
                  help={t('gameCatalog.modifiers.wizard.measurement.eventsPerActivationHint')}
                >
                  <ControlledFormTextField
                    control={control}
                    name="eventsPerActivation"
                    type="number"
                    slotProps={{ htmlInput: { min: 1, step: 1 } }}
                    label={t('gameCatalog.modifiers.wizard.measurement.eventsPerActivation')}
                    disabled={disabled}
                  />
                </FieldWithHelp>
              ) : null}
            </>
          ) : null}
        </Stack>
      </FormSection>

      <FormSection title={t('gameCatalog.modifiers.wizard.payout.title')}>
        <Stack gap={2}>
          <Controller
            control={control}
            name="payoutKind"
            render={({ field, fieldState }) => (
              <FieldGroup
                component="fieldset"
                error={fieldState.invalid}
                fullWidth
                label={<>{t('gameCatalog.modifiers.wizard.payout.question')}</>}
                helperText={fieldState.error?.message}
              >
                <ChoiceGroup
                  value={field.value ?? ''}
                  onChange={(_, value) => {
                    if (field.value !== value) {
                      setValue('payoutValue', '', { shouldDirty: true })
                    }
                    field.onChange(value)
                  }}
                  sx={{
                    mt: 0.75,
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                    gap: 0.75,
                  }}
                >
                  {cards(modifierPayoutKinds, field.value, (value, part) =>
                    t(`gameCatalog.modifiers.wizard.payout.kinds.${value}.${part}`),
                  )}
                </ChoiceGroup>
              </FieldGroup>
            )}
          />

          {payoutKind ? (
            <FieldWithHelp
              helpAlign="center"
              label={t(`gameCatalog.modifiers.wizard.payout.values.${payoutKind}`)}
              help={t(`gameCatalog.modifiers.wizard.payout.valueHints.${payoutKind}`)}
            >
              <ControlledFormTextField
                control={control}
                name="payoutValue"
                type="number"
                label={t(`gameCatalog.modifiers.wizard.payout.values.${payoutKind}`)}
                disabled={disabled}
                slotProps={{
                  htmlInput: {
                    step: payoutKind === 'cardPercent' ? 'any' : 1,
                    min:
                      payoutKind === 'bonusKills' || payoutKind === 'killValueIncrease'
                        ? 1
                        : undefined,
                  },
                  input: {
                    endAdornment:
                      payoutKind === 'cardPercent' ? (
                        <FieldAdornment position="end">%</FieldAdornment>
                      ) : undefined,
                  },
                }}
              />
            </FieldWithHelp>
          ) : null}
          {payoutKind === 'killValueIncrease' ? (
            <FieldWithHelp
              helpAlign="center"
              label={t('gameCatalog.modifiers.wizard.payout.zeroCountPenalty')}
              help={t('gameCatalog.modifiers.wizard.payout.zeroCountPenaltyHint')}
            >
              <ControlledFormTextField
                control={control}
                name="zeroCountPenaltyPoints"
                type="number"
                slotProps={{ htmlInput: { min: 0, step: 1 } }}
                label={t('gameCatalog.modifiers.wizard.payout.zeroCountPenalty')}
                disabled={disabled}
              />
            </FieldWithHelp>
          ) : null}
        </Stack>
      </FormSection>
    </Stack>
  )
}
