import { Box, Stack } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { RoleAdministrationUser } from '../../shared/api/contracts/index.ts'
import { AsyncSection, PagePagination, PageShell, SectionCard } from '../../shared/ui/index.ts'
import {
  roleAdministrationUsersQueryOptions,
  type UserFilters as Filters,
} from './api/role-administration-api.ts'
import { useAuth } from '../../shared/auth/use-auth.ts'
import { UserAccessDialog } from './UserAccessDialog.tsx'
import { UserFilters } from './UserFilters.tsx'
import { UsersTable } from './UsersTable.tsx'
import { RoleEditorDialog } from './RoleEditorDialog.tsx'
import { UserStatistics } from './UserStatistics.tsx'
import { useUserPageSize } from './use-user-page-size.ts'

const initialFilters: Filters = { page: 1, pageSize: 1, sort: 'createdDesc' }
export function RoleAdministrationPage() {
  const { t, i18n } = useTranslation()
  const { user: currentUser } = useAuth()
  const [accessUser, setAccessUser] = useState<RoleAdministrationUser | null>(null)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Filters>(initialFilters)
  const [editingUser, setEditingUser] = useState<RoleAdministrationUser | null>(null)
  useEffect(() => {
    const timer = window.setTimeout(
      () =>
        setFilters((current) =>
          current.search === (search.trim() || undefined)
            ? current
            : { ...current, page: 1, search: search.trim() },
        ),
      300,
    )
    return () => window.clearTimeout(timer)
  }, [search])
  const usersQuery = useQuery(roleAdministrationUsersQueryOptions(filters))
  const data = usersQuery.data
  const resizePage = useCallback((pageSize: number) => {
    setFilters((current) =>
      current.pageSize === pageSize
        ? current
        : {
            ...current,
            pageSize,
            page: Math.floor((((current.page ?? 1) - 1) * (current.pageSize ?? 1)) / pageSize) + 1,
          },
    )
  }, [])
  const tableRegionRef = useUserPageSize(
    resizePage,
    usersQuery.dataUpdatedAt,
    i18n.resolvedLanguage ?? 'en',
    usersQuery.isError,
  )
  const changeFilter = <K extends keyof Filters>(key: K, value: Filters[K] | null) => {
    setFilters((current) => {
      const next: Filters = { ...current, page: 1 }
      if (value == null) delete next[key]
      else next[key] = value
      return next
    })
  }
  const reset = () => {
    setSearch('')
    setFilters((current) => ({ ...initialFilters, pageSize: current.pageSize ?? 1 }))
  }
  const selectedUser =
    data?.items.find((user) => user.userId === editingUser?.userId) ?? editingUser
  return (
    <PageShell
      sx={{
        maxWidth: 'none',
        width: '100%',
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Stack spacing={1} sx={{ flex: 1, minHeight: 0 }}>
        <Stack spacing={1} sx={{ flexShrink: 0 }}>
          {data ? <UserStatistics summary={data.summary} /> : null}
          <UserFilters
            onReset={reset}
            filters={filters}
            search={search}
            onSearch={setSearch}
            onChange={changeFilter}
          />
        </Stack>
        <Box ref={tableRegionRef} sx={{ flex: 1, minHeight: 0 }}>
          <AsyncSection
            isLoading={usersQuery.isPending}
            isError={usersQuery.isError}
            hasData={Boolean(data)}
            isEmpty={false}
            loadingMessage={t('roleAdministration.loading')}
            errorMessage={t('roleAdministration.errorLoading')}
            emptyMessage={t('roleAdministration.empty')}
          >
            {data ? (
              <SectionCard
                data-user-list
                aria-busy={usersQuery.isFetching}
                sx={{ p: 0, height: '100%' }}
              >
                <UsersTable
                  users={data.items}
                  sort={filters.sort}
                  onSort={(value) => changeFilter('sort', value)}
                  onEdit={setEditingUser}
                  onAccess={setAccessUser}
                  currentUserId={currentUser?.id}
                />
              </SectionCard>
            ) : null}
          </AsyncSection>
        </Box>
        {data ? (
          <Box sx={{ flexShrink: 0 }}>
            <PagePagination
              density="compact"
              disabled={usersQuery.isPlaceholderData}
              total={data.totalCount}
              page={data.page}
              pageSize={data.pageSize}
              onChange={(page) => setFilters((current) => ({ ...current, page }))}
              previousLabel={t('common.actions.back')}
              nextLabel={t('common.actions.next')}
              pageLabel={(page) => t('roleAdministration.pageNumber', { page: String(page) })}
              navigationLabel={t('roleAdministration.pagination')}
              summary={t('common.pagination.summary', {
                from: data.totalCount === 0 ? 0 : (data.page - 1) * data.pageSize + 1,
                to: Math.min(data.page * data.pageSize, data.totalCount),
                total: data.totalCount,
              })}
            />
          </Box>
        ) : null}
      </Stack>
      {accessUser ? (
        <UserAccessDialog
          key={accessUser.userId}
          user={accessUser}
          onClose={() => setAccessUser(null)}
        />
      ) : null}
      {selectedUser ? (
        <RoleEditorDialog
          key={selectedUser.userId}
          user={selectedUser}
          onClose={() => setEditingUser(null)}
        />
      ) : null}
    </PageShell>
  )
}
