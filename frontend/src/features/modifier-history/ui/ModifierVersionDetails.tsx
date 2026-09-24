import { Box, Stack, Typography } from '@mui/material'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import type { ModifierVersionDetail } from '../../../shared/api/contracts/index.ts'
import {
  ItemCard,
  NativeDisclosure,
  SectionCard,
  SectionDivider,
  StatusBadge,
} from '../../../shared/ui/index.ts'
export function ModifierVersionDetails({
  item,
  previous,
  previousState,
  locale,
}: {
  item: ModifierVersionDetail
  previous?: ModifierVersionDetail | undefined
  previousState?: 'loading' | 'error' | undefined
  locale?: string | undefined
}) {
  const { t } = useTranslation()

  return (
    <SectionCard sx={{ p: 1.25, overflowWrap: 'anywhere', containerType: 'inline-size' }}>
      <Stack spacing={1.5}>
        <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
          <Typography component="h2" variant="h5" sx={{ fontWeight: 850 }}>
            {item.iconEmoji ? `${item.iconEmoji} ` : ''}
            {item.name}
          </Typography>
          {item.isCurrent ? (
            <StatusBadge color="success" label={t('modifierHistory.current')} />
          ) : null}
          {item.isArchived ? (
            <StatusBadge color="warning" label={t('modifierHistory.archivedBadge')} />
          ) : null}
          <StatusBadge label={t(`modifierHistory.changeTypes.${item.changeType}`)} />
          <StatusBadge label={t('modifierHistory.revision', { revision: String(item.revision) })} />
        </Stack>
        <Typography color="text.secondary">
          {t('modifierHistory.by', {
            author: item.createdByDisplayName,
            date: new Intl.DateTimeFormat(locale).format(new Date(item.createdAtUtc)),
          })}
        </Typography>
        {item.changeNote ? (
          <Typography sx={{ whiteSpace: 'pre-wrap' }}>{item.changeNote}</Typography>
        ) : null}
        <Box>
          <Typography variant="subtitle2">{t('modifierHistory.changedFields')}</Typography>
          <Stack spacing={0.75} sx={{ mt: 0.75 }}>
            {item.changedFields.map((field) => (
              <ItemCard
                key={field}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr)',
                  '@container (min-width: 650px)': {
                    gridTemplateColumns: '150px minmax(0, 1fr) minmax(0, 1fr)',
                  },
                  gap: 0.75,
                }}
              >
                <Typography variant="body2" fontWeight={700}>
                  {t(`modifierHistory.fields.${field}`, { defaultValue: field })}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ overflowWrap: 'anywhere' }}
                >
                  {t('modifierHistory.before')}:{' '}
                  {previousState
                    ? t(`modifierHistory.${previousState}`)
                    : formatDiffValue(previous, field, t)}
                </Typography>
                <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
                  {t('modifierHistory.after')}: {formatDiffValue(item, field, t)}
                </Typography>
              </ItemCard>
            ))}
          </Stack>
        </Box>
        <SectionDivider />
        <Typography variant="h6">{t('modifierHistory.fullConfiguration')}</Typography>
        <ModifierConfigurationReadOnly item={item} />
      </Stack>
    </SectionCard>
  )
}

function ModifierConfigurationReadOnly({ item }: { item: ModifierVersionDetail }) {
  const { t } = useTranslation()
  const behaviorRows = flattenObject(item.behaviorV2)

  return (
    <Stack spacing={1.25}>
      <Typography sx={{ whiteSpace: 'pre-wrap' }}>{item.description}</Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 1,
        }}
      >
        {[
          [t('modifierHistory.category'), t(`common.modifiers.categories.${item.category}`)],
          [t('modifierHistory.cost'), String(item.activationCost)],
          [
            t('modifierHistory.limit'),
            item.activationLimit.count == null
              ? t('modifierHistory.unlimited')
              : String(item.activationLimit.count),
          ],
          [t('modifierHistory.command'), item.activationCommand ?? '-'],
        ].map(([label, value]) => (
          <Box key={label}>
            <Typography variant="caption" color="text.secondary">
              {label}
            </Typography>
            <Typography sx={{ overflowWrap: 'anywhere' }}>{value}</Typography>
          </Box>
        ))}
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1 }}>
        <Box>
          <Typography variant="subtitle2">{t('modifierHistory.tags')}</Typography>
          <Typography>{item.normalizedTags.join(', ') || '-'}</Typography>
        </Box>
        <Box>
          <Typography variant="subtitle2">{t('modifierHistory.conflicts')}</Typography>
          <Typography>
            {item.conflicts.map((conflict) => conflict.name).join(', ') ||
              t('modifierHistory.noConflicts')}
          </Typography>
        </Box>
      </Box>
      <NativeDisclosure summary={<>{t('modifierHistory.behavior')}</>}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr)',
            '@container (min-width: 650px)': { gridTemplateColumns: '220px minmax(0, 1fr)' },
            gap: 0.75,
            mt: 0.75,
          }}
        >
          {behaviorRows.map(([key, value]) => (
            <Box key={key} sx={{ display: 'contents' }}>
              <Typography variant="body2" color="text.secondary">
                {t(`modifierHistory.behaviorFields.${key}`, { defaultValue: key })}
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                {value}
              </Typography>
            </Box>
          ))}
        </Box>
      </NativeDisclosure>
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

function formatDiffValue(item: ModifierVersionDetail | undefined, field: string, t: TFunction) {
  if (!item) return '-'

  const values: Record<string, unknown> = {
    name: item.name,
    description: item.description,
    category: item.category,
    iconEmoji: item.iconEmoji,
    activationCommand: item.activationCommand,
    activationCost: item.activationCost,
    activationLimit: item.activationLimit.count ?? t('modifierHistory.unlimited'),
    normalizedTags: item.normalizedTags.join(', '),
    compatibility:
      item.conflicts.map((conflict) => conflict.name).join(', ') ||
      t('modifierHistory.noConflicts'),
    behaviorV2: flattenObject(item.behaviorV2)
      .map(([key, value]) => `${key}: ${value}`)
      .join(' · '),
    created: t('modifierHistory.createdValue'),
  }
  const value = values[field]

  return value === null || value === undefined || value === '' ? '-' : String(value)
}
