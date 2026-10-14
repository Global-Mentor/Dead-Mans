import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { createApiClient, unwrapOpenApiData } from '../../../shared/api/client/openApiClient.ts'
import type {
  AuthRole,
  RoleAdministrationPage,
  RoleAdministrationUser,
} from '../../../shared/api/contracts/index.ts'
import type { paths } from '../../../shared/api/contracts/generated'

const client =
  createApiClient<
    Pick<paths, '/admin/users' | '/admin/users/{userId}/roles' | '/admin/users/{userId}/access'>
  >()
export type UserFilters = NonNullable<paths['/admin/users']['get']['parameters']['query']>
export const roleAdministrationQueryKeys = {
  all: ['role-administration-users'] as const,
  page: (filters: UserFilters) => [...roleAdministrationQueryKeys.all, filters] as const,
}
export function roleAdministrationUsersQueryOptions(filters: UserFilters) {
  return queryOptions({
    queryKey: roleAdministrationQueryKeys.page(filters),
    queryFn: ({ signal }): Promise<RoleAdministrationPage> =>
      unwrapOpenApiData(client.GET('/admin/users', { params: { query: filters }, signal })),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  })
}
export function updateRoleAdministrationUserAccess(
  userId: string,
  isActive: boolean,
): Promise<RoleAdministrationUser> {
  return unwrapOpenApiData(
    client.PUT('/admin/users/{userId}/access', {
      params: { path: { userId } },
      body: { isActive },
    }),
  )
}
export function updateRoleAdministrationUserRoles(
  userId: string,
  roles: AuthRole[],
): Promise<RoleAdministrationUser> {
  return unwrapOpenApiData(
    client.PUT('/admin/users/{userId}/roles', {
      params: { path: { userId } },
      body: { roles },
    }),
  )
}
