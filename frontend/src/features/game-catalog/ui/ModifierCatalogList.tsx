import { Box, Stack, Typography } from '@mui/material'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameModifierDefinition } from '../../../shared/api/contracts/index.ts'
import { ModifierIconTile } from '../../../shared/game-ui/index.ts'
import { ListPanel, SelectionRow, StatusBadge } from '../../../shared/ui/index.ts'

export function ModifierCatalogList({
  modifiers,
  selectedId,
  totalCount,
  onSelect,
}: {
  modifiers: readonly GameModifierDefinition[]
  selectedId: string | null
  totalCount: number
  onSelect: (modifier: GameModifierDefinition) => void
}) {
  const { t, i18n } = useTranslation()
  const prefix = useId()
  const number = (value: number) => new Intl.NumberFormat(i18n.resolvedLanguage).format(value)
  return (
    <ListPanel
      title={t('common.entities.modifiers')}
      data-testid="modifier-catalog-list"
      summary={
        <Typography variant="body2" color="text.secondary" role="status">
          {t('gameCatalog.modifiers.catalog.results', {
            count: number(modifiers.length),
            total: number(totalCount),
          })}
        </Typography>
      }
      tools={
        <Typography variant="body2" color="text.secondary">
          {t('gameCatalog.modifiers.catalog.selectHint')}
        </Typography>
      }
      sx={{ maxHeight: { lg: 'min(800px, 72dvh)' } }}
    >
      <Stack component="ul" gap={0.75} sx={{ m: 0, p: 0 }}>
        {modifiers.map((modifier, index) => (
          <Box component="li" key={modifier.id} sx={{ listStyle: 'none', minWidth: 0 }}>
            <SelectionRow
              selected={selectedId === modifier.id}
              tone={index % 2 === 1 ? 'alternate' : 'default'}
              density="compact"
              aria-label={modifier.name}
              aria-describedby={`${prefix}-${modifier.id}-meta ${prefix}-${modifier.id}-cost`}
              onClick={() => onSelect(modifier)}
            >
              <Stack
                direction="row"
                gap={1.25}
                alignItems="center"
                sx={{ width: '100%', minWidth: 0 }}
              >
                <ModifierIconTile emoji={modifier.iconEmoji} size="large" />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography component="span" variant="body1" fontWeight={700}>
                    {modifier.name}
                  </Typography>
                  <Box id={`${prefix}-${modifier.id}-meta`}>
                    <Typography variant="body2" color="text.secondary">
                      {t(`common.modifiers.categories.${modifier.category}`)}
                    </Typography>
                    {modifier.isLockedByActiveGame ? (
                      <StatusBadge
                        size="small"
                        color="warning"
                        label={t('gameCatalog.modifiers.contentLockedBadge')}
                      />
                    ) : null}
                  </Box>
                </Box>
                <Box
                  id={`${prefix}-${modifier.id}-cost`}
                  sx={{ flexShrink: 0, textAlign: 'right' }}
                >
                  <Typography variant="caption" color="text.secondary">
                    {t('gameCatalog.modifiers.catalog.cost')}
                  </Typography>
                  <Typography variant="body1" fontWeight={700} color="primary.light">
                    {number(modifier.activationCost)}
                  </Typography>
                </Box>
              </Stack>
            </SelectionRow>
          </Box>
        ))}
      </Stack>
    </ListPanel>
  )
}
