import { Stack } from '@mui/material'
import type { Control, UseFormSetValue } from 'react-hook-form'
import { Controller, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { DefaultTranslation } from '../../../locales/index.ts'
import type { GameModifierDefinition } from '../../../shared/api/contracts/index.ts'
import {
  ChoiceCard,
  ChoiceGroup,
  ControlledFormTextField,
  FieldAdornment,
  FieldGroup,
  FieldWithHelp,
  FormSection,
} from '../../../shared/ui/index.ts'
import { modifierPhases, type ModifierFormValues } from '../model/modifier-form-schema.ts'
import { ModifierConflictField } from './modifier-form-fields.tsx'

export function ModifierActivationStep({
  control,
  disabled,
  initial,
  kind,
  modifiers,
  setValue,
}: {
  control: Control<ModifierFormValues>
  disabled: boolean
  initial?: GameModifierDefinition | undefined
  kind: ModifierFormValues['kind']
  modifiers: GameModifierDefinition[]
  setValue: UseFormSetValue<ModifierFormValues>
}) {
  const { t } = useTranslation()
  const help = (field: keyof DefaultTranslation['gameCatalog']['modifiers']['wizard']['help']) =>
    t(`gameCatalog.modifiers.wizard.help.${field}`)
  const durationEnabled = useWatch({ control, name: 'durationEnabled' })
  return (
    <Stack spacing={1.5}>
      <FormSection title={t('gameCatalog.modifiers.wizard.sections.behavior')}>
        <Stack gap={2}>
          <Controller
            control={control}
            name="phase"
            render={({ field, fieldState }) => (
              <FieldGroup
                component="fieldset"
                error={fieldState.invalid}
                fullWidth
                label={<>{t('gameCatalog.modifiers.wizard.phase')}</>}
                helperText={fieldState.error?.message}
              >
                <Stack sx={{ mt: 0.75 }}>
                  <FieldWithHelp
                    helpAlign="center"
                    label={t('gameCatalog.modifiers.wizard.phase')}
                    help={help('phase')}
                  >
                    <ChoiceGroup
                      {...field}
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
                        gap: 0.75,
                      }}
                    >
                      {modifierPhases.map((phase) => (
                        <ChoiceCard
                          density="compact"
                          textAlign="center"
                          descriptionPlacement="tooltip"
                          key={phase}
                          value={phase}
                          selected={field.value === phase}
                          disabled={disabled}
                          title={t(`gameCatalog.modifiers.wizard.phases.${phase}`)}
                          description={t(`gameCatalog.modifiers.wizard.phaseDescriptions.${phase}`)}
                        />
                      ))}
                    </ChoiceGroup>
                  </FieldWithHelp>
                </Stack>
              </FieldGroup>
            )}
          />
          <Controller
            control={control}
            name="performer"
            render={({ field, fieldState }) => (
              <FieldGroup
                component="fieldset"
                error={fieldState.invalid}
                fullWidth
                label={<>{t('gameCatalog.modifiers.wizard.performer')}</>}
                helperText={fieldState.error?.message}
              >
                <Stack sx={{ mt: 0.75 }}>
                  <FieldWithHelp
                    helpAlign="center"
                    label={t('gameCatalog.modifiers.wizard.performer')}
                    help={help('performer')}
                  >
                    <ChoiceGroup
                      {...field}
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                        gap: 0.75,
                      }}
                    >
                      {(['activeTeam', 'mentor'] as const).map((performer) => (
                        <ChoiceCard
                          density="compact"
                          textAlign="center"
                          descriptionPlacement="tooltip"
                          key={performer}
                          value={performer}
                          selected={field.value === performer}
                          disabled={disabled}
                          title={t(`gameCatalog.modifiers.wizard.performers.${performer}`)}
                          description={t(
                            `gameCatalog.modifiers.wizard.performerDescriptions.${performer}`,
                          )}
                        />
                      ))}
                    </ChoiceGroup>
                  </FieldWithHelp>
                </Stack>
              </FieldGroup>
            )}
          />
          <Controller
            control={control}
            name="requiresHostMonitoring"
            render={({ field }) => (
              <FieldGroup
                component="fieldset"
                fullWidth
                label={<>{t('gameCatalog.modifiers.wizard.requiresHostMonitoring')}</>}
              >
                <Stack sx={{ mt: 0.75 }}>
                  <FieldWithHelp
                    helpAlign="center"
                    label={t('gameCatalog.modifiers.wizard.requiresHostMonitoring')}
                    help={help('requiresHostMonitoring')}
                  >
                    <ChoiceGroup
                      value={field.value ? 'yes' : 'no'}
                      onChange={(_, value) => field.onChange(value === 'yes')}
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                        gap: 0.75,
                      }}
                    >
                      {(['yes', 'no'] as const).map((answer) => (
                        <ChoiceCard
                          density="compact"
                          textAlign="center"
                          descriptionPlacement="tooltip"
                          key={answer}
                          value={answer}
                          selected={field.value === (answer === 'yes')}
                          disabled={disabled}
                          title={t(`gameCatalog.modifiers.wizard.monitoringAnswers.${answer}`)}
                          description={t(
                            `gameCatalog.modifiers.wizard.monitoringDescriptions.${answer}`,
                          )}
                        />
                      ))}
                    </ChoiceGroup>
                  </FieldWithHelp>
                </Stack>
              </FieldGroup>
            )}
          />
          {kind === 'rule' ? (
            <>
              <Controller
                control={control}
                name="durationEnabled"
                render={({ field }) => (
                  <FieldGroup
                    component="fieldset"
                    fullWidth
                    label={<>{t('gameCatalog.modifiers.wizard.durationQuestion')}</>}
                  >
                    <Stack sx={{ mt: 0.75 }}>
                      <FieldWithHelp
                        helpAlign="center"
                        label={t('gameCatalog.modifiers.wizard.durationQuestion')}
                        help={help('durationSeconds')}
                      >
                        <ChoiceGroup
                          value={field.value ? 'yes' : 'no'}
                          onChange={(_, value) => {
                            const enabled = value === 'yes'
                            field.onChange(enabled)
                            if (!enabled) {
                              setValue('durationSeconds', '', { shouldDirty: true })
                            }
                          }}
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                            gap: 0.75,
                          }}
                        >
                          {(['yes', 'no'] as const).map((answer) => (
                            <ChoiceCard
                              density="compact"
                              textAlign="center"
                              descriptionPlacement="tooltip"
                              key={answer}
                              value={answer}
                              selected={field.value === (answer === 'yes')}
                              disabled={disabled}
                              title={t(`gameCatalog.modifiers.wizard.durationAnswers.${answer}`)}
                              description={t(
                                `gameCatalog.modifiers.wizard.durationDescriptions.${answer}`,
                              )}
                            />
                          ))}
                        </ChoiceGroup>
                      </FieldWithHelp>
                    </Stack>
                  </FieldGroup>
                )}
              />
              {durationEnabled ? (
                <FieldWithHelp
                  helpAlign="center"
                  label={t('gameCatalog.modifiers.fields.durationSeconds')}
                  help={help('durationSeconds')}
                >
                  <ControlledFormTextField
                    control={control}
                    name="durationSeconds"
                    type="number"
                    label={t('gameCatalog.modifiers.fields.durationSeconds')}
                    disabled={disabled}
                    slotProps={{
                      htmlInput: { min: 1, step: 1 },
                      input: {
                        endAdornment: (
                          <FieldAdornment position="end">
                            {t('gameCatalog.modifiers.wizard.units.seconds')}
                          </FieldAdornment>
                        ),
                      },
                    }}
                  />
                </FieldWithHelp>
              ) : null}
            </>
          ) : null}
        </Stack>
      </FormSection>

      <FormSection title={t('gameCatalog.modifiers.wizard.sections.activation')}>
        <Stack gap={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <FieldWithHelp
              helpAlign="center"
              label={t('gameCatalog.modifiers.fields.activationCost')}
              help={help('activationCost')}
            >
              <ControlledFormTextField
                control={control}
                name="activationCost"
                type="number"
                label={t('gameCatalog.modifiers.fields.activationCost')}
                disabled={disabled}
                slotProps={{ htmlInput: { min: 0, step: 1 } }}
              />
            </FieldWithHelp>
            <FieldWithHelp
              helpAlign="center"
              label={t('gameCatalog.modifiers.fields.activationLimitCount')}
              help={help('activationLimitCount')}
            >
              <ControlledFormTextField
                control={control}
                name="activationLimitCount"
                type="number"
                label={t('gameCatalog.modifiers.fields.activationLimitCount')}
                disabled={disabled}
                slotProps={{ htmlInput: { min: 1, step: 1 } }}
              />
            </FieldWithHelp>
          </Stack>
          <FieldWithHelp
            helpAlign="center"
            label={t('gameCatalog.modifiers.fields.conflicts')}
            help={help('conflicts')}
          >
            <ModifierConflictField
              control={control}
              currentModifierId={initial?.id}
              initialConflictingModifierIds={initial?.conflictingModifierIds ?? []}
              disabled={disabled}
              modifiers={modifiers}
            />
          </FieldWithHelp>
        </Stack>
      </FormSection>
    </Stack>
  )
}
