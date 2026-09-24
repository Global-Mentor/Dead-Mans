import { Box } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { GameModifierAvailability } from '../../../shared/api/contracts/index.ts'
import { AppButton, HelpTooltip, StatusBadge } from '../../../shared/ui/index.ts'
interface ModifierActivationControlProps {
  availability: GameModifierAvailability
  isBusy: boolean
  isPending: boolean
  blockedReasonLabel: string
  blockedReasonTooltip: string
  onActivate: (modifierId: string) => void
}

export function ModifierActivationControl({
  availability,
  isBusy,
  isPending,
  blockedReasonLabel,
  blockedReasonTooltip,
  onActivate,
}: ModifierActivationControlProps) {
  const { t } = useTranslation()
  const reason = availability.blockedReason
  return (
    <Box sx={{ width: { xs: '100%', sm: 168 }, flexShrink: 0 }}>
      {availability.canActivate ? (
        <AppButton
          tone="primary"
          fullWidth
          disabled={isBusy}
          aria-busy={isPending}
          onClick={() => onActivate(availability.modifier.id)}
        >
          {isPending ? t('gameModifiers.activatePending') : t('gameModifiers.activateAction')}
        </AppButton>
      ) : (
        <HelpTooltip
          title={blockedReasonTooltip}
          arrow
          describeChild
          enterDelay={150}
          enterTouchDelay={0}
        >
          <Box component="span" tabIndex={0} sx={{ display: 'block', width: '100%' }}>
            {reason === 'ordering_closed' ? (
              <AppButton tone="primary" fullWidth disabled>
                {blockedReasonLabel}
              </AppButton>
            ) : (
              <StatusBadge
                role="status"
                aria-label={blockedReasonTooltip}
                label={blockedReasonLabel}
                color={
                  reason === 'limit_reached' || reason === 'active_team_member'
                    ? 'error'
                    : reason === 'insufficient_points'
                      ? 'warning'
                      : 'info'
                }
              />
            )}
          </Box>
        </HelpTooltip>
      )}
    </Box>
  )
}
