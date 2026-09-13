import { Box, Chip, Stack, SvgIcon, Tooltip, Typography } from '@mui/material'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  RegistrationInvitation,
  RegistrationPlayer,
  RegistrationTeam,
} from '../../../shared/api/contracts/index.ts'
import { AppButton, AppDialog, ConfirmDialog, FormTextField } from '../../../shared/ui/index.ts'
import { InviteTeammateSection } from './InviteTeammateSection.tsx'
import {
  isTeamNameTaken,
  normalizeTeamNameInput,
  TEAM_NAME_MAX_LENGTH,
  TEAM_NAME_MIN_LENGTH,
} from '../../game-registration/index.ts'
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
  onLeave: () => Promise<unknown> | void
  isLeaving: boolean
  onRequestDisband: () => Promise<unknown> | void
  onCancelDisbandRequest: () => Promise<unknown> | void
  isCancellingDisbandRequest: boolean
  canCancelDisbandRequest: boolean
  existingTeamNames: (string | null | undefined)[]
  isRequestingDisband: boolean
  onUpdateName: (name?: string) => Promise<unknown> | void
  isUpdatingName: boolean
  currentUserId: string | undefined
  onUpdateReadiness: (isReady: boolean) => Promise<unknown> | void
  isUpdatingReadiness: boolean
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
  onCancelDisbandRequest,
  isCancellingDisbandRequest,
  canCancelDisbandRequest,
  existingTeamNames,
  onUpdateName,
  isUpdatingName,
  currentUserId,
  onUpdateReadiness,
  isUpdatingReadiness,
}: MyTeamSectionProps) {
  const { t } = useTranslation()
  const [confirmation, setConfirmation] = useState<'request' | 'cancel' | 'leave'>('request')
  const [confirmationOpen, setConfirmationOpen] = useState(false)
  const [nameEditorOpen, setNameEditorOpen] = useState(false)
  const [nameDraft, setNameDraft] = useState(team.name ?? '')
  const [showNameHint, setShowNameHint] = useState(false)
  const nameEditorFormId = useId()
  const openConfirmation = (action: 'request' | 'cancel' | 'leave') => {
    setConfirmation(action)
    setConfirmationOpen(true)
  }
  const isClosedTeam = !team.recruitmentOpen
  const isConfirmedTeam = team.status === 'confirmed'
  const canEditName = team.status === 'forming'
  const hasDisbandRequest = team.disbandRequestedAtUtc != null
  const pendingOutgoingInvitation = outgoingInvitations[0] ?? null
  const isLeaveBlocked = pendingOutgoingInvitation !== null || isConfirmedTeam
  const normalizedNameDraft = normalizeTeamNameInput(nameDraft) ?? ''
  const currentTeamName = normalizeTeamNameInput(team.name ?? '') ?? ''
  const isNameChanged = normalizedNameDraft !== currentTeamName
  const nameError = !normalizedNameDraft
    ? 'gameApplication.teamNameRequired'
    : normalizedNameDraft.length < TEAM_NAME_MIN_LENGTH
      ? 'gameApplication.teamNameTooShort'
      : normalizedNameDraft.length > TEAM_NAME_MAX_LENGTH
        ? 'gameApplication.teamNameTooLong'
        : isTeamNameTaken(nameDraft, existingTeamNames)
          ? 'gameApplication.teamNameTaken'
          : null
  const canSaveName =
    canEditName && isNameChanged && !isUpdatingName && !disabled && nameError === null
  const currentMember = team.members.find((member) => member.player.userId === currentUserId)
  const isCurrentPlayerReady = currentMember?.readyAtUtc != null
  const readyPlayersCount = team.members.filter((member) => member.readyAtUtc != null).length
  const isTeamFull = team.members.length === capacity
  const hasTeamName = currentTeamName.length > 0
  const canMarkReady = canEditName && hasTeamName && isTeamFull && currentMember != null
  const readinessHelperKey = !hasTeamName
    ? 'gameApplication.readinessNeedsName'
    : !isTeamFull
      ? 'gameApplication.readinessNeedsFullTeam'
      : team.isReady
        ? 'gameApplication.readinessTeamReady'
        : isCurrentPlayerReady
          ? 'gameApplication.readinessWaitingForTeam'
          : 'gameApplication.readinessActionHint'
  const closeNameEditor = () => {
    if (isUpdatingName) return
    setNameEditorOpen(false)
    setShowNameHint(false)
  }
  const saveName = async () => {
    if (!canSaveName) return
    try {
      await onUpdateName(normalizeTeamNameInput(nameDraft))
      setNameEditorOpen(false)
      setShowNameHint(false)
    } catch {
      /* The page toast displays the error; keep the draft available for retry. */
    }
  }
  const toggleReadiness = async () => {
    try {
      await onUpdateReadiness(!isCurrentPlayerReady)
    } catch {
      /* The mutation toast displays the error; keep the server's readiness state. */
    }
  }

  return (
    <ApplicationSection
      title={t('gameApplication.myTeamTitle')}
      action={
        isConfirmedTeam ? (
          <Chip
            size="small"
            variant="outlined"
            color={hasDisbandRequest ? 'warning' : 'primary'}
            label={t(
              hasDisbandRequest
                ? 'gameApplication.disbandRequestPending'
                : 'gameApplication.statusConfirmed',
            )}
          />
        ) : null
      }
    >
      <Stack spacing={1.5}>
        <TeamSummary
          team={team}
          capacity={capacity}
          showStatus={false}
          emphasizeName
          capacityBelowName
          showReadiness
          nameAction={
            canEditName ? (
              <Tooltip title={t('gameApplication.editTeamName')} describeChild arrow>
                <AppButton
                  tone="secondary"
                  size="small"
                  disabled={disabled}
                  aria-label={t('gameApplication.editTeamName')}
                  sx={{
                    ml: 'auto',
                    minWidth: 0,
                    minHeight: 34,
                    flexShrink: 0,
                    gap: 0.65,
                    px: 1,
                    py: 0.5,
                    fontSize: 13,
                    whiteSpace: 'nowrap',
                  }}
                  onClick={() => {
                    setNameDraft(team.name ?? '')
                    setShowNameHint(false)
                    setNameEditorOpen(true)
                  }}
                >
                  <SvgIcon sx={{ fontSize: 18 }}>
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                  </SvgIcon>
                  {t('common.actions.edit')}
                </AppButton>
              </Tooltip>
            ) : undefined
          }
        />

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

        <Stack spacing={2} sx={{ pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
          <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 0.75 }}>
            {(isConfirmedTeam
              ? hasDisbandRequest
                ? (['disbandPendingPoint', 'disbandWithdrawalPoint'] as const)
                : (['confirmedWaitPoint'] as const)
              : pendingOutgoingInvitation
                ? (['invitationPendingPoint', 'cancelInvitationFirstPoint'] as const)
                : (['leaveAvailablePoint'] as const)
            ).map((key) => (
              <Box
                component="li"
                key={key}
                sx={{ display: 'flex', gap: 1.25, alignItems: 'baseline' }}
              >
                <Box
                  aria-hidden
                  component="span"
                  sx={{
                    width: 5,
                    height: 5,
                    flexShrink: 0,
                    transform: 'rotate(45deg)',
                    bgcolor: 'primary.main',
                  }}
                />
                <Typography variant="body2" color="text.secondary">
                  {t(`gameApplication.${key}`)}
                </Typography>
              </Box>
            ))}
          </Box>

          {team.status === 'forming' ? (
            <Box
              sx={(theme) => ({
                p: 1.5,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: theme.shape.borderRadius,
                backgroundColor: theme.palette.action.hover,
              })}
            >
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Chip
                  size="small"
                  color={team.isReady ? 'success' : 'default'}
                  variant={team.isReady ? 'filled' : 'outlined'}
                  label={
                    team.isReady
                      ? t('gameApplication.teamReady')
                      : t('gameApplication.readyPlayersCount', {
                          ready: readyPlayersCount,
                          total: team.members.length,
                        })
                  }
                />
                <Typography variant="body2" color="text.secondary">
                  {t(readinessHelperKey)}
                </Typography>
              </Stack>
            </Box>
          ) : null}

          {!isConfirmedTeam || !hasDisbandRequest || canCancelDisbandRequest ? (
            <Stack
              direction={isConfirmedTeam ? 'row' : { xs: 'column', sm: 'row' }}
              alignItems={isConfirmedTeam ? 'center' : 'stretch'}
              gap={1.5}
              sx={{
                '& > button': { flex: isConfirmedTeam ? undefined : 1 },
                '&::before, &::after': {
                  content: '""',
                  display: isConfirmedTeam ? 'block' : 'none',
                  flex: 1,
                  borderTop: '1px solid',
                  borderColor: 'divider',
                },
              }}
            >
              {team.status === 'forming' ? (
                <AppButton
                  tone={isCurrentPlayerReady ? 'secondary' : 'primary'}
                  disabled={
                    disabled || isUpdatingReadiness || (!isCurrentPlayerReady && !canMarkReady)
                  }
                  loading={isUpdatingReadiness}
                  onClick={() => void toggleReadiness()}
                >
                  {t(
                    isCurrentPlayerReady
                      ? 'gameApplication.withdrawReadiness'
                      : 'gameApplication.markReady',
                  )}
                </AppButton>
              ) : null}
              {isConfirmedTeam ? (
                hasDisbandRequest ? (
                  <AppButton
                    tone="danger"
                    disabled={disabled}
                    loading={isCancellingDisbandRequest}
                    onClick={() => openConfirmation('cancel')}
                  >
                    {t('gameApplication.cancelDisbandRequest')}
                  </AppButton>
                ) : (
                  <AppButton
                    tone="danger"
                    disabled={disabled}
                    loading={isRequestingDisband}
                    onClick={() => openConfirmation('request')}
                  >
                    {t('gameApplication.requestDisband')}
                  </AppButton>
                )
              ) : (
                <AppButton
                  tone="danger"
                  disabled={disabled || isLeaveBlocked}
                  loading={isLeaving}
                  onClick={() => openConfirmation('leave')}
                >
                  {t('gameApplication.leaveTeam')}
                </AppButton>
              )}
            </Stack>
          ) : null}
        </Stack>
      </Stack>
      <AppDialog
        open={nameEditorOpen && canEditName}
        title={t('gameApplication.editTeamName')}
        appearance="accented"
        onClose={closeNameEditor}
        actions={
          <>
            <AppButton
              tone="secondary"
              size="large"
              disabled={isUpdatingName}
              onClick={closeNameEditor}
            >
              {t('common.actions.cancel')}
            </AppButton>
            <AppButton
              type="submit"
              size="large"
              form={nameEditorFormId}
              disabled={!canSaveName}
              loading={isUpdatingName}
            >
              {t('common.actions.save')}
            </AppButton>
          </>
        }
      >
        <Box
          component="form"
          id={nameEditorFormId}
          onSubmit={(event) => {
            event.preventDefault()
            void saveName()
          }}
        >
          <FormTextField
            fullWidth
            required
            autoFocus
            error={nameError !== null}
            size="small"
            label={t('gameApplication.teamNameField')}
            placeholder={t('gameApplication.teamNamePlaceholder')}
            value={nameDraft}
            disabled={!canEditName || isUpdatingName || disabled}
            slotProps={{
              htmlInput: { minLength: TEAM_NAME_MIN_LENGTH, maxLength: TEAM_NAME_MAX_LENGTH },
            }}
            validationHint={showNameHint && nameError ? t(nameError) : null}
            onValidationHintClose={() => setShowNameHint(false)}
            onBlur={() => setShowNameHint(false)}
            onChange={(event) => {
              setNameDraft(event.target.value)
              setShowNameHint(true)
            }}
            helperText={nameError ? t(nameError) : t('gameApplication.teamNameEditableHelper')}
          />
        </Box>
      </AppDialog>
      <ConfirmDialog
        open={confirmationOpen}
        appearance="accented"
        title={t(
          confirmation === 'cancel'
            ? 'gameApplication.cancelDisbandConfirmTitle'
            : confirmation === 'leave'
              ? 'gameApplication.leaveTeamConfirmTitle'
              : 'gameApplication.requestDisbandConfirmTitle',
        )}
        description={t(
          confirmation === 'cancel'
            ? 'gameApplication.cancelDisbandConfirmDescription'
            : confirmation === 'leave'
              ? 'gameApplication.leaveTeamConfirmDescription'
              : 'gameApplication.requestDisbandConfirmDescription',
        )}
        confirmLabel={t(
          confirmation === 'cancel'
            ? 'gameApplication.cancelDisbandRequest'
            : confirmation === 'leave'
              ? 'gameApplication.leaveTeam'
              : 'gameApplication.requestDisbandConfirmAction',
        )}
        cancelLabel={t('common.actions.cancel')}
        cancelTone="secondary"
        confirmTone={confirmation === 'cancel' ? 'primary' : 'danger'}
        isBusy={disabled}
        confirmDisabled={
          confirmation === 'leave'
            ? isConfirmedTeam || isLeaveBlocked
            : !isConfirmedTeam ||
              (confirmation === 'cancel'
                ? !hasDisbandRequest || !canCancelDisbandRequest
                : hasDisbandRequest)
        }
        onClose={() => setConfirmationOpen(false)}
        onConfirm={async () => {
          try {
            if (confirmation === 'cancel') await onCancelDisbandRequest()
            else if (confirmation === 'leave') await onLeave()
            else await onRequestDisband()
            setConfirmationOpen(false)
          } catch {
            /* The mutation reports its error through the page toast. */
          }
        }}
      />
    </ApplicationSection>
  )
}
