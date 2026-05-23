import { Button, MenuItem, Stack, TextField } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { PlannedFeatureFormShell } from '../../../shared/ui/PlannedFeatureFormShell.tsx'
import { PlannedFeatureRoadmap } from '../../../shared/ui/PlannedFeatureRoadmap.tsx'
import { teamRegistrationsPlannedRoadmap } from '../team-registrations-planned-features.ts'

export function TeamRegistrationsInvitePlannedSection() {
  const { t } = useTranslation()

  return (
    <Stack spacing={2} sx={{ mb: 3 }}>
      <PlannedFeatureFormShell
        titleKey="plannedFeatures.teamRegistrations.form.inviteTitle"
        descriptionKey="plannedFeatures.teamRegistrations.form.inviteDescription"
      >
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              select
              label={t('plannedFeatures.teamRegistrations.form.slot')}
              size="small"
              disabled
              defaultValue={1}
              fullWidth
            >
              <MenuItem value={1}>1</MenuItem>
              <MenuItem value={2}>2</MenuItem>
            </TextField>
            <TextField
              select
              label={t('plannedFeatures.teamRegistrations.form.player')}
              size="small"
              disabled
              fullWidth
            />
          </Stack>
          <TextField
            select
            label={t('plannedFeatures.teamRegistrations.form.targetTeam')}
            size="small"
            disabled
            fullWidth
          />
          <Button variant="contained" disabled>
            {t('plannedFeatures.teamRegistrations.form.sendInvite')}
          </Button>
        </Stack>
      </PlannedFeatureFormShell>
      <PlannedFeatureRoadmap items={teamRegistrationsPlannedRoadmap} />
    </Stack>
  )
}
