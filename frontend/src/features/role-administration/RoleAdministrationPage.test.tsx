import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '../../i18n.ts'
import {
  featureTranslationBundles,
  registerFeatureTranslations,
} from '../../locales/feature-locale-loader.ts'
import { renderWithAppProviders } from '../../test/render-with-app-providers.tsx'
import type { RoleAdministrationPage as UsersPage } from '../../shared/api/contracts/index.ts'
import { RoleAdministrationPage } from './RoleAdministrationPage.tsx'

const api = vi.hoisted(() => ({
  getUsers: vi.fn(),
  updateRoles: vi.fn(),
  updateAccess: vi.fn(),
  currentUserId: 'owner',
}))
vi.mock('../../shared/auth/use-auth.ts', () => ({
  useAuth: () => ({ user: { id: api.currentUserId } }),
}))
vi.mock('./api/role-administration-api.ts', async () => {
  const actual = await vi.importActual<typeof import('./api/role-administration-api.ts')>(
    './api/role-administration-api.ts',
  )
  return {
    ...actual,
    roleAdministrationUsersQueryOptions: (
      filters: Parameters<typeof actual.roleAdministrationUsersQueryOptions>[0],
    ) => ({
      ...actual.roleAdministrationUsersQueryOptions(filters),
      queryFn: () => api.getUsers(filters),
    }),
    updateRoleAdministrationUserRoles: api.updateRoles,
    updateRoleAdministrationUserAccess: api.updateAccess,
  }
})
const data: UsersPage = {
  items: [
    {
      userId: 'owner',
      twitchLogin: 'owner',
      displayName: 'Владелец',
      isActive: true,
      roles: ['viewer', 'moderator', 'admin', 'superadmin'],
      isPermanentSuperAdmin: true,
      createdAtUtc: '2026-09-01T12:00:00Z',
      lastLoginAtUtc: '2026-10-05T12:00:00Z',
    },
    {
      userId: 'member',
      twitchLogin: 'member',
      displayName: 'Игрок',
      isActive: true,
      roles: ['viewer'],
      isPermanentSuperAdmin: false,
      createdAtUtc: '2026-10-04T12:00:00Z',
      lastLoginAtUtc: null,
    },
  ],
  page: 1,
  pageSize: 25,
  totalCount: 2,
  summary: { totalUsers: 2, loggedInUsers: 1, newUsers: 1 },
}
beforeAll(async () => {
  await i18n.changeLanguage('ru')
  await registerFeatureTranslations(i18n, [featureTranslationBundles.roleAdministration])
})
beforeEach(() => {
  api.currentUserId = 'owner'
  api.getUsers.mockResolvedValue(data)
  api.updateRoles.mockImplementation(async (_id: string, roles: string[]) => ({
    ...data.items[1],
    roles: ['viewer', ...roles],
  }))
})
afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})
function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  renderWithAppProviders(
    <QueryClientProvider client={client}>
      <RoleAdministrationPage />
    </QueryClientProvider>,
  )
  return client
}
async function editMember() {
  fireEvent.click(await screen.findByRole('button', { name: 'Управление ролями: Игрок' }))
  return screen.getByRole('dialog', { name: 'Роли: Игрок' })
}
describe('RoleAdministrationPage', () => {
  it('keeps the table, summary and filters mounted while a new filter is loading', async () => {
    renderPage()
    await screen.findByRole('button', { name: 'Заблокировать: Игрок' })
    const table = screen.getByRole('table', { name: 'Роли пользователей', exact: true })
    const summary = screen.getByText('Всего')
    const accessFilter = screen.getByRole('combobox', { name: 'Доступ' })
    const pagination = screen.getByRole('navigation', { name: 'Страницы пользователей' })
    let finish: (value: UsersPage) => void = () => {}
    api.getUsers.mockImplementationOnce(
      () =>
        new Promise<UsersPage>((resolve) => {
          finish = resolve
        }),
    )
    fireEvent.mouseDown(accessFilter)
    fireEvent.click(await screen.findByRole('option', { name: 'Заблокирован', exact: true }))
    await waitFor(() =>
      expect(api.getUsers).toHaveBeenLastCalledWith(expect.objectContaining({ isActive: false })),
    )
    expect(screen.getByRole('table', { name: 'Роли пользователей', exact: true })).toBe(table)
    expect(screen.getByText('Всего')).toBe(summary)
    expect(screen.getByRole('combobox', { name: 'Доступ' })).toBe(accessFilter)
    expect(screen.getByRole('navigation', { name: 'Страницы пользователей' })).toBe(pagination)
    expect(screen.getByRole('row', { name: 'Игрок' })).toBeInTheDocument()
    expect(screen.queryByText('Загрузка пользователей...')).not.toBeInTheDocument()
    expect(table.closest('[data-user-list]')).toHaveAttribute('aria-busy', 'true')
    const member = data.items[1]
    if (!member) throw new Error('Missing member fixture')
    finish({ ...data, items: [{ ...member, isActive: false }], totalCount: 1 })
    await waitFor(() =>
      expect(screen.queryByRole('row', { name: 'Владелец' })).not.toBeInTheDocument(),
    )
    expect(screen.getByRole('table', { name: 'Роли пользователей', exact: true })).toBe(table)
    expect(table.closest('[data-user-list]')).toHaveAttribute('aria-busy', 'false')
    expect(
      within(screen.getByRole('row', { name: 'Игрок' })).getByText('Заблокирован'),
    ).toBeInTheDocument()
  })
  it('confirms blocking, protects owner and self, and keeps saved access when refresh fails', async () => {
    const client = renderPage()
    const block = await screen.findByRole('button', { name: 'Заблокировать: Игрок' })
    expect(screen.getByRole('button', { name: 'Заблокировать: Владелец' })).toBeDisabled()
    fireEvent.click(block)
    const dialog = screen.getByRole('dialog', { name: 'Заблокировать Игрок?' })
    expect(api.updateAccess).not.toHaveBeenCalled()
    api.getUsers.mockRejectedValueOnce(new Error('offline'))
    api.updateAccess.mockResolvedValueOnce({ ...data.items[1], isActive: false })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Заблокировать', exact: true }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(api.updateAccess).toHaveBeenCalledWith('member', false)
    expect(
      within(screen.getByRole('row', { name: 'Игрок' })).getByText('Заблокирован'),
    ).toBeInTheDocument()
    expect(
      client.getQueriesData<UsersPage>({ queryKey: ['role-administration-users'] })[0]?.[1]
        ?.items[1]?.isActive,
    ).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Разблокировать: Игрок' }))
    const unblock = screen.getByRole('dialog', { name: 'Разблокировать Игрок?' })
    api.getUsers.mockResolvedValue(data)
    api.updateAccess.mockResolvedValueOnce(data.items[1])
    fireEvent.click(within(unblock).getByRole('button', { name: 'Разблокировать', exact: true }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(api.updateAccess).toHaveBeenLastCalledWith('member', true)
    api.currentUserId = 'member'
    await client.invalidateQueries({ queryKey: ['role-administration-users'] })
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Заблокировать: Игрок' })).toBeDisabled(),
    )
  })
  it('retains the access confirmation on failure and disables closing during retry', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Заблокировать: Игрок' }))
    const dialog = screen.getByRole('dialog', { name: 'Заблокировать Игрок?' })
    api.updateAccess.mockRejectedValueOnce(new Error('offline'))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Заблокировать', exact: true }))
    await within(dialog).findByRole('alert')
    let finish: (value: unknown) => void = () => {}
    api.updateAccess.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    fireEvent.click(within(dialog).getByRole('button', { name: 'Заблокировать', exact: true }))
    await waitFor(() =>
      expect(within(dialog).getByRole('button', { name: 'Отмена' })).toBeDisabled(),
    )
    fireEvent.click(within(dialog).getByRole('button', { name: 'Заблокировать', exact: true }))
    expect(api.updateAccess).toHaveBeenCalledTimes(2)
    api.getUsers.mockResolvedValue({
      ...data,
      items: data.items.map((user) =>
        user.userId === 'member' ? { ...user, isActive: false } : user,
      ),
    })
    finish({ ...data.items[1], isActive: false })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
  it('cancels without changing access and sends the renamed access filter', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Заблокировать: Игрок' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Отмена' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(api.updateAccess).not.toHaveBeenCalled()
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Доступ' }))
    fireEvent.click(await screen.findByRole('option', { name: 'Заблокирован', exact: true }))
    await waitFor(() =>
      expect(api.getUsers).toHaveBeenLastCalledWith(
        expect.objectContaining({ isActive: false, page: 1 }),
      ),
    )
  })
  it('keeps the list compact and protects permanent and inherited roles in the editor', async () => {
    renderPage()
    await screen.findByRole('button', { name: 'Управление ролями: Игрок' })
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.getByText('Не входил')).toBeInTheDocument()
    const ownerRow = within(screen.getByRole('row', { name: 'Владелец' }))
    expect(ownerRow.getByText('Суперадминистратор', { exact: true })).toBeInTheDocument()
    expect(ownerRow.queryByText('Администратор', { exact: true })).not.toBeInTheDocument()
    expect(ownerRow.queryByText('Модератор', { exact: true })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Управление ролями: Владелец' }))
    const owner = screen.getByRole('dialog')
    expect(within(owner).getByRole('checkbox', { name: 'Суперадминистратор' })).toBeDisabled()
    expect(
      within(owner).getByRole('checkbox', { name: 'Администратор', exact: true }),
    ).toBeDisabled()
    fireEvent.click(within(owner).getByRole('button', { name: 'Закрыть' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const editor = await editMember()
    fireEvent.click(within(editor).getByRole('checkbox', { name: 'Суперадминистратор' }))
    expect(
      within(editor).getByRole('checkbox', { name: 'Администратор', exact: true }),
    ).toBeChecked()
    expect(within(editor).getByRole('checkbox', { name: 'Модератор', exact: true })).toBeChecked()
    expect(within(editor).getByRole('checkbox', { name: 'Модератор', exact: true })).toBeDisabled()
    fireEvent.click(within(editor).getByRole('button', { name: 'Сохранить роли' }))
    expect(api.updateRoles).not.toHaveBeenCalled()
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Изменить роли пользователя Игрок?' })).getByRole(
        'button',
        { name: 'Подтвердить изменения' },
      ),
    )
    await waitFor(() =>
      expect(api.updateRoles).toHaveBeenCalledWith('member', ['moderator', 'admin', 'superadmin']),
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
  it('keeps authoritative saved roles visible when the refresh fails', async () => {
    const client = renderPage()
    const editor = await editMember()
    fireEvent.click(within(editor).getByRole('checkbox', { name: 'Модератор' }))
    api.getUsers.mockRejectedValueOnce(new Error('offline'))
    fireEvent.click(within(editor).getByRole('button', { name: 'Сохранить роли' }))
    expect(api.updateRoles).not.toHaveBeenCalled()
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Изменить роли пользователя Игрок?' })).getByRole(
        'button',
        { name: 'Подтвердить изменения' },
      ),
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await screen.findByText('Не удалось обновить список. Попробуйте ещё раз.')
    const row = screen.getByRole('row', { name: 'Игрок' })
    expect(within(row).getByText('Модератор')).toBeInTheDocument()
    expect(
      client.getQueriesData<UsersPage>({ queryKey: ['role-administration-users'] })[0]?.[1]
        ?.items[1]?.roles,
    ).toEqual(['viewer', 'moderator'])
  })
  it('preserves edits through cancellation, refetch and failed confirmation, and prevents duplicate submission', async () => {
    const client = renderPage()
    let editor = await editMember()
    fireEvent.click(within(editor).getByRole('checkbox', { name: 'Модератор' }))
    await client.invalidateQueries({ queryKey: ['role-administration-users'] })
    expect(within(editor).getByRole('checkbox', { name: 'Модератор' })).toBeChecked()
    fireEvent.click(within(editor).getByRole('button', { name: 'Сохранить роли' }))
    let confirmation = screen.getByRole('dialog', { name: 'Изменить роли пользователя Игрок?' })
    expect(api.updateRoles).not.toHaveBeenCalled()
    expect(
      within(confirmation).getByText('Текущие роли: Участник. Новые роли: Участник, Модератор.'),
    ).toBeInTheDocument()
    fireEvent.click(within(confirmation).getByRole('button', { name: 'Отмена' }))
    editor = await screen.findByRole('dialog', { name: 'Роли: Игрок' })
    expect(within(editor).getByRole('checkbox', { name: 'Модератор' })).toBeChecked()
    expect(api.updateRoles).not.toHaveBeenCalled()
    api.updateRoles.mockRejectedValueOnce(new Error('offline'))
    fireEvent.click(within(editor).getByRole('button', { name: 'Сохранить роли' }))
    confirmation = screen.getByRole('dialog', { name: 'Изменить роли пользователя Игрок?' })
    fireEvent.click(within(confirmation).getByRole('button', { name: 'Подтвердить изменения' }))
    await within(confirmation).findByRole('alert')
    let finish: (value: unknown) => void = () => {}
    api.updateRoles.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    fireEvent.click(within(confirmation).getByRole('button', { name: 'Подтвердить изменения' }))
    await waitFor(() =>
      expect(within(confirmation).getByRole('button', { name: 'Отмена' })).toBeDisabled(),
    )
    fireEvent.click(within(confirmation).getByRole('button', { name: 'Подтвердить изменения' }))
    expect(api.updateRoles).toHaveBeenCalledTimes(2)
    finish({ ...data.items[1], roles: ['viewer', 'moderator'] })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
  it('debounces search and sends the no-login filter to the server', async () => {
    renderPage()
    await screen.findByRole('button', { name: 'Управление ролями: Игрок' })
    fireEvent.change(screen.getByRole('textbox', { name: 'Имя или Twitch-логин' }), {
      target: { value: 'someone' },
    })
    await waitFor(() =>
      expect(api.getUsers).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: 'someone', page: 1 }),
      ),
    )
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Вход в приложение' }))
    fireEvent.click(await screen.findByRole('option', { name: 'Не входили', exact: true }))
    await waitFor(() =>
      expect(api.getUsers).toHaveBeenLastCalledWith(
        expect.objectContaining({ hasLoggedIn: false, page: 1 }),
      ),
    )
  })
})
