import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import i18n from '../../i18n.ts'
import {
  featureTranslationBundles,
  registerFeatureTranslations,
} from '../../locales/feature-locale-loader.ts'
import { renderWithAppProviders } from '../../test/render-with-app-providers.tsx'
import { RoleAdministrationPage } from './RoleAdministrationPage.tsx'

const apiMocks = vi.hoisted(() => ({
  getUsers: vi.fn(async () => ({
    items: [
      {
        userId: '10000000-0000-0000-0000-000000000001',
        twitchLogin: 'globalmentor',
        displayName: 'GlobalMentor',
        isActive: true,
        roles: ['viewer', 'admin', 'superadmin'] as const,
        isPermanentSuperAdmin: true,
      },
      {
        userId: '20000000-0000-0000-0000-000000000002',
        twitchLogin: 'member',
        displayName: 'Участник',
        isActive: true,
        roles: ['viewer'] as const,
        isPermanentSuperAdmin: false,
      },
    ],
    page: 1,
    pageSize: 25,
    totalCount: 2,
  })),
  updateRoles: vi.fn(async (_userId: string, roles: string[]) => ({
    userId: '20000000-0000-0000-0000-000000000002',
    twitchLogin: 'member',
    displayName: 'Участник',
    isActive: true,
    roles: ['viewer', ...roles],
    isPermanentSuperAdmin: false,
  })),
}))

vi.mock('./api/role-administration-api.ts', async () => {
  const { queryOptions } = await import('@tanstack/react-query')
  return {
    roleAdministrationQueryKeys: { all: ['role-administration-users'] as const },
    roleAdministrationUsersQueryOptions: () =>
      queryOptions({
        queryKey: ['role-administration-users'],
        queryFn: apiMocks.getUsers,
      }),
    updateRoleAdministrationUserRoles: apiMocks.updateRoles,
  }
})

beforeAll(async () => {
  await i18n.changeLanguage('ru')
  await registerFeatureTranslations(i18n, [featureTranslationBundles.roleAdministration])
})

describe('RoleAdministrationPage', () => {
  it('protects the permanent owner and grants inherited admin with superadmin', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    renderWithAppProviders(
      <QueryClientProvider client={queryClient}>
        <RoleAdministrationPage />
      </QueryClientProvider>,
    )

    const ownerRow = (await screen.findByText('GlobalMentor')).closest('tr')
    expect(ownerRow).not.toBeNull()
    expect(within(ownerRow!).getByRole('checkbox', { name: 'Суперадминистратор' })).toBeDisabled()
    expect(within(ownerRow!).getByRole('checkbox', { name: 'Администратор' })).toBeDisabled()

    const memberRow = screen.getByText('Участник').closest('tr')
    expect(memberRow).not.toBeNull()
    fireEvent.click(within(memberRow!).getByRole('checkbox', { name: 'Суперадминистратор' }))
    expect(within(memberRow!).getByRole('checkbox', { name: 'Администратор' })).toBeChecked()
    fireEvent.click(within(memberRow!).getByRole('button', { name: 'Сохранить роли' }))

    await waitFor(() =>
      expect(apiMocks.updateRoles).toHaveBeenCalledWith('20000000-0000-0000-0000-000000000002', [
        'admin',
        'superadmin',
      ]),
    )
  })
})
