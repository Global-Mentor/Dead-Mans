import { Box, Stack, Typography, useMediaQuery } from '@mui/material'
import type { ReactNode } from 'react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import type { ContentTabsSelection } from '../../../shared/ui/index.ts'
import type { ModifierVersionDetail } from '../../../shared/api/contracts/index.ts'
import { ModifierBehaviorDetails } from './ModifierBehaviorDetails.tsx'
import { RoundBriefingPanel } from '../../../shared/game-ui/index.ts'
import {
  ContentTabs,
  DetailBlock,
  Metric,
  ItemCard,
  NativeDisclosure,
  StatusBadge,
} from '../../../shared/ui/index.ts'

export function ModifierVersionDetails({
  tabs,
  item,
  previous,
  previousState,
  locale,
  overview,
  revisions,
  games,
}: {
  tabs: ContentTabsSelection
  item: ModifierVersionDetail
  previous?: ModifierVersionDetail | undefined
  previousState?: 'loading' | 'error' | undefined
  locale?: string | undefined
  overview?: ReactNode
  revisions: ReactNode
  games: ReactNode
}) {
  const { t } = useTranslation()
  const phone = useMediaQuery('(max-width: 599px)')
  const panel = (title: string, content: ReactNode) => (
    <RoundBriefingPanel
      sx={{ flex: 1, minHeight: 0 }}
      header={
        <Typography component="h3" variant="h6" textAlign="center">
          {title}
        </Typography>
      }
    >
      <Box
        role="region"
        aria-label={title}
        tabIndex={0}
        sx={{
          minHeight: 0,
          overflowY: 'auto',
          overscrollBehaviorY: 'contain',
          scrollbarGutter: 'stable',
          containerType: 'inline-size',
        }}
      >
        {content}
      </Box>
    </RoundBriefingPanel>
  )
  return (
    <Stack gap={1} sx={{ flex: 1, minHeight: 0, overflowWrap: 'anywhere' }}>
      <RoundBriefingPanel sx={{ flexShrink: 0, p: 1.5 }}>
        <Typography component="h2" variant="h6" fontWeight={700} textAlign="center">
          {item.iconEmoji ? item.iconEmoji + ' ' : ''}
          {item.name}
        </Typography>
        <Stack direction="row" gap={0.75} flexWrap="wrap" justifyContent="center" sx={{ mt: 1 }}>
          <StatusBadge
            density="compact"
            label={t('modifierHistory.revision', { revision: String(item.revision) })}
          />
          {item.isCurrent ? (
            <StatusBadge density="compact" color="success" label={t('modifierHistory.current')} />
          ) : null}
          {item.isArchived ? (
            <StatusBadge
              density="compact"
              color="warning"
              label={t('modifierHistory.archivedBadge')}
            />
          ) : null}
        </Stack>
      </RoundBriefingPanel>
      <ContentTabs
        {...tabs}
        layout="fill"
        appearance="framed"
        variant={phone ? 'scrollable' : 'fullWidth'}
        label={t('modifierHistory.title')}
        items={[
          {
            id: 'configuration',
            label: t('modifierHistory.configurationTab'),
            content: panel(
              t('modifierHistory.fullConfiguration'),
              <Stack gap={1.25}>
                {overview}
                <ModifierConfigurationReadOnly item={item} />
              </Stack>,
            ),
          },
          {
            id: 'revisions',
            label: t('modifierHistory.revisions'),
            content: panel(t('modifierHistory.revisions'), revisions),
          },
          {
            id: 'changes',
            label: t('modifierHistory.changesTab'),
            content: panel(
              t('modifierHistory.changedFields'),
              <Stack gap={1}>
                <DetailBlock>
                  <Stack
                    direction="row"
                    gap={1}
                    flexWrap="wrap"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <StatusBadge
                      density="compact"
                      label={t(`modifierHistory.changeTypes.${item.changeType}`)}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {t('modifierHistory.by', {
                        author: item.createdByDisplayName,
                        date: new Intl.DateTimeFormat(locale).format(new Date(item.createdAtUtc)),
                      })}
                    </Typography>
                  </Stack>
                  {item.changeNote ? (
                    <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                      {item.changeNote}
                    </Typography>
                  ) : null}
                </DetailBlock>
                {item.changedFields
                  .filter((field) => field !== 'normalizedTags' && field !== 'activationCommand')
                  .map((field) => {
                    const title = t('modifierHistory.fields.' + field, { defaultValue: field })
                    const content = (
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(0, 1fr)',
                          '@container (min-width: 600px)': {
                            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                          },
                          gap: 1,
                        }}
                      >
                        <DetailBlock
                          role="group"
                          aria-label={t('modifierHistory.before') + ': ' + title}
                        >
                          <Typography variant="caption" fontWeight={700} color="text.secondary">
                            {t('modifierHistory.before')}
                          </Typography>
                          <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                            {previousState
                              ? t(`modifierHistory.${previousState}`)
                              : formatDiffValue(previous, field, t, item)}
                          </Typography>
                        </DetailBlock>
                        <DetailBlock
                          role="group"
                          aria-label={t('modifierHistory.after') + ': ' + title}
                        >
                          <Typography variant="caption" fontWeight={700} color="primary.light">
                            {t('modifierHistory.after')}
                          </Typography>
                          <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                            {formatDiffValue(item, field, t, previous)}
                          </Typography>
                        </DetailBlock>
                      </Box>
                    )
                    return field === 'behaviorV2' ? (
                      <ItemCard key={field}>
                        <NativeDisclosure
                          summary={
                            <Typography
                              component="span"
                              variant="body2"
                              fontWeight={700}
                              color="text.primary"
                            >
                              {title}
                            </Typography>
                          }
                          indicator="inline-chevron"
                          density="compact"
                        >
                          <Box sx={{ mt: 1 }}>{content}</Box>
                        </NativeDisclosure>
                      </ItemCard>
                    ) : (
                      <ItemCard key={field}>
                        <Typography component="h4" variant="body2" fontWeight={700} sx={{ mb: 1 }}>
                          {title}
                        </Typography>
                        {content}
                      </ItemCard>
                    )
                  })}
              </Stack>,
            ),
          },
          {
            id: 'games',
            label: t('modifierHistory.relatedGames'),
            content: panel(t('modifierHistory.relatedGames'), games),
          },
        ]}
      />
    </Stack>
  )
}

