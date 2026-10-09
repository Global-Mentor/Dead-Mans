import { queryOptions } from '@tanstack/react-query'
import { gameModifierCatalogQueryOptions } from '../../game-modifiers/index.ts'
import { fetchArchivedModifierCatalog } from './catalog-modifiers-api.ts'

export const archivedModifierCatalogQueryOptions = queryOptions({
  queryKey: [...gameModifierCatalogQueryOptions.queryKey, 'archived'],
  queryFn: fetchArchivedModifierCatalog,
})
