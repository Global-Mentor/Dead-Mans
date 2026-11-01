import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { Stack, Typography } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameRegistrationAdminSnapshot } from '../../../shared/api/contracts/index.ts'
import {
  AppButton,
  AppDialog,
  DetailBlock,
  FormSwitch,
  ControlledFormTextField,
  InlineNotice,
} from '../../../shared/ui/index.ts'
import {
  createTeamLimitFormSchema,
  type TeamLimitFormValues,
} from '../model/team-limit-form-schema.ts'
import { getGameRegistrationMutationErrorMessage } from '../api/game-registration-mutation-errors.ts'

export function AdminTeamLimitControl({
  snapshot,
  isSaving,
  onSave,
}: {
  snapshot: GameRegistrationAdminSnapshot
  isSaving: boolean
  onSave: (limit: number | null, onSuccess: () => void, onError: (error: Error) => void) => void
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { isValid },
  } = useForm<TeamLimitFormValues>({
    defaultValues: { unlimited: false, value: '10' },
    resolver: zodResolver(createTeamLimitFormSchema(t('teamRegistrations.teamLimit.invalid'))),
    mode: 'onChange',
  })
  const unlimited = useWatch({ control, name: 'unlimited' })
  const [error, setError] = useState<string | null>(null)
  const close = () => {
    if (!isSaving) setOpen(false)
  }
  const count = snapshot.teams.filter(
    (team) => team.status === 'forming' || team.status === 'confirmed',
  ).length
  return (
    <>
      <DetailBlock role="region" aria-label={t('teamRegistrations.teamLimit.label')}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          gap={1}
          alignItems={{ sm: 'center' }}
          justifyContent="space-between"
        >
          <Stack gap={0.5}>
            <Typography variant="subtitle2" component="p">
              {t('teamRegistrations.teamLimit.label')}:{' '}
              {snapshot.teamLimit ?? t('teamRegistrations.teamLimit.unlimited')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('teamRegistrations.teamLimit.count', { count })}
            </Typography>
          </Stack>
          <AppButton
            tone="secondary"
            onClick={() => {
              reset({
                value: String(snapshot.teamLimit ?? 10),
                unlimited: snapshot.teamLimit === null,
              })
              setError(null)
              setOpen(true)
            }}
          >
            {t('teamRegistrations.teamLimit.change')}
          </AppButton>
        </Stack>
      </DetailBlock>
      <AppDialog
        open={open}
        onClose={close}
        title={t('teamRegistrations.teamLimit.change')}
        description={t('teamRegistrations.teamLimit.hint')}
        actions={
          <>
            <AppButton tone="secondary" disabled={isSaving} onClick={close}>
              {t('common.actions.cancel')}
            </AppButton>
            <AppButton
              disabled={!isValid || isSaving}
              onClick={handleSubmit(({ unlimited, value }) => {
                if (isSaving) return
                setError(null)
                onSave(
                  unlimited ? null : Number(value),
                  () => setOpen(false),
                  (failure) => setError(getGameRegistrationMutationErrorMessage(failure, t)),
                )
              })}
            >
              {t('common.actions.save')}
            </AppButton>
          </>
        }
      >
        <Stack gap={2}>
          <Stack direction="row" alignItems="center" gap={1} component="label">
            <FormSwitch
              checked={unlimited}
              disabled={isSaving}
              onChange={(_, checked) => setValue('unlimited', checked, { shouldValidate: true })}
            />
            <Typography>{t('teamRegistrations.teamLimit.unlimited')}</Typography>
          </Stack>
          <ControlledFormTextField
            control={control}
            name="value"
            label={t('teamRegistrations.teamLimit.label')}
            disabled={unlimited || isSaving}
            slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '[0-9]*' } }}
            fullWidth
          />
          {error ? <InlineNotice severity="error">{error}</InlineNotice> : null}
        </Stack>
      </AppDialog>
    </>
  )
}
