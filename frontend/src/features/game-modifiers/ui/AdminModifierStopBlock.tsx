import { Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { ModifierSelectOption } from '../model/admin-modifier-support.ts'
import { AppButton, FormTextField, InlineNotice } from '../../../shared/ui/index.ts'
import { AdminModifierBlock } from './admin-modifier-panel-primitives.tsx'
import { AdminModifierSelect } from './AdminModifierSelect.tsx'
export function AdminModifierStopBlock({
  modifiers,
  selectedId,
  reason,
  disabled,
  stopped,
  loading,
  error,
  pending,
  onChange,
  onReasonChange,
  onStop,
}: {
  modifiers: readonly ModifierSelectOption[]
  selectedId: string
  reason: string
  disabled: boolean
  stopped: boolean
  loading: boolean
  error: boolean
  pending: boolean
  onChange: (id: string) => void
  onReasonChange: (reason: string) => void
  onStop: () => void
}) {
  const { t } = useTranslation()
  return (
    <AdminModifierBlock
      sectionId="stop"
      defaultExpanded={false}
      icon="stop"
      title={t('gameModifiers.adminPanel.stopTitle')}
    >
      {loading ? (
        <Typography variant="body2" color="text.secondary">
          {t('gameModifiers.adminPanel.stateLoading')}
        </Typography>
      ) : error ? (
        <Typography variant="body2" color="error.main">
          {t('gameModifiers.adminPanel.stateError')}
        </Typography>
      ) : modifiers.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {t('gameModifiers.adminPanel.noAvailableModifiers')}
        </Typography>
      ) : (
        <Stack spacing={1}>
          <AdminModifierSelect
            modifiers={modifiers}
            value={selectedId}
            onChange={onChange}
            label={t('gameModifiers.adminPanel.activateModifierLabel')}
            disabled={disabled}
          />
          <FormTextField
            label={t('gameModifiers.adminPanel.emergencyDisableReasonLabel')}
            value={reason}
            onChange={(event) => onReasonChange(event.target.value)}
            disabled={disabled || !selectedId || stopped}
            required
            inputProps={{ maxLength: 1000 }}
          />
          {stopped ? (
            <InlineNotice severity="warning">
              {t('gameModifiers.adminPanel.emergencyDisabledNotice')}
            </InlineNotice>
          ) : null}
          <AppButton
            tone="dangerSecondary"
            fullWidth
            size="small"
            disabled={disabled || !selectedId || stopped || reason.trim().length === 0}
            loading={pending}
            onClick={onStop}
          >
            {t('gameModifiers.adminPanel.emergencyDisableAction')}
          </AppButton>
        </Stack>
      )}
    </AdminModifierBlock>
  )
}
