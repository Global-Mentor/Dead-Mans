import { Stack } from '@mui/material'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppButton, FormTextField } from '../../../shared/ui/index.ts'
import {
  normalizeTeamNameInput,
  TEAM_NAME_MAX_LENGTH,
  TEAM_NAME_MIN_LENGTH,
  isTeamNameTaken,
} from '../model/team-name.ts'
interface RegistrationTeamNameEditorProps {
  value: string | null | undefined
  canEdit: boolean
  isSaving: boolean
  onSave: (name?: string) => void
  onDirtyChange?: (dirty: boolean) => void
  required?: boolean
  autoFocus?: boolean
  existingNames?: (string | null | undefined)[]
}

export function RegistrationTeamNameEditor({
  value,
  canEdit,
  isSaving,
  onSave,
  onDirtyChange,
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
  useEffect(() => {
    onDirtyChange?.(isChanged)
    return () => onDirtyChange?.(false)
  }, [isChanged, onDirtyChange])
  const nameError =
    required && !normalizedName
      ? 'gameApplication.teamNameRequired'
      : normalizedName.length > 0 && normalizedName.length < TEAM_NAME_MIN_LENGTH
        ? 'gameApplication.teamNameTooShort'
        : normalizedName.length > TEAM_NAME_MAX_LENGTH
          ? 'gameApplication.teamNameTooLong'
          : isTeamNameTaken(name, existingNames)
            ? 'gameApplication.teamNameTaken'
            : null

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1}
      alignItems={{ xs: 'stretch', sm: 'flex-start' }}
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
        framePlacement="inset"
        disabled={!canEdit || !isChanged || isSaving || nameError !== null}
        onClick={() => {
          if (!nameError) onSave(normalizeTeamNameInput(name))
        }}
        sx={{ flexShrink: 0 }}
      >
        {t('common.actions.save')}
      </AppButton>
    </Stack>
  )
}
