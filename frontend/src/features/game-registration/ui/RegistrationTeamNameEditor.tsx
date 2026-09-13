import { Stack, type SxProps, type Theme } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppButton, FormTextField } from '../../../shared/ui/index.ts'
import {
  normalizeTeamNameInput,
  TEAM_NAME_MAX_LENGTH,
  TEAM_NAME_MIN_LENGTH,
} from '../model/team-name.ts'
import { isTeamNameTaken } from '../model/team-name.ts'

interface RegistrationTeamNameEditorProps {
  value: string | null | undefined
  canEdit: boolean
  isSaving: boolean
  onSave: (name?: string) => void
  buttonSx?: SxProps<Theme>
  required?: boolean
  autoFocus?: boolean
  existingNames?: (string | null | undefined)[]
}

export function RegistrationTeamNameEditor({
  value,
  canEdit,
  isSaving,
  onSave,
  buttonSx,
  required = false,
  autoFocus = false,
  existingNames = [],
}: RegistrationTeamNameEditorProps) {
  const { t } = useTranslation()
  const sourceName = value ?? ''
  const [draft, setDraft] = useState(() => ({ sourceName, name: sourceName }))
  const [showHint, setShowHint] = useState(false)
  const name = draft.sourceName === sourceName ? draft.name : sourceName
  const normalizedName = normalizeTeamNameInput(name) ?? ''
  const currentName = normalizeTeamNameInput(sourceName) ?? ''
  const isChanged = normalizedName !== currentName
  const nameError =
    required && !normalizedName
      ? 'gameApplication.teamNameRequired'
      : normalizedName.length > 0 && normalizedName.length < TEAM_NAME_MIN_LENGTH
        ? 'gameApplication.teamNameTooShort'
        : isTeamNameTaken(name, existingNames)
          ? 'gameApplication.teamNameTaken'
          : null

  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={1}
      alignItems={{ xs: 'stretch', md: 'flex-start' }}
    >
      <FormTextField
        fullWidth
        autoFocus={autoFocus}
        required={required}
        error={nameError !== null}
        size="small"
        label={t('gameApplication.teamNameField')}
        placeholder={t('gameApplication.teamNamePlaceholder')}
        value={name}
        disabled={!canEdit || isSaving}
        slotProps={{
          htmlInput: { minLength: TEAM_NAME_MIN_LENGTH, maxLength: TEAM_NAME_MAX_LENGTH },
        }}
        validationHint={showHint && nameError ? t(nameError) : null}
        onValidationHintClose={() => setShowHint(false)}
        onBlur={() => setShowHint(false)}
        onChange={(event) => {
          setDraft({ sourceName, name: event.target.value })
          setShowHint(true)
        }}
        helperText={
          nameError
            ? t(nameError)
            : canEdit
              ? t('gameApplication.teamNameEditableHelper')
              : t('gameApplication.teamNameLockedHelper')
        }
      />
      <AppButton
        size="small"
        disabled={!canEdit || !isChanged || isSaving || nameError !== null}
        onClick={() => {
          if (!nameError) onSave(normalizeTeamNameInput(name))
        }}
        {...(buttonSx ? { sx: buttonSx } : {})}
      >
        {t('common.actions.save')}
      </AppButton>
    </Stack>
  )
}
