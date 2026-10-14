import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type {
  RoleAdministrationPage,
  RoleAdministrationUser,
} from '../../shared/api/contracts/index.ts'
import { ApiError } from '../../shared/api/errors/ApiError.ts'
import { ConfirmDialog } from '../../shared/ui/index.ts'
import {
  roleAdministrationQueryKeys,
  updateRoleAdministrationUserAccess,
} from './api/role-administration-api.ts'

export function UserAccessDialog({
  user,
  onClose,
}: {
  user: RoleAdministrationUser
  onClose: () => void
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const update = useMutation({
    mutationFn: () => updateRoleAdministrationUserAccess(user.userId, !user.isActive),
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
      onClose()
      void queryClient.invalidateQueries({ queryKey: roleAdministrationQueryKeys.all })
    },
  })
  const details = update.error instanceof ApiError ? update.error.details : null
  const code = details && typeof details === 'object' && 'code' in details ? details.code : null
  const errorKey =
    code === 'role_administration.permanent_superadmin_protected'
      ? 'roleAdministration.ownerAccessProtected'
      : code === 'role_administration.self_block_protected'
        ? 'roleAdministration.selfAccessProtected'
        : code === 'role_administration.user_not_found'
          ? 'roleAdministration.accessUserNotFound'
          : 'roleAdministration.accessError'
  return (
    <ConfirmDialog
      open
      title={t(user.isActive ? 'roleAdministration.blockTitle' : 'roleAdministration.unblockTitle')}
      subject={user.displayName}
      description={t(
        user.isActive
          ? 'roleAdministration.blockDescription'
          : 'roleAdministration.unblockDescription',
      )}
      confirmLabel={t(user.isActive ? 'roleAdministration.block' : 'roleAdministration.unblock')}
      confirmTone={user.isActive ? 'danger' : 'primary'}
      cancelLabel={t('common.actions.cancel')}
      isBusy={update.isPending}
      errorMessage={update.isError ? t(errorKey) : null}
      onClose={onClose}
      onConfirm={async () => {
        await update.mutateAsync()
      }}
    />
  )
}
