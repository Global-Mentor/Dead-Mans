import { Box, Stack, Typography, useMediaQuery } from '@mui/material'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { gameHistoryRoute, gameLeaderboardRoute } from '../../routes/app-routes.ts'
import {
  AppButton,
  AppLinkButton,
  AsyncSection,
  FormSelect,
  FormTextField,
  ItemCard,
  NativeDisclosure,
  PageShell,
  SectionCard,
  SectionHeader,
  SelectionRow,
  StatusBadge,
} from '../../shared/ui/index.ts'
import {
  modifierHistoryQueryOptions,
  modifierVersionGamesQueryOptions,
  modifierVersionQueryOptions,
  modifierVersionsQueryOptions,
} from './api/modifier-history-queries.ts'
import { ModifierVersionDetails } from './ui/ModifierVersionDetails.tsx'

type ArchiveFilter = 'active' | 'archived' | 'all'

export function ModifierHistoryPage() {
  const { t, i18n } = useTranslation()
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search.trim())
  const [filter, setFilter] = useState<ArchiveFilter>('all')
  const [pickerOpen, setPickerOpen] = useState(false)
  const isWide = useMediaQuery('(min-width: 1000px)')
  const modifierId = params.get('modifierId') ?? ''
  const revision = Number.parseInt(params.get('revision') ?? '0', 10) || 0
  const history = useInfiniteQuery(modifierHistoryQueryOptions(deferredSearch, filter))
  const versions = useInfiniteQuery(modifierVersionsQueryOptions(modifierId))
  const detail = useQuery(modifierVersionQueryOptions(modifierId, revision))
  const previousDetail = useQuery(modifierVersionQueryOptions(modifierId, revision - 1))
  const games = useInfiniteQuery(modifierVersionGamesQueryOptions(modifierId, revision))
  const historyItems = history.data?.pages.flatMap((page) => page.items) ?? []
  const versionItems = useMemo(
    () => versions.data?.pages.flatMap((page) => page.items) ?? [],
    [versions.data],
  )
  const gameItems = games.data?.pages.flatMap((page) => page.items) ?? []
  const revisionButtons = useRef<Array<HTMLButtonElement | null>>([])
  const selectedSummary = historyItems.find((item) => item.modifierId === modifierId)

  useEffect(() => {
    if (modifierId && revision === 0 && versionItems[0]) {
      setParams({ modifierId, revision: String(versionItems[0].revision) }, { replace: true })
    }
  }, [modifierId, revision, setParams, versionItems])

  const selectModifier = (id: string) => {
    setParams({ modifierId: id })
    setPickerOpen(false)
  }
  const selectRevision = (value: number) =>
    setParams({ modifierId, revision: String(value) }, { replace: true })

  return (
    <PageShell sx={{ maxWidth: 1800, width: '100%', mx: 'auto', p: 0 }}>
      <Typography component="h1" variant="h6" sx={{ mb: 1, fontWeight: 850 }}>
        {t('modifierHistory.title')}
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr)',
          gap: 1,
          alignItems: 'start',
          '@media (min-width: 1000px)': { gridTemplateColumns: '300px minmax(0, 1fr)' },
        }}
      >
        <SectionCard
          sx={{ minWidth: 0, p: 1, '@media (min-width: 1000px)': { position: 'sticky', top: 80 } }}
        >
          <NativeDisclosure
            open={isWide || pickerOpen || !modifierId}
            pinned={isWide}
            onExpandedChange={setPickerOpen}
            summary={
              <>
                {t('modifierHistory.search')}
                {detail.data ? ` · ${detail.data.name}` : ''}
              </>
            }
          >
            <Stack spacing={1} sx={{ mb: 1, mt: isWide ? 0 : 1 }}>
              <FormTextField
                label={t('modifierHistory.search')}
                value={search}
                onChange={(event) => setSearch(event.target.value.slice(0, 100))}
                inputProps={{ maxLength: 100 }}
                fullWidth
              />
              <FormSelect
                label={t('modifierHistory.filter')}
                value={filter}
                onChange={setFilter}
                options={(['all', 'active', 'archived'] as const).map((value) => ({
                  value,
                  label: t(`modifierHistory.${value}`),
                }))}
                sx={{ minWidth: 190 }}
              />
            </Stack>

            <AsyncSection
              isLoading={history.isLoading}
              isError={history.isError}
              hasData={history.data != null}
              isEmpty={historyItems.length === 0}
              loadingMessage={t('modifierHistory.loading')}
              errorMessage={t('modifierHistory.error')}
              emptyMessage={t('modifierHistory.empty')}
            >
              <Stack
                spacing={0.6}
                sx={{
                  maxHeight: 'max(280px, calc(100dvh - 300px))',
                  overflowY: 'auto',
                  overscrollBehaviorY: 'contain',
                }}
              >
                {historyItems.map((item) => (
                  <SelectionRow
                    key={item.modifierId}
                    selected={modifierId === item.modifierId}
                    onClick={() => selectModifier(item.modifierId)}
                  >
                    <Stack alignItems="flex-start">
                      <span>
                        {item.iconEmoji ? `${item.iconEmoji} ` : ''}
                        {item.name}
                      </span>
                      <Typography component="span" variant="caption">
                        {t('modifierHistory.revision', { revision: String(item.currentRevision) })}
                      </Typography>
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
          </NativeDisclosure>
        </SectionCard>

        {!modifierId ? (
          <SectionCard>
            <Typography>{t('modifierHistory.choose')}</Typography>
          </SectionCard>
        ) : (
          <Stack spacing={1} sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
            {selectedSummary ? (
              <SectionCard surface="inset" sx={{ p: 1.25 }}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  gap={1}
                  alignItems={{ sm: 'center' }}
                >
                  <Box sx={{ flex: 1 }}>
                    {detail.data?.name !== selectedSummary.name ? (
                      <Typography variant="subtitle2">
                        {selectedSummary.iconEmoji ? `${selectedSummary.iconEmoji} ` : ''}
                        {selectedSummary.name}
                      </Typography>
                    ) : null}
                    <Typography variant="body2" color="text.secondary">
                      {t('modifierHistory.currentState', {
                        revision: String(selectedSummary.currentRevision),
                        versions: String(selectedSummary.versionCount),
                        games: String(selectedSummary.gamesCount),
                      })}
                    </Typography>
                  </Box>
                  <StatusBadge
                    color={selectedSummary.isArchived ? 'warning' : 'success'}
                    label={t(
                      selectedSummary.isArchived
                        ? 'modifierHistory.archivedBadge'
                        : 'modifierHistory.activeBadge',
                    )}
                  />
                </Stack>
              </SectionCard>
            ) : null}
            <NativeDisclosure
              key={modifierId}
              surface="panel"
              summary={
                <>
                  {t('modifierHistory.revisions')}
                  {revision > 0
                    ? ` · ${t('modifierHistory.revision', { revision: String(revision) })}`
                    : ''}
                </>
              }
            >
              <AsyncSection
                isLoading={versions.isLoading}
                isError={versions.isError}
                hasData={versions.data != null}
                isEmpty={versionItems.length === 0}
                loadingMessage={t('modifierHistory.loading')}
                errorMessage={t('modifierHistory.error')}
                emptyMessage={t('modifierHistory.empty')}
              >
                <Stack
                  spacing={0.6}
                  aria-label={t('modifierHistory.revisions')}
                  sx={{ mt: 1, maxHeight: 260, overflowY: 'auto', overscrollBehaviorY: 'contain' }}
                >
                  {versionItems.map((item, index) => (
                    <SelectionRow
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
            </NativeDisclosure>

            <AsyncSection
              isLoading={revision === 0 || detail.isLoading}
              isError={detail.isError}
              hasData={detail.data != null}
              isEmpty={!detail.data}
              loadingMessage={t('modifierHistory.loading')}
              errorMessage={t('modifierHistory.error')}
              emptyMessage={t('modifierHistory.choose')}
            >
              {detail.data ? (
                <ModifierVersionDetails
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
                />
              ) : null}
            </AsyncSection>

            <SectionCard sx={{ p: 1.25 }}>
              <SectionHeader title={t('modifierHistory.relatedGames')} />
              <AsyncSection
                isLoading={revision === 0 || games.isLoading}
                isError={games.isError}
                hasData={games.data != null}
                isEmpty={gameItems.length === 0}
                loadingMessage={t('modifierHistory.loading')}
                errorMessage={t('modifierHistory.error')}
                emptyMessage={t('modifierHistory.noGames')}
              >
                <Stack spacing={1}>
                  {gameItems.map((game) => (
                    <ItemCard key={game.gameId}>
                      <AppLinkButton
                        to={
                          game.gameStatus.toLowerCase() === 'finished'
                            ? `${gameHistoryRoute.fullPath}?gameId=${game.gameId}`
                            : gameLeaderboardRoute.fullPath
                        }
                        tone="ghost"
                      >
                        {game.gameTitle}
                      </AppLinkButton>
                      <Stack direction="row" gap={0.75} flexWrap="wrap">
                        <StatusBadge
                          size="small"
                          label={t('modifierHistory.activations', {
                            count: game.successfulActivationsCount,
                          })}
                        />
                        <StatusBadge
                          size="small"
                          label={t('modifierHistory.cancelled', {
                            count: game.cancelledActivationsCount,
                          })}
                        />
                        <StatusBadge
                          size="small"
                          label={t('modifierHistory.results', { count: game.resultsCount })}
                        />
                        {game.isEmergencyDisabled ? (
                          <StatusBadge
                            size="small"
                            color="error"
                            label={t('modifierHistory.emergency')}
                          />
                        ) : null}
                      </Stack>
                    </ItemCard>
                  ))}
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
            </SectionCard>
          </Stack>
        )}
      </Box>
    </PageShell>
  )
}
