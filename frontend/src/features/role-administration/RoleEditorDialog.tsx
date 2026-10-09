import { Box, Stack, Typography } from '@mui/material'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  AuthRole,
  RoleAdministrationUser,
  RoleAdministrationPage,
} from '../../shared/api/contracts/index.ts'
import {
  AppButton,
  AppDialog,
  ChoiceLabel,
  ConfirmDialog,
  DiscardChangesDialog,
  FormCheckbox,
  HelpTooltip,
  InlineNotice,
  useDirtyClose,
} from '../../shared/ui/index.ts'
import { highestRole } from './role-hierarchy.ts'
import {
  roleAdministrationQueryKeys,
  updateRoleAdministrationUserRoles,
} from './api/role-administration-api.ts'

const managedRoles: readonly AuthRole[] = ['moderator', 'admin', 'superadmin']
export function RoleEditorDialog({
  user,
  onClose,
}: {
  user: RoleAdministrationUser
  onClose: () => void
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [draftRoles, setDraftRoles] = useState<AuthRole[] | null>(null)
  const [pendingRoles, setPendingRoles] = useState<AuthRole[] | null>(null)
  const initialRoles = managedRoles.filter(
    (_, index) => index <= managedRoles.indexOf(highestRole(user.roles)),
  )
  const selectedRoles = draftRoles ?? initialRoles
  const dirty = managedRoles.some(
    (role) => selectedRoles.includes(role) !== initialRoles.includes(role),
  )
  const update = useMutation({
    mutationFn: (roles: AuthRole[]) => updateRoleAdministrationUserRoles(user.userId, roles),
    onSuccess: async (savedUser) => {
      await queryClient.cancelQueries({ queryKey: roleAdministrationQueryKeys.all })
      queryClient.setQueriesData<RoleAdministrationPage>(
        { queryKey: roleAdministrationQueryKeys.all },
        (page) =>
          page
            ? {
                ...page,
                items: page.items.map((item) =>
                  item.userId === savedUser.userId ? savedUser : item,
                ),
              }
            : page,
      )
      setDraftRoles(null)
      setPendingRoles(null)
      onClose()
      void queryClient.invalidateQueries({ queryKey: roleAdministrationQueryKeys.all })
    },
  })
  const close = useDirtyClose({ dirty, busy: update.isPending || pendingRoles !== null, onClose })
  const hasSuperAdmin = selectedRoles.includes('superadmin')
  const hasAdmin = hasSuperAdmin || selectedRoles.includes('admin')
  const setRole = (role: AuthRole, checked: boolean) => {
    update.reset()
    const next = new Set(selectedRoles)
    if (checked) next.add(role)
    else next.delete(role)
    if (next.has('superadmin')) next.add('admin')
    if (next.has('admin')) next.add('moderator')
    setDraftRoles(managedRoles.filter((candidate) => next.has(candidate)))
  }
  return (
    <>
      <AppDialog
        open={pendingRoles === null}
        onClose={close.requestClose}
        maxWidth="sm"
        contentDensity="compact"
        title={t('roleAdministration.editTitle', { name: user.displayName })}
        actions={
          <>
            <AppButton tone="danger" disabled={update.isPending} onClick={close.requestClose}>
              {t('common.actions.close')}
            </AppButton>
            <AppButton
              loading={update.isPending}
              disabled={!dirty || update.isPending}
              onClick={() => {
                if (dirty && !update.isPending) {
                  update.reset()
                  setPendingRoles([...selectedRoles])
                }
              }}
            >
              {t('roleAdministration.save')}
            </AppButton>
          </>
        }
      >
        <Stack spacing={1}>
          <Typography variant="body2" color="text.secondary">
            {t('roleAdministration.viewerNotice')}
          </Typography>
          {user.isPermanentSuperAdmin ? (
            <InlineNotice severity="info" appearance="inline">
              {t('roleAdministration.permanentOwner')}
            </InlineNotice>
          ) : null}
          {managedRoles.map((role) => {
            const permanent =
              user.isPermanentSuperAdmin && (role === 'superadmin' || role === 'admin')
            const inherited =
              (role === 'admin' && hasSuperAdmin) || (role === 'moderator' && hasAdmin)
            return (
              <HelpTooltip
                key={role}
                title={
                  inherited
                    ? t(
                        role === 'admin'
                          ? 'roleAdministration.adminInherited'
                          : 'roleAdministration.moderatorInherited',
                      )
                    : ''
                }
                describeChild
              >
                <Box component="span" tabIndex={inherited ? 0 : undefined}>
                  <ChoiceLabel
                    control={
                      <FormCheckbox
                        checked={selectedRoles.includes(role)}
                        disabled={update.isPending || permanent || inherited}
                        onChange={(event) => setRole(role, event.target.checked)}
                      />
                    }
                    label={t(`navigation.roles.${role}`)}
                  />
                </Box>
              </HelpTooltip>
            )
          })}
          {update.isError ? (
            <InlineNotice severity="error">{t('roleAdministration.saveError')}</InlineNotice>
          ) : null}
        </Stack>
      </AppDialog>
      <ConfirmDialog
        open={pendingRoles !== null}
        title={t('roleAdministration.confirmRolesTitle')}
        subject={user.displayName}
        description={t('roleAdministration.confirmRolesDescription', {
          before: user.roles.map((role) => t(`navigation.roles.${role}`)).join(', '),
          after: (['viewer', ...(pendingRoles ?? selectedRoles)] as const)
            .map((role) => t(`navigation.roles.${role}`))
            .join(', '),
        })}
        confirmLabel={t('roleAdministration.confirmRolesAction')}
        cancelLabel={t('common.actions.cancel')}
        isBusy={update.isPending}
        errorMessage={update.isError ? t('roleAdministration.saveError') : null}
        onClose={() => {
          if (update.isPending) return
          setPendingRoles(null)
          update.reset()
        }}
        onConfirm={async () => {
          if (pendingRoles !== null) await update.mutateAsync(pendingRoles)
        }}
      />
      <DiscardChangesDialog
        open={close.confirmOpen}
        busy={update.isPending}
        onClose={close.keepEditing}
        onDiscard={close.discard}
      />
    </>
  )
}
