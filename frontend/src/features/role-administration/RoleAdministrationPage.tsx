import { useMemo, useState, type FormEvent } from 'react'
import {
  Alert,
  Box,
  Checkbox,
  Chip,
  FormControlLabel,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { AuthRole, RoleAdministrationUser } from '../../shared/api/contracts/index.ts'
import {
  AppButton,
  AppToast,
  PageShell,
  PageStatePanel,
  SectionCard,
  SectionHeader,
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
  const queryClient = useQueryClient()
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const usersQuery = useQuery(roleAdministrationUsersQueryOptions(search, page, pageSize))
  const updateMutation = useMutation({
    mutationFn: ({ userId, roles }: { userId: string; roles: AuthRole[] }) =>
      updateRoleAdministrationUserRoles(userId, roles),
    onSuccess: async (user) => {
      setErrorMessage(null)
      setSuccessMessage(t('roleAdministration.saved', { name: user.displayName }))
      await queryClient.invalidateQueries({ queryKey: roleAdministrationQueryKeys.all })
    },
    onError: () => {
      setSuccessMessage(null)
      setErrorMessage(t('roleAdministration.saveError'))
    },
  })

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
        title={t('roleAdministration.title')}
        description={t('roleAdministration.description')}
      />

      <Alert severity="info" sx={{ mt: 2 }}>
        {t('roleAdministration.viewerNotice')}
      </Alert>

      <SectionCard sx={{ mt: 2 }}>
        <Stack
          component="form"
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          onSubmit={submitSearch}
        >
          <TextField
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
          <TableContainer>
            <Table aria-label={t('roleAdministration.title')} sx={{ minWidth: 840 }}>
              <TableHead>
                <TableRow>
                  <TableCell>{t('roleAdministration.user')}</TableCell>
                  <TableCell>{t('roleAdministration.status')}</TableCell>
                  <TableCell>{t('roleAdministration.roles')}</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {usersQuery.data.items.map((user) => (
                  <RoleEditorRow
                    key={`${user.userId}:${managedRoles.filter((role) => user.roles.includes(role)).join(',')}`}
                    user={user}
                    isSaving={
                      updateMutation.isPending && updateMutation.variables?.userId === user.userId
                    }
                    onSave={(roles) => updateMutation.mutate({ userId: user.userId, roles })}
                  />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={usersQuery.data.totalCount}
            page={usersQuery.data.page - 1}
            rowsPerPage={usersQuery.data.pageSize}
            rowsPerPageOptions={[pageSize]}
            onPageChange={(_event, nextPage) => setPage(nextPage + 1)}
            onRowsPerPageChange={() => undefined}
          />
        </SectionCard>
      ) : null}

      <AppToast
        message={successMessage}
        severity="success"
        onClose={() => setSuccessMessage(null)}
      />
      <AppToast
        message={errorMessage}
        severity="error"
        autoHideDuration={6000}
        onClose={() => setErrorMessage(null)}
      />
    </PageShell>
  )
}

function RoleEditorRow({
  user,
  isSaving,
  onSave,
}: {
  user: RoleAdministrationUser
  isSaving: boolean
  onSave: (roles: AuthRole[]) => void
}) {
  const { t } = useTranslation()
  const initialRoles = useMemo(
    () => managedRoles.filter((role) => user.roles.includes(role)),
    [user.roles],
  )
  const [selectedRoles, setSelectedRoles] = useState<AuthRole[]>(initialRoles)

  const isDirty = managedRoles.some(
    (role) => selectedRoles.includes(role) !== initialRoles.includes(role),
  )
  const hasSuperAdmin = selectedRoles.includes('superadmin')

  const setRole = (role: AuthRole, checked: boolean) => {
    setSelectedRoles((current) => {
      const next = new Set(current)
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
    <TableRow hover>
      <TableCell>
        <Stack spacing={0.25}>
          <Typography variant="body2" fontWeight={700}>
            {user.displayName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            @{user.twitchLogin}
          </Typography>
          {user.isPermanentSuperAdmin ? (
            <Chip
              label={t('roleAdministration.permanentOwner')}
              color="warning"
              size="small"
              sx={{ alignSelf: 'flex-start', mt: 0.5 }}
            />
          ) : null}
        </Stack>
      </TableCell>
      <TableCell>
        <Chip
          label={user.isActive ? t('roleAdministration.active') : t('roleAdministration.inactive')}
          color={user.isActive ? 'success' : 'default'}
          size="small"
        />
      </TableCell>
      <TableCell>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {managedRoles.map((role) => {
            const isPermanentRole =
              user.isPermanentSuperAdmin && (role === 'superadmin' || role === 'admin')
            const isInheritedAdmin = role === 'admin' && hasSuperAdmin
            return (
              <FormControlLabel
                key={role}
                control={
                  <Checkbox
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
      </TableCell>
      <TableCell align="right">
        <AppButton
          size="small"
          disabled={!isDirty || isSaving}
          onClick={() => onSave(selectedRoles)}
        >
          {t('roleAdministration.save')}
        </AppButton>
      </TableCell>
    </TableRow>
  )
}
