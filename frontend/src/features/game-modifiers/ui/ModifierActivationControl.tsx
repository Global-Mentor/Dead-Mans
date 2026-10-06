import { Box } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { GameModifierAvailability } from '../../../shared/api/contracts/index.ts'
import { AppButton, HelpTooltip, ActionStatus } from '../../../shared/ui/index.ts'
interface ModifierActivationControlProps {
  availability: GameModifierAvailability
  isBusy: boolean
  isPending: boolean
  blockedReasonLabel: string
  blockedReasonTooltip: string
  onActivate: (modifierId: string) => void
  activationAriaLabel?: string
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
  activationAriaLabel,
}: ModifierActivationControlProps) {
  const { t } = useTranslation()
  const reason = availability.blockedReason
  const blockedContent = (
    <ActionStatus
      label={
        compact
          ? t(
              reason === 'conflict_active'
                ? 'gameModifiers.conflictStatus'
                : reason === 'limit_reached'
                  ? 'gameModifiers.blockedReasonLabels.limit_reached'
                  : 'gameModifiers.unavailableAction',
            )
          : blockedReasonLabel
      }
      description={blockedReasonTooltip}
      compact={compact}
      tone={
        reason === 'conflict_active' ? 'warning' : reason === 'limit_reached' ? 'default' : 'error'
      }
    />
  )
  return (
    <Box sx={{ width: compact ? 144 : { xs: '100%', sm: 168 }, flexShrink: 0 }}>
      {availability.canActivate ? (
        <AppButton
          tone="primary"
          fullWidth
          size={compact ? 'small' : 'medium'}
          aria-label={
            activationAriaLabel ??
            (compact
              ? t('gameModifiers.activateAction')
              : t('gameModifiers.activationLabel', { modifier: availability.modifier.name }))
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
