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
  compact?: boolean
}

export function ModifierActivationControl({
  availability,
  isBusy,
  isPending,
  blockedReasonLabel,
  blockedReasonTooltip,
  onActivate,
  compact = false,
}: ModifierActivationControlProps) {
  const { t } = useTranslation()
  const reason = availability.blockedReason
  const blockedContent =
    reason === 'ordering_closed' ? (
      <AppButton tone="primary" size={compact ? 'small' : 'medium'} fullWidth={!compact} disabled>
        {compact ? t('gameModifiers.unavailableAction') : blockedReasonLabel}
      </AppButton>
    ) : (
      <StatusBadge
        role="status"
        aria-label={blockedReasonTooltip}
        label={compact ? t('gameModifiers.unavailableAction') : blockedReasonLabel}
        density={compact ? 'compact' : 'standard'}
        color={
          reason === 'limit_reached' || reason === 'active_team_member'
            ? 'error'
            : reason === 'insufficient_points'
              ? 'warning'
              : 'info'
        }
      />
    )
  return (
    <Box sx={{ width: compact ? 'auto' : { xs: '100%', sm: 168 }, flexShrink: 0 }}>
      {availability.canActivate ? (
        <AppButton
          tone="primary"
          fullWidth={!compact}
          size={compact ? 'small' : 'medium'}
          aria-label={
            compact
              ? t('gameModifiers.activateAction')
              : t('gameModifiers.activationLabel', { modifier: availability.modifier.name })
          }
          disabled={isBusy}
          aria-busy={isPending}
          onClick={() => onActivate(availability.modifier.id)}
        >
          {isPending
            ? t('gameModifiers.activatePending')
            : t('gameModifiers.activateCompactAction')}
        </AppButton>
      ) : (
        <HelpTooltip
          title={blockedReasonTooltip}
          arrow
          describeChild
          enterDelay={150}
          enterTouchDelay={0}
        >
          <Box
            component="span"
            tabIndex={0}
            aria-label={blockedReasonTooltip}
            sx={{ display: 'block', width: compact ? 'auto' : '100%' }}
          >
            {blockedContent}
          </Box>
        </HelpTooltip>
      )}
    </Box>
  )
}
