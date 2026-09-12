import { Box, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type {
  RegistrationInvitation,
  RegistrationPlayer,
  RegistrationTeam,
} from '../../../shared/api/contracts/index.ts'
import { AppButton, SectionCard } from '../../../shared/ui/index.ts'
import { InviteTeammateSection } from './InviteTeammateSection.tsx'
import { RegistrationTeamNameEditor } from '../../game-registration/index.ts'
import { TeamSummary } from './TeamSummary.tsx'
import { ApplicationSection } from './ApplicationSection.tsx'

interface MyTeamSectionProps {
  team: RegistrationTeam
  capacity: number
  disabled: boolean
  canInvitePlayers: boolean
  invitablePlayers: RegistrationPlayer[]
  outgoingInvitations: RegistrationInvitation[]
  onInvitePlayer: (userId: string) => void
  isInvitingPlayer: boolean
  onCancelInvitation: (invitationId: string) => void
  isCancellingInvitation: boolean
  onLeave: () => void
  isLeaving: boolean
  onRequestDisband: () => void
  isRequestingDisband: boolean
  onUpdateName: (name?: string) => void
  isUpdatingName: boolean
}

export function MyTeamSection({
  team,
  capacity,
  disabled,
  canInvitePlayers,
  invitablePlayers,
  outgoingInvitations,
  onInvitePlayer,
  isInvitingPlayer,
  onCancelInvitation,
  isCancellingInvitation,
  onLeave,
  isLeaving,
  onRequestDisband,
  isRequestingDisband,
  onUpdateName,
  isUpdatingName,
}: MyTeamSectionProps) {
  const { t } = useTranslation()
  const isClosedTeam = !team.recruitmentOpen
  const isConfirmedTeam = team.status === 'confirmed'
  const canEditName = team.status === 'forming'
  const hasDisbandRequest = team.disbandRequestedAtUtc != null
  const pendingOutgoingInvitation = outgoingInvitations[0] ?? null
  const isLeaveBlocked = pendingOutgoingInvitation !== null || isConfirmedTeam

  return (
    <ApplicationSection
      title={t('gameApplication.myTeamTitle')}
      description={t('gameApplication.myTeamDescription')}
    >
      <SectionCard sx={{ p: 1.5, borderColor: 'divider' }}>
        <Stack spacing={1.5}>
          <TeamSummary team={team} capacity={capacity} />

          {canEditName ? (
            <Box sx={{ pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
              <RegistrationTeamNameEditor
                value={team.name}
                canEdit={canEditName}
                isSaving={isUpdatingName || disabled}
                onSave={onUpdateName}
                buttonSx={{ mt: { md: 0.35 }, minWidth: 112 }}
              />
            </Box>
          ) : null}

          {isClosedTeam && !isConfirmedTeam ? (
            <InviteTeammateSection
              canInvitePlayers={canInvitePlayers}
              invitablePlayers={invitablePlayers}
              pendingOutgoingInvitation={pendingOutgoingInvitation}
              disabled={disabled}
              isInvitingPlayer={isInvitingPlayer}
              isCancellingInvitation={isCancellingInvitation}
              onInvitePlayer={onInvitePlayer}
              onCancelInvitation={onCancelInvitation}
            />
          ) : null}

          <Box sx={{ pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
            <Stack spacing={1}>
              <Typography variant="body2" color="text.secondary">
                {isConfirmedTeam
                  ? hasDisbandRequest
                    ? t('gameApplication.disbandRequestPendingHelper')
                    : t('gameApplication.confirmedTeamLeaveHelper')
                  : pendingOutgoingInvitation
                    ? t('gameApplication.leaveTeamBlockedHelper')
                    : t('gameApplication.leaveTeamHelper')}
              </Typography>
              {isConfirmedTeam ? (
                <AppButton
                  tone="danger"
                  disabled={disabled || hasDisbandRequest}
                  loading={isRequestingDisband}
                  onClick={onRequestDisband}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  {hasDisbandRequest
                    ? t('gameApplication.disbandRequestPending')
                    : t('gameApplication.requestDisband')}
                </AppButton>
              ) : null}
            </Stack>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
            {!isConfirmedTeam ? (
              <AppButton
                tone="danger"
                disabled={disabled || isLeaveBlocked}
                loading={isLeaving}
                onClick={onLeave}
              >
                {t('gameApplication.leaveTeam')}
              </AppButton>
            ) : null}
          </Stack>
        </Stack>
      </SectionCard>
    </ApplicationSection>
  )
}
