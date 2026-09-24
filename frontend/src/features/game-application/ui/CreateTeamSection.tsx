import { Stack, Typography } from '@mui/material'
import { useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AppButton,
  ChoiceCard,
  ChoiceGroup,
  FieldGroup,
  FormSection,
  FormTextField,
} from '../../../shared/ui/index.ts'
import {
  normalizeTeamNameInput,
  TEAM_NAME_MAX_LENGTH,
  TEAM_NAME_MIN_LENGTH,
} from '../../game-registration/index.ts'
import { isTeamNameTaken } from '../../game-registration/model/team-name.ts'

interface CreateTeamSectionProps {
  onCreate: (recruitmentOpen: boolean, name: string) => void
  existingNames?: (string | null | undefined)[]
  isCreating: boolean
  disabled?: boolean
  hasAvailableSlot?: boolean
}

export function CreateTeamSection({
  onCreate,
  isCreating,
  disabled = false,
  hasAvailableSlot = true,
  existingNames = [],
}: CreateTeamSectionProps) {
  const { t } = useTranslation()
  const formatLabelId = useId()
  const nameId = useId()
  const [teamName, setTeamName] = useState('')
  const [format, setFormat] = useState('open')
  const [nameTouched, setNameTouched] = useState(false)
  const [showNameHint, setShowNameHint] = useState(false)
  const nameInput = useRef<HTMLInputElement>(null)
  const normalizedName = normalizeTeamNameInput(teamName)
  const nameError = !normalizedName
    ? 'gameApplication.teamNameRequired'
    : normalizedName.length < TEAM_NAME_MIN_LENGTH
      ? 'gameApplication.teamNameTooShort'
      : normalizedName.length > TEAM_NAME_MAX_LENGTH
        ? 'gameApplication.teamNameTooLong'
        : isTeamNameTaken(teamName, existingNames)
          ? 'gameApplication.teamNameTaken'
          : null
  const isDisabled = disabled || isCreating || !hasAvailableSlot

  return (
    <FormSection title={t('gameApplication.createTeamTitle')}>
      <Stack
        component="form"
        noValidate
        spacing={1.75}
        onSubmit={(event) => {
          event.preventDefault()
          setNameTouched(true)
          if (!isDisabled && nameError) {
            nameInput.current?.focus()
            setShowNameHint(true)
            return
          }
          if (!isDisabled && !nameError && normalizedName)
            onCreate(format === 'open', normalizedName)
        }}
      >
        <FormTextField
          id={nameId}
          required
          inputRef={nameInput}
          label={t('gameApplication.teamNameField')}
          placeholder={t('gameApplication.teamNamePlaceholder')}
          value={teamName}
          disabled={isDisabled}
          error={nameTouched && nameError !== null}
          helperText={
            nameTouched && nameError ? t(nameError) : t('gameApplication.teamNameRequiredHelper')
          }
          validationHint={showNameHint && nameError ? t(nameError) : null}
          onValidationHintClose={() => setShowNameHint(false)}
          onBlur={() => {
            setNameTouched(true)
            setShowNameHint(false)
          }}
          slotProps={{
            inputLabel: { shrink: true },
            htmlInput: { minLength: TEAM_NAME_MIN_LENGTH, maxLength: TEAM_NAME_MAX_LENGTH },
            formHelperText: { sx: { mx: 0 } },
          }}
          onChange={(event) => {
            setTeamName(event.target.value)
            setShowNameHint(false)
          }}
        />
        <FieldGroup
          disabled={isDisabled}
          label={<>{t('gameApplication.createTeamChip')}</>}
          labelId={formatLabelId}
          labelAppearance="overline"
        >
          <ChoiceGroup
            aria-labelledby={formatLabelId}
            value={format}
            onChange={(_, value) => setFormat(value)}
            sx={{ gap: 1 }}
          >
            <ChoiceCard
              density="compact"
              value="open"
              selected={format === 'open'}
              title={t('gameApplication.createOpenTeam')}
              description={t('gameApplication.createOpenTeamDescription')}
            />
            <ChoiceCard
              density="compact"
              value="private"
              selected={format === 'private'}
              title={t('gameApplication.createClosedTeam')}
              description={t('gameApplication.createClosedTeamDescription')}
            />
          </ChoiceGroup>
        </FieldGroup>
        <Stack spacing={1.5}>
          <AppButton
            type="submit"
            fullWidth
            loading={isCreating}
            disabled={isDisabled}
            sx={{ minHeight: 48 }}
          >
            {t('gameApplication.createTeamAction')}
          </AppButton>
          {!hasAvailableSlot ? (
            <Typography variant="caption" color="warning.main" sx={{ lineHeight: 1.6 }}>
              {t('gameApplication.noFreeSlots')}
            </Typography>
          ) : null}
        </Stack>
      </Stack>
    </FormSection>
  )
}
