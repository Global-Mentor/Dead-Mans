import { Chip, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type {
  RegistrationInvitation,
  RegistrationTeam,
} from '../../../shared/api/contracts/index.ts'
import { AppButton, SectionCard } from '../../../shared/ui/index.ts'

interface PendingInvitationsSectionProps {
  invitations: RegistrationInvitation[]
  teams: RegistrationTeam[]
  disabled: boolean
  onAccept: (invitationId: string) => void
  onDecline: (invitationId: string) => void
  pendingAcceptId: string | undefined
  pendingDeclineId: string | undefined
}

export function PendingInvitationsSection({
  invitations,
  teams,
  disabled,
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
    <SectionCard
      sx={{ borderLeft: '2px solid', borderLeftColor: 'primary.main', p: { xs: 2, sm: 2.5 } }}
    >
      <Stack spacing={2}>
        <Stack spacing={1}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography component="h2" variant="h5">
              {t('gameApplication.invitationsTitle')}
            </Typography>
            <Chip
              size="small"
              color="warning"
              label={t('gameApplication.invitationsChip', { count: invitations.length })}
            />
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
            {t('gameApplication.invitationsDescription')}
          </Typography>
        </Stack>

        <Stack spacing={1}>
          {invitations.map((invitation) => (
            <SectionCard
              key={invitation.invitationId}
              inset
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 1.5,
                alignItems: { xs: 'stretch', sm: 'center' },
                justifyContent: 'space-between',
              }}
            >
              <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                <Typography component="h3" variant="subtitle2" sx={{ overflowWrap: 'anywhere' }}>
                  {teams.find((team) => team.teamId === invitation.teamId)?.name?.trim() ||
                    t('gameApplication.invitationSlot', { slot: invitation.teamSlotIndex })}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ overflowWrap: 'anywhere' }}
                >
                  {invitation.invitedByDisplayName
                    ? t('gameApplication.invitedBy', { player: invitation.invitedByDisplayName })
                    : t('gameApplication.invitationDescription')}
                </Typography>
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <AppButton
                  size="small"
                  disabled={disabled}
                  loading={pendingAcceptId === invitation.invitationId}
                  onClick={() => onAccept(invitation.invitationId)}
                >
                  {t('gameApplication.acceptInvitation')}
                </AppButton>
                <AppButton
                  size="small"
                  tone="danger"
                  disabled={disabled}
                  loading={pendingDeclineId === invitation.invitationId}
                  onClick={() => onDecline(invitation.invitationId)}
                >
                  {t('gameApplication.declineInvitation')}
                </AppButton>
              </Stack>
            </SectionCard>
          ))}
        </Stack>
      </Stack>
    </SectionCard>
  )
}
