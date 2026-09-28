import { Stack, Typography } from '@mui/material'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { AppButton, FormSection } from '../../../shared/ui/index.ts'
import {
  gameRoundPostRoundActions,
  type GameRoundSummaryFormInput,
  type GameRoundSummaryFormValues,
} from '../model/game-round-summary-form.ts'

export function GameRoundPostRoundSection({
  control,
}: {
  control: ReturnType<
    typeof useForm<GameRoundSummaryFormInput, unknown, GameRoundSummaryFormValues>
  >['control']
}) {
  const { t } = useTranslation()

  return (
    <FormSection
      title={t('gameBoard.roundSummaryPostRoundTitle')}
      description={t('gameBoard.roundSummaryPostRoundDescription')}
    >
      <Stack spacing={1.25}>
        <Controller
          control={control}
          name="postRoundAction"
          render={({ field }) => (
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
              {gameRoundPostRoundActions.map((action) => (
                <AppButton
                  key={action}
                  type="button"
                  tone={field.value === action ? 'primary' : 'secondary'}
                  fullWidth
                  onClick={() => field.onChange(action)}
                  sx={{ justifyContent: 'flex-start' }}
                >
                  <Stack alignItems="flex-start" spacing={0.35}>
                    <Typography variant="subtitle2" fontWeight={800}>
                      {t(`gameBoard.roundSummaryPostRoundOption.${action}.title`)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" textAlign="left">
                      {t(`gameBoard.roundSummaryPostRoundOption.${action}.description`)}
                    </Typography>
                  </Stack>
                </AppButton>
              ))}
            </Stack>
          )}
        />
      </Stack>
    </FormSection>
  )
}
