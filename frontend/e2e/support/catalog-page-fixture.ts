import type { GameQuestionCatalogItem } from '../../src/shared/api/contracts/index.ts'

export function catalogPageFixture(items: readonly GameQuestionCatalogItem[], url: string) {
  const query = new URL(url).searchParams
  const screenshots = query.get('format') === 'screenshot'
  const all = items.filter((item) => Boolean(item.image) === screenshots)
  const mapItems = new Map<
    string,
    {
      id: string
      code: string
      names: Record<string, string>
      locations: { id: string; code: string; names: Record<string, string> }[]
    }
  >()
  for (const item of all) {
    if (!item.image || !item.screenshotMapId || !item.screenshotLocationId) continue
    const map = mapItems.get(item.screenshotMapId) ?? {
      id: item.screenshotMapId,
      code: item.screenshotMapId,
      names: item.image.mapNames,
      locations: [],
    }
    const correct = item.options.find((option) => option.isCorrect)
    const names = correct ? item.image.optionNames[correct.optionId] : undefined
    if (names && !map.locations.some((location) => location.id === item.screenshotLocationId))
      map.locations.push({ id: item.screenshotLocationId, code: item.screenshotLocationId, names })
    mapItems.set(map.id, map)
  }
  const search = (query.get('search') ?? '').toLocaleLowerCase()
  const filtered = all.filter(
    (item) =>
      (!query.get('categoryId') || item.categoryId === query.get('categoryId')) &&
      (!query.get('mapId') || item.screenshotMapId === query.get('mapId')) &&
      (!query.get('locationId') || item.screenshotLocationId === query.get('locationId')) &&
      (!query.get('status') ||
        query.get('status') === 'all' ||
        item.isEnabled === (query.get('status') === 'enabled')) &&
      [
        item.text,
        item.categoryName,
        item.questionCode,
        ...item.options.map((option) => option.text),
        ...Object.values(item.image?.mapNames ?? {}),
        ...Object.values(item.image?.optionNames ?? {}).flatMap(Object.values),
      ].some((value) => value.toLocaleLowerCase().includes(search)),
  )
  const sort = query.get('sort')
  filtered.sort(
    (a, b) =>
      (sort === 'rewardAsc'
        ? a.reward - b.reward
        : sort === 'rewardDesc'
          ? b.reward - a.reward
          : sort === 'priorityAsc'
            ? (a.priority ?? 0) - (b.priority ?? 0)
            : sort === 'priorityDesc'
              ? (b.priority ?? 0) - (a.priority ?? 0)
              : sort === 'leastAsked'
                ? a.askedTotalCount - b.askedTotalCount
                : 0) ||
      a.categoryName.localeCompare(b.categoryName) ||
      a.text.localeCompare(b.text) ||
      a.questionId.localeCompare(b.questionId),
  )
  const pageSize = Number(query.get('pageSize') ?? 40)
  const page = Math.max(
    1,
    Math.min(Number(query.get('page') ?? 1), Math.ceil(filtered.length / pageSize)),
  )
  return {
    items: filtered.slice((page - 1) * pageSize, page * pageSize),
    totalCount: filtered.length,
    page,
    pageSize,
    maps: [...mapItems.values()],
  }
}
