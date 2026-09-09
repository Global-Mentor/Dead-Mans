import { queryOptions } from '@tanstack/react-query'
import { createApiClient, unwrapOpenApiData } from '../../../shared/api/client/openApiClient.ts'
import type {
  AuthRole,
  RoleAdministrationPage,
  RoleAdministrationUser,
} from '../../../shared/api/contracts/index.ts'
import type { paths } from '../../../shared/api/contracts/generated'

const roleAdministrationApiClient =
  createApiClient<Pick<paths, '/admin/users' | '/admin/users/{userId}/roles'>>()

export const roleAdministrationQueryKeys = {
  all: ['role-administration-users'] as const,
  page: (search: string, page: number, pageSize: number) =>
    [...roleAdministrationQueryKeys.all, search, page, pageSize] as const,
}

export function roleAdministrationUsersQueryOptions(
  search: string,
  page: number,
  pageSize: number,
) {
  return queryOptions({
    queryKey: roleAdministrationQueryKeys.page(search, page, pageSize),
    queryFn: (): Promise<RoleAdministrationPage> =>
      unwrapOpenApiData(
        roleAdministrationApiClient.GET('/admin/users', {
          params: {
            query: {
              ...(search ? { search } : {}),
              page,
              pageSize,
            },
          },
        }),
      ),
  })
}

export function updateRoleAdministrationUserRoles(
  userId: string,
  roles: AuthRole[],
): Promise<RoleAdministrationUser> {
  return unwrapOpenApiData(
    roleAdministrationApiClient.PUT('/admin/users/{userId}/roles', {
      params: { path: { userId } },
      body: { roles },
    }),
  )
}
