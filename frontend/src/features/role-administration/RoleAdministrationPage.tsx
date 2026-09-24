import { Box, Stack, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  AuthRole,
  RoleAdministrationUser,
  RoleAdministrationPage as UsersPage,
} from '../../shared/api/contracts/index.ts'
import {
  AppButton,
  ChoiceLabel,
  DataTable,
  DataTableCell,
  DataTableRow,
  FormCheckbox,
  FormTextField,
  InlineNotice,
  PagePagination,
  PageShell,
  PageStatePanel,
  SectionCard,
  SectionHeader,
  StatusBadge,
} from '../../shared/ui/index.ts'
import {
  roleAdministrationQueryKeys,
  roleAdministrationUsersQueryOptions,
  updateRoleAdministrationUserRoles,
} from './api/role-administration-api.ts'

const pageSize = 25
const managedRoles = ['moderator', 'admin', 'superadmin'] as const satisfies readonly AuthRole[]

export function RoleAdministrationPage() {
  const { t } = useTranslation()
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const usersQuery = useQuery(roleAdministrationUsersQueryOptions(search, page, pageSize))

  const submitSearch = (event: FormEvent) => {
    event.preventDefault()
    setPage(1)
    setSearch(searchInput.trim())
  }

  const clearSearch = () => {
    setSearchInput('')
    setSearch('')
    setPage(1)
  }

  return (
    <PageShell sx={{ maxWidth: 'none', width: '100%' }}>
      <SectionHeader
        headingLevel="h1"
        title={t('roleAdministration.title')}
        description={t('roleAdministration.description')}
      />

      <InlineNotice severity="info" sx={{ mt: 2 }}>
        {t('roleAdministration.viewerNotice')}
      </InlineNotice>

      <SectionCard sx={{ mt: 2 }}>
        <Stack
          component="form"
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          onSubmit={submitSearch}
        >
          <FormTextField
            value={searchInput}
            label={t('roleAdministration.searchLabel')}
            size="small"
            slotProps={{ htmlInput: { maxLength: 100 } }}
            onChange={(event) => setSearchInput(event.target.value)}
            sx={{ flex: 1 }}
          />
          <AppButton type="submit">{t('roleAdministration.searchAction')}</AppButton>
          <AppButton tone="secondary" disabled={!search && !searchInput} onClick={clearSearch}>
            {t('roleAdministration.clearSearch')}
          </AppButton>
        </Stack>
      </SectionCard>

      {usersQuery.isLoading ? (
        <Box sx={{ mt: 2 }}>
          <PageStatePanel message={t('roleAdministration.loading')} showSpinner />
        </Box>
      ) : null}
      {usersQuery.isError ? (
        <Box sx={{ mt: 2 }}>
          <PageStatePanel message={t('roleAdministration.errorLoading')} tone="error" />
        </Box>
      ) : null}
      {usersQuery.data && usersQuery.data.items.length === 0 ? (
        <Box sx={{ mt: 2 }}>
          <PageStatePanel message={t('roleAdministration.empty')} />
        </Box>
      ) : null}
      {usersQuery.data && usersQuery.data.items.length > 0 ? (
        <SectionCard sx={{ mt: 2, p: 0, overflow: 'hidden' }}>
          <DataTable
            label={t('roleAdministration.title')}
            columns={[
              t('roleAdministration.user'),
              t('roleAdministration.status'),
              t('roleAdministration.roles'),
              t('common.actions.save'),
            ]}
          >
            {usersQuery.data.items.map((user) => (
              <RoleEditorRow key={user.userId} user={user} />
            ))}
          </DataTable>
          <PagePagination
            total={usersQuery.data.totalCount}
            page={usersQuery.data.page}
            pageSize={usersQuery.data.pageSize}
            onChange={setPage}
            previousLabel={t('common.actions.back')}
            nextLabel={t('common.actions.next')}
            summary={t('common.pagination.summary', {
              from: (usersQuery.data.page - 1) * usersQuery.data.pageSize + 1,
              to: Math.min(
                usersQuery.data.page * usersQuery.data.pageSize,
                usersQuery.data.totalCount,
              ),
              total: usersQuery.data.totalCount,
            })}
          />
        </SectionCard>
      ) : null}
    </PageShell>
  )
}

