import { Box, Stack, Typography } from '@mui/material'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { urlTabSelection } from '../../shared/routing/url-tab-selection.ts'
import { useUrlSearchParams } from '../../shared/routing/use-url-search-params.ts'
import {
  AppButton,
  AsyncSection,
  FormSelect,
  FormTextField,
  Metric,
  PageShell,
  SelectionRow,
  StatusBadge,
} from '../../shared/ui/index.ts'
import {
  modifierHistoryQueryOptions,
  modifierVersionGamesQueryOptions,
  modifierVersionQueryOptions,
  modifierVersionsQueryOptions,
} from './api/modifier-history-queries.ts'
import { HistoryWorkspace, RoundBriefingPanel } from '../../shared/game-ui/index.ts'
import { ModifierRelatedGames } from './ui/ModifierRelatedGames.tsx'
import { ModifierVersionDetails } from './ui/ModifierVersionDetails.tsx'

type ArchiveFilter = 'active' | 'archived' | 'all'

export function ModifierHistoryPage() {
  const { t, i18n } = useTranslation()
  const [params, setParams] = useUrlSearchParams()
  const search = params.get('q') ?? ''
  const deferredSearch = useDeferredValue(search.trim())
  const requestedFilter = params.get('archive')
  const filter: ArchiveFilter =
    requestedFilter === 'active' || requestedFilter === 'archived' ? requestedFilter : 'all'
  const [pickerOpen, setPickerOpen] = useState(false)
  const modifierId = params.get('modifierId') ?? ''
  const revision = Number.parseInt(params.get('revision') ?? '0', 10) || 0
  const history = useInfiniteQuery(modifierHistoryQueryOptions(deferredSearch, filter))
  const versions = useInfiniteQuery(modifierVersionsQueryOptions(modifierId))
  const detail = useQuery(modifierVersionQueryOptions(modifierId, revision))
  const previousDetail = useQuery(modifierVersionQueryOptions(modifierId, revision - 1))
  const games = useInfiniteQuery(modifierVersionGamesQueryOptions(modifierId, revision))
  const historyItems = useMemo(
    () => history.data?.pages.flatMap((page) => page.items) ?? [],
    [history.data],
  )
  const versionItems = useMemo(
    () => versions.data?.pages.flatMap((page) => page.items) ?? [],
    [versions.data],
  )
  const gameItems = games.data?.pages.flatMap((page) => page.items) ?? []
  const revisionButtons = useRef<Array<HTMLButtonElement | null>>([])
  const selectedSummary = historyItems.find((item) => item.modifierId === modifierId)

  useEffect(() => {
    if (!modifierId && historyItems[0]) {
      const firstModifierId = historyItems[0].modifierId
      setParams(
        (current) => {
          const next = new URLSearchParams(current)
          next.set('modifierId', firstModifierId)
          return next
        },
        { replace: true },
      )
    }
  }, [modifierId, historyItems, setParams])

  useEffect(() => {
    if (modifierId && revision === 0 && versionItems[0]) {
      const latestRevision = versionItems[0].revision
      setParams(
        (current) => {
          const next = new URLSearchParams(current)
          next.set('revision', String(latestRevision))
          return next
        },
        { replace: true },
      )
    }
  }, [modifierId, revision, setParams, versionItems])

  const selectModifier = (id: string, latestRevision: number) => {
    setParams((current) => {
      const next = new URLSearchParams(current)
      next.set('modifierId', id)
      next.set('revision', String(latestRevision))
      return next
    })
    setPickerOpen(false)
  }
  const selectRevision = (value: number) =>
    setParams((current) => {
      const next = new URLSearchParams(current)
      next.set('revision', String(value))
      return next
    })

  return (
    <PageShell
      sx={{
        maxWidth: 1800,
        width: '100%',
        mx: 'auto',
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <HistoryWorkspace
        title={t('modifierHistory.title')}
        selectedLabel={detail.data?.name}
        hasSelection={Boolean(modifierId)}
        pickerOpen={pickerOpen}
        onPickerOpenChange={setPickerOpen}
        tools={
          <Stack gap={1}>
            <FormTextField
              density="compact"
              label={t('modifierHistory.search')}
              value={search}
              onChange={(event) => {
                const value = event.target.value.slice(0, 100)
                setParams(
                  (current) => {
                    const next = new URLSearchParams(current)
                    if (value) next.set('q', value)
                    else next.delete('q')
                    return next
                  },
                  { replace: true },
                )
              }}
              inputProps={{ maxLength: 100 }}
              fullWidth
            />
            <FormSelect
              density="compact"
              label={t('modifierHistory.filter')}
              value={filter}
              onChange={(value) =>
                setParams(
                  (current) => {
                    const next = new URLSearchParams(current)
                    next.set('archive', value)
                    return next
                  },
                  { replace: true },
                )
              }
              options={(['all', 'active', 'archived'] as const).map((value) => ({
                value,
                label: t(`modifierHistory.${value}`),
              }))}
            />
          </Stack>
        }
        records={
          <AsyncSection
            isLoading={history.isLoading}
            isError={history.isError}
            hasData={history.data != null}
            isEmpty={!historyItems.length}
            loadingMessage={t('modifierHistory.loading')}
            errorMessage={t('modifierHistory.error')}
            emptyMessage={t('modifierHistory.empty')}
            retryAction={
              <AppButton tone="ghost" onClick={() => void history.refetch()}>
                {t('common.actions.retry')}
              </AppButton>
            }
          >
            <Stack gap={0.6}>
              {historyItems.map((item) => (
                <SelectionRow
                  selectionAppearance="outline"
                  density="compact"
                  key={item.modifierId}
                  selected={modifierId === item.modifierId}
                  onClick={() => selectModifier(item.modifierId, item.currentRevision)}
                >
                  <Stack sx={{ width: '100%', minWidth: 0 }}>
                    <Typography component="span" variant="body2" fontWeight={700} noWrap>
                      {item.iconEmoji ? item.iconEmoji + ' ' : ''}
                      {item.name}
                    </Typography>
                    <Stack direction="row" gap={0.75} alignItems="center" flexWrap="wrap">
                      <Typography component="span" variant="caption" color="text.secondary">
                        {t('modifierHistory.revision', { revision: String(item.currentRevision) })}
                      </Typography>
                      {item.isArchived ? (
                        <StatusBadge density="tight" label={t('modifierHistory.archivedBadge')} />
                      ) : null}
                    </Stack>
                  </Stack>
                </SelectionRow>
              ))}
              {history.hasNextPage ? (
                <AppButton
                  tone="secondary"
                  disabled={history.isFetchingNextPage}
                  onClick={() => history.fetchNextPage()}
                >
                  {t('modifierHistory.loadMore')}
                </AppButton>
              ) : null}
            </Stack>
          </AsyncSection>
        }
      >
        {!modifierId ? (
          <RoundBriefingPanel sx={{ flex: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {t('modifierHistory.choose')}
            </Typography>
          </RoundBriefingPanel>
        ) : (
          <AsyncSection
            isLoading={revision === 0 ? versions.isLoading : detail.isLoading}
            isError={revision === 0 ? versions.isError : detail.isError}
            hasData={detail.data != null}
            isEmpty={!detail.data}
            loadingMessage={t('modifierHistory.loading')}
            errorMessage={t('modifierHistory.error')}
            emptyMessage={t('modifierHistory.choose')}
            retryAction={
              <AppButton
                tone="ghost"
                onClick={() => {
                  if (revision === 0) void versions.refetch()
                  else void detail.refetch()
                }}
              >
                {t('common.actions.retry')}
              </AppButton>
            }
          >
            {detail.data ? (
              <ModifierVersionDetails
                key={modifierId}
                tabs={urlTabSelection(params, setParams, 'configuration')}
                item={detail.data}
                previous={previousDetail.data}
                previousState={
                  revision > 1 && !previousDetail.data
                    ? previousDetail.isError
                      ? 'error'
                      : 'loading'
                    : undefined
                }
                locale={i18n.resolvedLanguage}
                overview={
                  selectedSummary ? (
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                        gap: 1.5,
                      }}
                    >
                      <Metric
                        appearance="summary"
                        density="compact"
                        emphasis="label"
                        label={t('modifierHistory.latestRevision')}
                        value={selectedSummary.currentRevision}
                      />
                      <Metric
                        appearance="summary"
                        density="compact"
                        emphasis="label"
                        label={t('modifierHistory.revisionCount')}
                        value={selectedSummary.versionCount}
                      />
                      <Metric
                        appearance="summary"
                        density="compact"
                        emphasis="label"
                        label={t('modifierHistory.gameCount')}
                        value={selectedSummary.gamesCount}
                      />
                    </Box>
                  ) : null
                }
                revisions={
                  <AsyncSection
                    isLoading={versions.isLoading}
                    isError={versions.isError}
                    retryAction={
                      <AppButton tone="ghost" onClick={() => void versions.refetch()}>
                        {t('common.actions.retry')}
                      </AppButton>
                    }
                    hasData={versions.data != null}
                    isEmpty={versionItems.length === 0}
                    loadingMessage={t('modifierHistory.loading')}
                    errorMessage={t('modifierHistory.error')}
                    emptyMessage={t('modifierHistory.empty')}
                  >
                    <Stack
                      spacing={0.6}
                      aria-label={t('modifierHistory.revisions')}
                      sx={{ minWidth: 0 }}
                    >
                      {versionItems.map((item, index) => (
                        <SelectionRow
                          selectionAppearance="outline"
                          key={item.versionId}
                          ref={(node) => {
                            revisionButtons.current[index] = node
                          }}
                          selected={revision === item.revision}
                          onClick={() => selectRevision(item.revision)}
                          onKeyDown={(event) => {
                            const last = versionItems.length - 1
                            const nextIndex =
                              event.key === 'ArrowDown' || event.key === 'ArrowRight'
                                ? Math.min(index + 1, last)
                                : event.key === 'ArrowUp' || event.key === 'ArrowLeft'
                                  ? Math.max(index - 1, 0)
                                  : event.key === 'Home'
                                    ? 0
                                    : event.key === 'End'
                                      ? last
                                      : index
                            if (nextIndex !== index) {
                              event.preventDefault()
                              revisionButtons.current[nextIndex]?.focus()
                            }
                          }}
                        >
                          <Stack alignItems="flex-start" spacing={0.25}>
                            <strong>
                              {t('modifierHistory.revision', { revision: String(item.revision) })}
                            </strong>
                            <Typography component="span" variant="caption">
                              {t(`modifierHistory.changeTypes.${item.changeType}`)} ·{' '}
                              {t('modifierHistory.by', {
                                author: item.createdByDisplayName,
                                date: new Intl.DateTimeFormat(i18n.resolvedLanguage).format(
                                  new Date(item.createdAtUtc),
                                ),
                              })}
                            </Typography>
                            {item.changeNote ? (
                              <Typography component="span" variant="caption">
                                {item.changeNote}
                              </Typography>
                            ) : null}
                          </Stack>
                        </SelectionRow>
                      ))}
                      {versions.hasNextPage ? (
                        <AppButton
                          size="small"
                          tone="secondary"
                          disabled={versions.isFetchingNextPage}
                          onClick={() => versions.fetchNextPage()}
                        >
                          {t('modifierHistory.loadMore')}
                        </AppButton>
                      ) : null}
                    </Stack>
                  </AsyncSection>
                }
                games={
                  <AsyncSection
                    isLoading={revision === 0 || games.isLoading}
                    isError={games.isError}
                    retryAction={
                      <AppButton tone="ghost" onClick={() => void games.refetch()}>
                        {t('common.actions.retry')}
                      </AppButton>
                    }
                    hasData={games.data != null}
                    isEmpty={gameItems.length === 0}
                    loadingMessage={t('modifierHistory.loading')}
                    errorMessage={t('modifierHistory.error')}
                    emptyMessage={t('modifierHistory.noGames')}
                  >
                    <Stack spacing={1}>
                      <ModifierRelatedGames items={gameItems} />
                      {games.hasNextPage ? (
                        <AppButton
                          tone="secondary"
                          disabled={games.isFetchingNextPage}
                          onClick={() => games.fetchNextPage()}
                        >
                          {t('modifierHistory.loadMore')}
                        </AppButton>
                      ) : null}
                    </Stack>
                  </AsyncSection>
                }
              />
            ) : null}
          </AsyncSection>
        )}
      </HistoryWorkspace>
    </PageShell>
  )
}
