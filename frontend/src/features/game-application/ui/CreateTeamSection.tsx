import { FormControl, FormLabel, RadioGroup, Stack, Typography } from '@mui/material'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppButton, ChoiceCard, FormTextField, SectionCard } from '../../../shared/ui/index.ts'
import { normalizeTeamNameInput, TEAM_NAME_MAX_LENGTH } from '../../game-registration/index.ts'
import { ApplicationSection } from './ApplicationSection.tsx'

interface CreateTeamSectionProps {
  onCreate: (recruitmentOpen: boolean, name?: string) => void
  isCreating: boolean
  disabled?: boolean
  hasAvailableSlot?: boolean
}

export function CreateTeamSection({
  onCreate,
  isCreating,
  disabled = false,
  hasAvailableSlot = true,
}: CreateTeamSectionProps) {
  const { t } = useTranslation()
  const formatLabelId = useId()
  const nameId = useId()
  const [teamName, setTeamName] = useState('')
  const [format, setFormat] = useState('open')
  const isDisabled = disabled || isCreating || !hasAvailableSlot

  return (
    <ApplicationSection
      title={t('gameApplication.createTeamTitle')}
      description={t('gameApplication.createTeamHelper')}
    >
      <SectionCard sx={{ p: 2, borderColor: 'divider' }}>
        <Stack
          component="form"
          spacing={1.75}
          onSubmit={(event) => {
            event.preventDefault()
            if (!isDisabled) onCreate(format === 'open', normalizeTeamNameInput(teamName))
          }}
        >
          <FormTextField
            id={nameId}
            label={t('gameApplication.teamNameField')}
            placeholder={t('gameApplication.teamNamePlaceholder')}
            value={teamName}
            disabled={isDisabled}
            helperText={t('gameApplication.teamNameOptional')}
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: { maxLength: TEAM_NAME_MAX_LENGTH },
              formHelperText: { sx: { mx: 0 } },
            }}
            onChange={(event) => setTeamName(event.target.value)}
          />
          <FormControl disabled={isDisabled}>
            <FormLabel id={formatLabelId} sx={{ typography: 'overline', mb: 1.25 }}>
              {t('gameApplication.createTeamChip')}
            </FormLabel>
            <RadioGroup
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
            </RadioGroup>
          </FormControl>
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
      </SectionCard>
    </ApplicationSection>
  )
}
