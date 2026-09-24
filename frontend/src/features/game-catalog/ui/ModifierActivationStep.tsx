import { Box, Stack, Typography } from '@mui/material'
import type { Control, UseFormSetValue } from 'react-hook-form'
import { Controller, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { DefaultTranslation } from '../../../locales/index.ts'
import type { GameModifierDefinition } from '../../../shared/api/contracts/index.ts'
import {
  AppAccordion,
  AppAccordionDetails,
  AppAccordionSummary,
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
      <FormSection
        title={t('gameCatalog.modifiers.wizard.sections.behavior')}
        description={t('gameCatalog.modifiers.wizard.sections.behaviorDescription')}
      >
        <FieldWithHelp label={t('gameCatalog.modifiers.wizard.phase')} help={help('phase')}>
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
                <ChoiceGroup {...field} sx={{ mt: 0.75, gap: 0.75 }}>
                  {modifierPhases.map((phase) => (
                    <ChoiceCard
                      key={phase}
                      value={phase}
                      selected={field.value === phase}
                      disabled={disabled}
                      title={t(`gameCatalog.modifiers.wizard.phases.${phase}`)}
                      description={t(`gameCatalog.modifiers.wizard.phaseDescriptions.${phase}`)}
                    />
                  ))}
                </ChoiceGroup>
              </FieldGroup>
            )}
          />
        </FieldWithHelp>
        <FieldWithHelp label={t('gameCatalog.modifiers.wizard.performer')} help={help('performer')}>
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
                <ChoiceGroup
                  {...field}
                  sx={{
                    mt: 0.75,
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                    gap: 0.75,
                  }}
                >
                  {(['activeTeam', 'mentor'] as const).map((performer) => (
                    <ChoiceCard
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
              </FieldGroup>
            )}
          />
        </FieldWithHelp>
        <FieldWithHelp label={t('gameCatalog.modifiers.wizard.rule')} help={help('rule')}>
          <ControlledFormTextField
            control={control}
            name="rule"
            label={t('gameCatalog.modifiers.wizard.rule')}
            multiline
            minRows={3}
            disabled={disabled}
          />
        </FieldWithHelp>
        <FieldWithHelp
          label={t('gameCatalog.modifiers.wizard.requiresHostMonitoring')}
          help={help('requiresHostMonitoring')}
        >
          <Controller
            control={control}
            name="requiresHostMonitoring"
            render={({ field }) => (
              <FieldGroup
                component="fieldset"
                fullWidth
                label={<>{t('gameCatalog.modifiers.wizard.requiresHostMonitoring')}</>}
              >
                <ChoiceGroup
                  value={field.value ? 'yes' : 'no'}
                  onChange={(_, value) => field.onChange(value === 'yes')}
                  sx={{
                    mt: 0.75,
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                    gap: 0.75,
                  }}
                >
                  {(['yes', 'no'] as const).map((answer) => (
                    <ChoiceCard
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
              </FieldGroup>
            )}
          />
        </FieldWithHelp>
        {kind === 'rule' ? (
          <>
            <FieldWithHelp
              label={t('gameCatalog.modifiers.wizard.durationQuestion')}
              help={help('durationSeconds')}
            >
              <Controller
                control={control}
                name="durationEnabled"
                render={({ field }) => (
                  <FieldGroup
                    component="fieldset"
                    fullWidth
                    label={<>{t('gameCatalog.modifiers.wizard.durationQuestion')}</>}
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
                        mt: 0.75,
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                        gap: 0.75,
                      }}
                    >
                      {(['yes', 'no'] as const).map((answer) => (
                        <ChoiceCard
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
                  </FieldGroup>
                )}
              />
            </FieldWithHelp>
            {durationEnabled ? (
              <FieldWithHelp
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
      </FormSection>

      <FormSection
        title={t('gameCatalog.modifiers.wizard.sections.activation')}
        description={t('gameCatalog.modifiers.wizard.sections.activationDescription')}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <FieldWithHelp
            label={t('gameCatalog.modifiers.fields.activationCost')}
            help={help('activationCost')}
          >
            <ControlledFormTextField
              control={control}
              name="activationCost"
              type="number"
              label={t('gameCatalog.modifiers.fields.activationCost')}
              disabled={disabled}
            />
          </FieldWithHelp>
          <FieldWithHelp
            label={t('gameCatalog.modifiers.fields.activationLimitCount')}
            help={help('activationLimitCount')}
          >
            <ControlledFormTextField
              control={control}
              name="activationLimitCount"
              type="number"
              label={t('gameCatalog.modifiers.fields.activationLimitCount')}
              helperText={t('gameCatalog.modifiers.fields.limitHint')}
              disabled={disabled}
            />
          </FieldWithHelp>
        </Stack>
        <FieldWithHelp label={t('gameCatalog.modifiers.fields.conflicts')} help={help('conflicts')}>
          <ModifierConflictField
            control={control}
            currentModifierId={initial?.id}
            disabled={disabled}
            modifiers={modifiers}
          />
        </FieldWithHelp>
        <AppAccordion surface="inset">
          <AppAccordionSummary>
            <Box>
              <Typography variant="subtitle2">
                {t('gameCatalog.modifiers.wizard.advancedSettings')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('gameCatalog.modifiers.wizard.advancedSettingsDescription')}
              </Typography>
            </Box>
          </AppAccordionSummary>
          <AppAccordionDetails>
            <FieldWithHelp
              label={t('gameCatalog.modifiers.fields.activationCommand')}
              help={help('activationCommand')}
            >
              <ControlledFormTextField
                control={control}
                name="activationCommand"
                label={t('gameCatalog.modifiers.fields.activationCommand')}
                helperText={t('gameCatalog.modifiers.wizard.commandHint')}
                disabled={disabled}
              />
            </FieldWithHelp>
          </AppAccordionDetails>
        </AppAccordion>
      </FormSection>
    </Stack>
  )
}
