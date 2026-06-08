import { Stack } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { AppButton, FormSelect } from '../../../shared/ui/index.ts'
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
            <FormSelect
              label={t('plannedFeatures.teamRegistrations.form.slot')}
              disabled
              value={1}
              onChange={() => undefined}
              options={[
                { value: 1, label: '1' },
                { value: 2, label: '2' },
              ]}
            />
            <FormSelect
              label={t('plannedFeatures.teamRegistrations.form.player')}
              disabled
              value=""
              onChange={() => undefined}
              options={[{ value: '', label: t('plannedFeatures.teamRegistrations.form.player') }]}
            />
          </Stack>
          <FormSelect
            label={t('plannedFeatures.teamRegistrations.form.targetTeam')}
            disabled
            value=""
            onChange={() => undefined}
            options={[{ value: '', label: t('plannedFeatures.teamRegistrations.form.targetTeam') }]}
          />
          <AppButton disabled>
            {t('plannedFeatures.teamRegistrations.form.sendInvite')}
          </AppButton>
        </Stack>
      </PlannedFeatureFormShell>
      <PlannedFeatureRoadmap items={teamRegistrationsPlannedRoadmap} />
    </Stack>
  )
}
