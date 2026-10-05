import { Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { components } from '../../../shared/api/contracts/generated'
import { DisclosureSection, ItemCard, StatusBadge } from '../../../shared/ui/index.ts'
import { formatDateTime } from '../model/game-history-view.ts'

export function HistoryModifierActivations({
  game,
}: {
  game: components['schemas']['GameHistoryGameDetailsDto']
}) {
  const { t, i18n } = useTranslation()
  if (!game.mainGame.modifierActivations.length) return null
  return (
    <DisclosureSection title={t('gameHistory.summary.modifierTimeline')}>
      <Stack gap={0.6}>
        {game.mainGame.modifierActivations.map((activation, index) => (
          <ItemCard key={activation.activationId} tone={index % 2 ? 'alternate' : 'default'}>
            <Stack
              direction="row"
              gap={1}
              justifyContent="space-between"
              alignItems="center"
              flexWrap="wrap"
            >
              <Typography variant="body2" fontWeight={700}>
                {activation.modifierName}
              </Typography>
              <StatusBadge
                density="compact"
                color={activation.status === 'cancelled' ? 'warning' : 'default'}
                label={t(
                  activation.status === 'cancelled'
                    ? 'gameHistory.modifierResults.cancelled'
                    : 'gameHistory.modifierResults.activations',
                )}
              />
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {t('gameHistory.modifierActivatedBy', {
                user: activation.activatedByDisplayName,
              })}{' '}
              · {formatDateTime(activation.activatedAtUtc, i18n.resolvedLanguage)}
            </Typography>
          </ItemCard>
        ))}
      </Stack>
    </DisclosureSection>
  )
}
