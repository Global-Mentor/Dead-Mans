import { Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { RegistrationInvitation } from '../../../shared/api/contracts/index.ts'
import { AppButton, SectionCard } from '../../../shared/ui/index.ts'

interface PendingInvitationsSectionProps {
  invitations: RegistrationInvitation[]
  onAccept: (invitationId: string) => void
  onDecline: (invitationId: string) => void
  pendingAcceptId?: string
  pendingDeclineId?: string
}

export function PendingInvitationsSection({
  invitations,
  onAccept,
  onDecline,
  pendingAcceptId,
  pendingDeclineId,
}: PendingInvitationsSectionProps) {
  const { t } = useTranslation()

  if (invitations.length === 0) {
    return null
  }

  return (
    <SectionCard>
      <Typography variant="subtitle1" gutterBottom>
        {t('gameApplication.invitationsTitle')}
      </Typography>
      <Stack spacing={1}>
        {invitations.map((invitation) => (
          <Stack
            key={invitation.invitationId}
            direction="row"
            spacing={1}
            alignItems="center"
            flexWrap="wrap"
          >
            <Typography variant="body2">
              {t('gameApplication.invitationSlot', { slot: invitation.slotIndex })}
            </Typography>
            <AppButton
              size="small"
              disabled={pendingAcceptId === invitation.invitationId}
              onClick={() => onAccept(invitation.invitationId)}
            >
              {t('gameApplication.acceptInvitation')}
            </AppButton>
            <AppButton
              size="small"
              tone="ghost"
              disabled={pendingDeclineId === invitation.invitationId}
              onClick={() => onDecline(invitation.invitationId)}
            >
              {t('gameApplication.declineInvitation')}
            </AppButton>
          </Stack>
        ))}
      </Stack>
    </SectionCard>
  )
}
