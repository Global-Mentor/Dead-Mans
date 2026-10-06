import { Box, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { ModifierVersionDetail } from '../../../shared/api/contracts/index.ts'
import { DetailBlock, Metric } from '../../../shared/ui/index.ts'

type Behavior = ModifierVersionDetail['behaviorV2']
type Row = readonly [label: string, value: string]

export function ModifierBehaviorDetails({ behavior }: { behavior: Behavior }) {
  const { t, i18n } = useTranslation()
  const number = (value: number) => new Intl.NumberFormat(i18n.resolvedLanguage).format(value)
  const field = (key: string) => t('modifierHistory.behaviorFields.' + key, { defaultValue: key })
  const resolution = behavior.resolution
  const resultRows: Row[] = [
    [
      field('resolution.type'),
      t('modifierHistory.behaviorDisplay.resolutions.' + resolution.type, {
        defaultValue: resolution.type,
      }),
    ],
    [
      field('reward'),
      t('modifierHistory.behaviorDisplay.rewards.' + behavior.reward, {
        defaultValue: behavior.reward,
      }),
    ],
  ]
  if ('metric' in resolution)
    resultRows.push([
      field('resolution.metric'),
      t('modifierHistory.behaviorDisplay.metrics.' + resolution.metric, {
        defaultValue: resolution.metric,
      }),
    ])
  if ('inputLabel' in resolution && resolution.inputLabel)
    resultRows.push([field('resolution.inputLabel'), resolution.inputLabel])
  if ('maximumKind' in resolution && resolution.maximumKind)
    resultRows.push([
      field('resolution.maximumKind'),
      t('modifierHistory.behaviorDisplay.maximums.' + resolution.maximumKind, {
        defaultValue: resolution.maximumKind,
      }),
    ])
  if ('maximumPerActivation' in resolution && resolution.maximumPerActivation != null)
    resultRows.push([
      field('resolution.maximumPerActivation'),
      number(resolution.maximumPerActivation),
    ])
  const formula = behavior.formulaReference
  if (!formula)
    resultRows.push([
      field('formulaReference.code'),
      t('modifierHistory.behaviorDisplay.noFormula'),
    ])
  const group = (title: string, rows: readonly Row[]) => (
    <DetailBlock role="group" aria-label={title}>
      <Typography component="h4" variant="body2" fontWeight={700} sx={{ mb: 0.75 }}>
        {title}
      </Typography>
      <Stack>
        {rows.map(([label, value]) => (
          <Metric
            key={label}
            appearance="row"
            density="compact"
            emphasis="label"
            label={label}
            value={value}
          />
        ))}
      </Stack>
    </DetailBlock>
  )
  return (
    <Stack gap={1} sx={{ mt: 1 }}>
      <DetailBlock>
        <Typography component="h4" variant="body2" fontWeight={700} sx={{ mb: 0.5 }}>
          {field('rule')}
        </Typography>
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
          {behavior.rule}
        </Typography>
      </DetailBlock>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr)',
          '@container (min-width: 700px)': { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' },
          gap: 1,
        }}
      >
        {group(t('modifierHistory.behaviorDisplay.conditions'), [
          [
            field('kind'),
            t('modifierHistory.behaviorDisplay.kinds.' + behavior.kind, {
              defaultValue: behavior.kind,
            }),
          ],
          [
            field('phase'),
            t('common.modifiers.categories.' + behavior.phase, { defaultValue: behavior.phase }),
          ],
          [
            field('performer'),
            t('modifierHistory.behaviorDisplay.performers.' + behavior.performer, {
              defaultValue: behavior.performer,
            }),
          ],
          [
            field('requiresHostMonitoring'),
            t(
              behavior.requiresHostMonitoring
                ? 'modifierHistory.behaviorDisplay.monitoringRequired'
                : 'modifierHistory.behaviorDisplay.monitoringNotRequired',
            ),
          ],
        ])}
        {group(t('modifierHistory.behaviorDisplay.activations'), [
          [
            field('durationSecondsPerActivation'),
            behavior.durationSecondsPerActivation == null
              ? t('modifierHistory.behaviorDisplay.noTimer')
              : t('modifierHistory.behaviorDisplay.seconds', {
                  value: number(behavior.durationSecondsPerActivation),
                }),
          ],
          [
            field('stackingPolicy'),
            t('modifierHistory.behaviorDisplay.stacking.' + behavior.stackingPolicy, {
              defaultValue: behavior.stackingPolicy,
            }),
          ],
          [field('schemaVersion'), number(behavior.schemaVersion)],
        ])}
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr)',
          '@container (min-width: 700px)': {
            gridTemplateColumns: formula ? 'repeat(2, minmax(0, 1fr))' : 'minmax(0, 1fr)',
          },
          gap: 1,
        }}
      >
        {group(t('modifierHistory.behaviorDisplay.results'), resultRows)}
        {formula
          ? group(t('modifierHistory.behaviorDisplay.calculation'), [
              [
                field('formulaReference.code'),
                t('modifierHistory.behaviorDisplay.formulas.' + formula.code, {
                  defaultValue: formula.code,
                }),
              ],
              [field('formulaReference.version'), number(formula.version)],
              ...Object.entries(formula.parameters)
                .filter(([key]) => key !== 'type')
                .map(([key, value]): Row => [
                  field('formulaReference.parameters.' + key),
                  typeof value === 'number' ? number(value) : String(value),
                ]),
            ])
          : null}
      </Box>
    </Stack>
  )
}