function ModifierConfigurationReadOnly({ item }: { item: ModifierVersionDetail }) {
  const { t } = useTranslation()
  const fields: Array<readonly [string, string]> = [
    [t('modifierHistory.category'), t(`common.modifiers.categories.${item.category}`)],
    [t('modifierHistory.cost'), String(item.activationCost)],
    [
      t('modifierHistory.limit'),
      item.activationLimit.count == null
        ? t('modifierHistory.unlimited')
        : String(item.activationLimit.count),
    ],
  ]
  return (
    <Stack gap={1.25}>
      <DetailBlock>
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
          {item.description}
        </Typography>
      </DetailBlock>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' },
          columnGap: 3,
        }}
      >
        {fields.map(([label, value]) => (
          <Metric
            key={label}
            label={label}
            value={value}
            appearance="row"
            density="compact"
            emphasis="label"
          />
        ))}
      </Box>
      <DetailBlock>
        <Typography component="h4" variant="body2" fontWeight={700}>
          {t('modifierHistory.conflicts')}
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          {item.conflicts.map((conflict) => conflict.name).join(', ') ||
            t('modifierHistory.noConflicts')}
        </Typography>
      </DetailBlock>
      <DetailBlock>
        <NativeDisclosure
          indicator="inline-chevron"
          density="compact"
          summary={
            <Typography component="span" variant="body2" fontWeight={700} color="text.primary">
              {t('modifierHistory.behavior')}
            </Typography>
          }
        >
          <ModifierBehaviorDetails behavior={item.behaviorV2} />
        </NativeDisclosure>
      </DetailBlock>
    </Stack>
  )
}

function flattenObject(value: unknown, prefix = ''): Array<[string, string]> {
  if (value === null || value === undefined) return [[prefix, '-']]
  if (Array.isArray(value)) return [[prefix, value.map(String).join(', ') || '-']]
  if (typeof value !== 'object') return [[prefix, String(value)]]

  return Object.entries(value as Record<string, unknown>).flatMap(([key, nested]) =>
    flattenObject(nested, prefix ? `${prefix}.${key}` : key),
  )
}

function behaviorFieldLabel(key: string, t: TFunction) {
  const field =
    key === 'formulaReference'
      ? 'formulaReference.code'
      : key === 'resolution'
        ? 'resolution.type'
        : key
  return t('modifierHistory.behaviorFields.' + field, { defaultValue: key })
}

function formatDiffValue(
  item: ModifierVersionDetail | undefined,
  field: string,
  t: TFunction,
  counterpart?: ModifierVersionDetail,
) {
  if (!item) return '-'

  if (field === 'behaviorV2') {
    const own = new Map(flattenObject(item.behaviorV2))
    const other = new Map(counterpart ? flattenObject(counterpart.behaviorV2) : [])
    return (
      [...new Set([...own.keys(), ...other.keys()])]
        .filter((key) => key !== 'rule' && own.get(key) !== other.get(key))
        .map((key) => behaviorFieldLabel(key, t) + ': ' + (own.get(key) ?? '-'))
        .join('\n') || '-'
    )
  }

  const values: Record<string, unknown> = {
    name: item.name,
    description: item.description,
    category: item.category,
    iconEmoji: item.iconEmoji,
    activationCost: item.activationCost,
    activationLimit: item.activationLimit.count ?? t('modifierHistory.unlimited'),
    compatibility:
      item.conflicts.map((conflict) => conflict.name).join(', ') ||
      t('modifierHistory.noConflicts'),
    created: t('modifierHistory.createdValue'),
  }
  const value = values[field]

  return value === null || value === undefined || value === '' ? '-' : String(value)
}