function RoleEditorRow({ user }: { user: RoleAdministrationUser }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [draftRoles, setDraftRoles] = useState<AuthRole[] | null>(null)
  const update = useMutation({
    mutationFn: (roles: AuthRole[]) => updateRoleAdministrationUserRoles(user.userId, roles),
    onSuccess: async (savedUser) => {
      // The mutation response is authoritative even if the following refresh fails.
      await queryClient.cancelQueries({ queryKey: roleAdministrationQueryKeys.all })
      queryClient.setQueriesData<UsersPage>(
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
      await queryClient.invalidateQueries({ queryKey: roleAdministrationQueryKeys.all })
    },
  })
  const isSaving = update.isPending
  const initialRoles = useMemo(
    () => managedRoles.filter((role) => user.roles.includes(role)),
    [user.roles],
  )
  const selectedRoles = draftRoles ?? initialRoles

  const isDirty = managedRoles.some(
    (role) => selectedRoles.includes(role) !== initialRoles.includes(role),
  )
  const hasSuperAdmin = selectedRoles.includes('superadmin')

  const setRole = (role: AuthRole, checked: boolean) => {
    update.reset()
    setDraftRoles((current) => {
      const next = new Set(current ?? initialRoles)
      if (checked) {
        next.add(role)
      } else {
        next.delete(role)
      }
      if (role === 'superadmin' && checked) {
        next.add('admin')
      }
      return managedRoles.filter((candidate) => next.has(candidate))
    })
  }

  return (
    <DataTableRow aria-label={user.displayName}>
      <DataTableCell>
        <Stack spacing={0.25}>
          <Typography variant="body2" fontWeight={700}>
            {user.displayName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            @{user.twitchLogin}
          </Typography>
          {user.isPermanentSuperAdmin ? (
            <StatusBadge
              label={t('roleAdministration.permanentOwner')}
              color="warning"
              size="small"
              sx={{ alignSelf: 'flex-start', mt: 0.5 }}
            />
          ) : null}
        </Stack>
      </DataTableCell>
      <DataTableCell>
        <StatusBadge
          label={user.isActive ? t('roleAdministration.active') : t('roleAdministration.inactive')}
          color={user.isActive ? 'success' : 'default'}
          size="small"
        />
      </DataTableCell>
      <DataTableCell>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {managedRoles.map((role) => {
            const isPermanentRole =
              user.isPermanentSuperAdmin && (role === 'superadmin' || role === 'admin')
            const isInheritedAdmin = role === 'admin' && hasSuperAdmin
            return (
              <ChoiceLabel
                key={role}
                control={
                  <FormCheckbox
                    size="small"
                    checked={selectedRoles.includes(role)}
                    disabled={isSaving || isPermanentRole || isInheritedAdmin}
                    onChange={(event) => setRole(role, event.target.checked)}
                  />
                }
                label={t(`navigation.roles.${role}`)}
                title={isInheritedAdmin ? t('roleAdministration.adminInherited') : undefined}
              />
            )
          })}
        </Stack>
      </DataTableCell>
      <DataTableCell>
        <AppButton
          fullWidth
          loading={isSaving}
          disabled={!isDirty || isSaving}
          onClick={() => {
            if (!isSaving) update.mutate(selectedRoles)
          }}
        >
          {t('roleAdministration.save')}
        </AppButton>
        {update.isError ? (
          <InlineNotice severity="error" sx={{ mt: 1 }}>
            {t('roleAdministration.saveError')}
          </InlineNotice>
        ) : null}
        {update.isSuccess ? (
          <Typography role="status" color="success.main" variant="body2" sx={{ mt: 1 }}>
            {t('roleAdministration.saved', { name: user.displayName })}
          </Typography>
        ) : null}
        {isDirty ? (
          <AppButton
            tone="ghost"
            disabled={isSaving}
            onClick={() => {
              setDraftRoles(null)
              update.reset()
            }}
          >
            {t('common.actions.cancel')}
          </AppButton>
        ) : null}
      </DataTableCell>
    </DataTableRow>
  )
}
