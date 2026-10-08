import { Box, Typography } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameModifierDefinition } from '../../../shared/api/contracts/index.ts'
import { modifierHistoryRoute } from '../../../routes/app-routes.ts'
import { ModifierCatalogRow } from '../../../shared/game-ui/index.ts'
import {
  AppButton,
  AppLinkButton,
  AppDialog,
  AsyncSection,
  HelpTooltip,
  StatusBadge,
} from '../../../shared/ui/index.ts'
import { ModifierCatalogDetails } from './ModifierCatalogDetails.tsx'

export function ModifierCatalogList({
  modifiers,
  catalog,
  isLoading,
  isError,
  onRetry,
  isActionDialogOpen,
  onEdit,
  onDelete,
}: {
  modifiers: GameModifierDefinition[]
  catalog: GameModifierDefinition[]
  isLoading: boolean
  isError: boolean
  onRetry: () => void
  isActionDialogOpen: boolean
  onEdit: (modifier: GameModifierDefinition) => void
  onDelete: (modifier: GameModifierDefinition) => void
}) {
  const { t } = useTranslation()
  const [previewId, setPreviewId] = useState<string | null>(null)
  const preview = catalog.find((modifier) => modifier.id === previewId) ?? null
  return (
    <>
      <Box
        data-testid="modifier-catalog-list"
        role="region"
        aria-label={t('gameCatalog.modifiers.title')}
        tabIndex={0}
        sx={{
          flex: '1 1 0%',
          minHeight: 0,
          mt: 1.5,
          p: 0.5,
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          scrollbarWidth: 'thin',
          scrollbarGutter: 'stable both-edges',
        }}
      >
        <AsyncSection
          isLoading={isLoading}
          isError={isError}
          hasData={catalog.length > 0}
          isEmpty={modifiers.length === 0}
          loadingMessage={t('gameCatalog.modifiers.loading')}
          errorMessage={t('gameCatalog.modifiers.error')}
          retryAction={
            <AppButton tone="secondary" onClick={onRetry}>
              {t('gameCatalog.workspace.retry')}
            </AppButton>
          }
          emptyMessage={
            catalog.length ? t('common.modifiers.emptySearch') : t('gameCatalog.modifiers.empty')
          }
        >
          <Box
            component="ul"
            sx={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr)',
              gridAutoRows: '1fr',
              gap: 1,
              m: 0,
              p: 0,
            }}
          >
            {modifiers.map((modifier) => (
              <ModifierCatalogRow
                key={modifier.id}
                name={modifier.name}
                emoji={modifier.iconEmoji}
                cost={modifier.activationCost}
                onDetails={() => setPreviewId(modifier.id)}
                metadata={
                  <Typography variant="caption" color="text.secondary">
                    {t(`common.modifiers.categories.${modifier.category}`)}
                  </Typography>
                }
                status={
                  <StatusBadge
                    size="small"
                    variant="outlined"
                    color={modifier.isLockedByActiveGame ? 'warning' : 'default'}
                    label={t(
                      modifier.isLockedByActiveGame
                        ? 'gameCatalog.modifiers.contentLockedBadge'
                        : 'gameCatalog.modifiers.contentEditableBadge',
                    )}
                    sx={{ width: '100%', minHeight: 56 }}
                  />
                }
                actions={
                  <AppLinkButton
                    to={modifierHistoryRoute.fullPath + '?modifierId=' + modifier.id}
                    size="small"
                    tone="ghost"
                    fullWidth
                  >
                    {t('gameCatalog.actions.history')}
                  </AppLinkButton>
                }
                managementActions={
                  <>
                    <AppButton
                      size="small"
                      fullWidth
                      framePlacement="inset"
                      tone="secondary"
                      onClick={() => onEdit(modifier)}
                    >
                      {t(
                        modifier.isLockedByActiveGame
                          ? 'gameCatalog.actions.view'
                          : 'gameCatalog.actions.edit',
                      )}
                    </AppButton>
                    <HelpTooltip
                      title={
                        modifier.isLockedByActiveGame
                          ? t('gameCatalog.modifiers.contentLockedBadge')
                          : ''
                      }
                      disableInteractive
                      describeChild
                    >
                      <Box
                        component="span"
                        tabIndex={modifier.isLockedByActiveGame ? 0 : undefined}
                        sx={{ display: 'flex', minWidth: 0 }}
                      >
                        <AppButton
                          size="small"
                          fullWidth
                          framePlacement="inset"
                          tone="danger"
                          disabled={modifier.isLockedByActiveGame}
                          onClick={() => onDelete(modifier)}
                        >
                          {t('gameCatalog.actions.delete')}
                        </AppButton>
                      </Box>
                    </HelpTooltip>
                  </>
                }
              />
            ))}
          </Box>
        </AsyncSection>
      </Box>
      <AppDialog
        open={preview !== null && !isActionDialogOpen}
        title={t('gameCatalog.modifiers.catalog.details')}
        onClose={() => setPreviewId(null)}
        actions={
          <AppButton tone="secondary" onClick={() => setPreviewId(null)}>
            {t('common.actions.close')}
          </AppButton>
        }
      >
        {preview ? (
          <ModifierCatalogDetails
            modifier={preview}
            modifiers={catalog}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ) : null}
      </AppDialog>
    </>
  )
}
