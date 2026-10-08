import { Box, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { RoleAdministrationUser } from '../../shared/api/contracts/index.ts'
import {
  AppButton,
  DataTable,
  DataTableCell,
  DataTableRow,
  HelpTooltip,
  StatusBadge,
} from '../../shared/ui/index.ts'
import { highestRole } from './role-hierarchy.ts'
import type { UserFilters } from './api/role-administration-api.ts'

export function UsersTable({
  users,
  sort,
  onSort,
  onEdit,
  onAccess,
  currentUserId,
}: {
  users: RoleAdministrationUser[]
  sort: UserFilters['sort']
  onSort: (sort: NonNullable<UserFilters['sort']>) => void
  onEdit: (user: RoleAdministrationUser) => void
  onAccess: (user: RoleAdministrationUser) => void
  currentUserId: string | undefined
}) {
  const { t, i18n } = useTranslation()
  const formatter = new Intl.DateTimeFormat(i18n.resolvedLanguage, {
    dateStyle: 'short',
    timeStyle: 'short',
  })
  const column = (
    label: string,
    ascending: NonNullable<UserFilters['sort']>,
    descending: NonNullable<UserFilters['sort']>,
    width: string,
    mobileLabel = label,
  ) => ({
    label,
    mobileLabel,
    width,
    align: 'center' as const,
    sortDirection:
      sort === ascending
        ? ('asc' as const)
        : sort === descending
          ? ('desc' as const)
          : (false as const),
    onSort: () =>
      onSort(
        sort === ascending
          ? descending
          : sort === descending || ascending === 'nameAsc'
            ? ascending
            : descending,
      ),
  })
  return (
    <DataTable
      density="compact"
      label={t('roleAdministration.title')}
      columns={[
        column(
          t('roleAdministration.user'),
          'nameAsc',
          'nameDesc',
          '18%',
          t('roleAdministration.mobileName'),
        ),
        column(t('roleAdministration.roles'), 'roleAsc', 'roleDesc', '13%'),
        column(
          t('roleAdministration.createdAt'),
          'createdAsc',
          'createdDesc',
          '14%',
          t('roleAdministration.mobileCreated'),
        ),
        column(
          t('roleAdministration.lastLogin'),
          'lastLoginAsc',
          'lastLoginDesc',
          '14%',
          t('roleAdministration.mobileLastLogin'),
        ),
        { label: t('roleAdministration.access'), width: '11%', align: 'center' },
        { label: t('roleAdministration.actions'), width: '30%', align: 'center' },
      ]}
    >
      {users.length === 0 ? (
        <DataTableRow>
          <DataTableCell
            align="center"
            colSpan={6}
            sx={{ gridColumn: '1 / -1', py: { xs: 2, md: 3 } }}
          >
            <Typography variant="body2" color="text.secondary">
              {t('roleAdministration.empty')}
            </Typography>
          </DataTableCell>
        </DataTableRow>
      ) : null}
      {users.map((user) => (
        <DataTableRow
          key={user.userId}
          aria-label={user.displayName}
          sx={{ gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'none' } }}
        >
          <DataTableCell align="center">
            <HelpTooltip
              title={
                user.twitchLogin.toLowerCase() !== user.displayName.toLowerCase()
                  ? user.displayName + ' (@' + user.twitchLogin + ')'
                  : user.displayName
              }
              describeChild
            >
              <Typography
                noWrap
                variant="body2"
                fontWeight={700}
                component="span"
                tabIndex={0}
                sx={{ display: 'block' }}
              >
                {user.displayName}
              </Typography>
            </HelpTooltip>
          </DataTableCell>
          <DataTableCell align="center">
            <HelpTooltip
              title={user.isPermanentSuperAdmin ? t('roleAdministration.permanentOwner') : ''}
              describeChild
            >
              <span tabIndex={user.isPermanentSuperAdmin ? 0 : undefined}>
                <StatusBadge
                  size="small"
                  density="compact"
                  variant="outlined"
                  label={t(`navigation.roles.${highestRole(user.roles)}`)}
                  color={highestRole(user.roles) === 'superadmin' ? 'warning' : 'default'}
                />
              </span>
            </HelpTooltip>
          </DataTableCell>
          <DataTableCell align="center">
            <UserDate
              label={t('roleAdministration.createdAt')}
              help={t('roleAdministration.createdHelp')}
              value={user.createdAtUtc}
              formatted={formatter.format(new Date(user.createdAtUtc))}
            />
          </DataTableCell>
          <DataTableCell align="center">
            <UserDate
              label={t('roleAdministration.lastLogin')}
              help={t(
                user.lastLoginAtUtc
                  ? 'roleAdministration.loginHelp'
                  : 'roleAdministration.neverHelp',
              )}
              value={user.lastLoginAtUtc}
              formatted={
                user.lastLoginAtUtc
                  ? formatter.format(new Date(user.lastLoginAtUtc))
                  : t('roleAdministration.neverLoggedIn')
              }
            />
          </DataTableCell>
          <DataTableCell align="center" sx={{ gridColumn: { xs: '1 / -1', md: 'auto' } }}>
            <HelpTooltip title={t('roleAdministration.accessHelp')} describeChild>
              <span tabIndex={0}>
                <StatusBadge
                  density="compact"
                  size="small"
                  variant="outlined"
                  label={t(
                    user.isActive ? 'roleAdministration.active' : 'roleAdministration.inactive',
                  )}
                  color={user.isActive ? 'success' : 'error'}
                />
              </span>
            </HelpTooltip>
          </DataTableCell>
          <DataTableCell align="center" sx={{ gridColumn: { xs: '1 / -1', md: 'auto' } }}>
            <Stack
              direction="row"
              justifyContent="center"
              spacing={0.5}
              useFlexGap
              sx={{ flexWrap: 'wrap' }}
            >
              <HelpTooltip
                title={
                  user.isActive && user.isPermanentSuperAdmin
                    ? t('roleAdministration.ownerAccessProtected')
                    : user.isActive && user.userId === currentUserId
                      ? t('roleAdministration.selfAccessProtected')
                      : t(user.isActive ? 'roleAdministration.block' : 'roleAdministration.unblock')
                }
                describeChild
              >
                <span
                  tabIndex={
                    user.isActive && (user.isPermanentSuperAdmin || user.userId === currentUserId)
                      ? 0
                      : undefined
                  }
                >
                  <AppButton
                    size="small"
                    tone={user.isActive ? 'danger' : 'success'}
                    disabled={
                      user.isActive && (user.isPermanentSuperAdmin || user.userId === currentUserId)
                    }
                    onClick={() => onAccess(user)}
                    aria-label={t(
                      user.isActive
                        ? 'roleAdministration.blockFor'
                        : 'roleAdministration.unblockFor',
                      { name: user.displayName },
                    )}
                  >
                    {t(user.isActive ? 'roleAdministration.block' : 'roleAdministration.unblock')}
                  </AppButton>
                </span>
              </HelpTooltip>
              <AppButton
                size="small"
                tone="secondary"
                onClick={() => onEdit(user)}
                aria-label={t('roleAdministration.editFor', { name: user.displayName })}
              >
                <Box component="span" sx={{ display: { xs: 'none', md: 'inline' } }}>
                  {t('roleAdministration.edit')}
                </Box>
                <Box component="span" sx={{ display: { xs: 'inline', md: 'none' } }}>
                  {t('roleAdministration.roles')}
                </Box>
              </AppButton>
            </Stack>
          </DataTableCell>
        </DataTableRow>
      ))}
    </DataTable>
  )
}
function UserDate({
  label,
  value,
  formatted,
  help,
}: {
  label: string
  value: string | null
  formatted: string
  help: string
}) {
  return (
    <Stack spacing={0.25}>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: { xs: 'block', md: 'none' } }}
      >
        {label}
      </Typography>
      <HelpTooltip title={help} describeChild>
        <Typography
          component={value ? 'time' : 'span'}
          tabIndex={0}
          dateTime={value ?? undefined}
          variant="body2"
          color={value ? 'text.primary' : 'text.secondary'}
        >
          {formatted}
        </Typography>
      </HelpTooltip>
    </Stack>
  )
}
