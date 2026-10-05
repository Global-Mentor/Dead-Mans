import { cleanup, screen, within } from '@testing-library/react'
import { afterEach, beforeAll, expect, it } from 'vitest'
import i18n from '../../../i18n.ts'
import type { ModifierVersionDetail } from '../../../shared/api/contracts/index.ts'
import { renderWithAppProviders } from '../../../test/render-with-app-providers.tsx'
import { ModifierBehaviorDetails } from './ModifierBehaviorDetails.tsx'

beforeAll(async () => i18n.changeLanguage('ru'))
afterEach(cleanup)

const rule: ModifierVersionDetail['behaviorV2'] = {
  schemaVersion: 2,
  kind: 'rule',
  phase: 'round',
  performer: 'activeTeam',
  requiresHostMonitoring: false,
  rule: 'Не менять оружие.',
  stackingPolicy: 'aggregateParameters',
  resolution: { type: 'ruleStatus' },
  reward: 'none',
  formulaReference: null,
}

it('separates a saved rule, conditions, activations and resolution with readable values', () => {
  renderWithAppProviders(<ModifierBehaviorDetails behavior={rule} />)
  expect(screen.getByText('Не менять оружие.')).toBeVisible()
  const conditions = within(screen.getByRole('group', { name: 'Условия', exact: true }))
  expect(conditions.getByRole('group', { name: 'Исполнитель' })).toHaveTextContent('Команда')
  expect(conditions.getByRole('group', { name: 'Контроль ведущего' })).toHaveTextContent(
    'Не требуется',
  )
  expect(screen.getByRole('group', { name: 'Подведение итогов', exact: true })).toHaveTextContent(
    'Выполнение правила',
  )
  expect(screen.getByRole('group', { name: 'Формула', exact: true })).toHaveTextContent(
    'Не используется',
  )
  expect(
    screen.queryByText(/activeTeam|ruleStatus|aggregateParameters|false/),
  ).not.toBeInTheDocument()
})

it('preserves zero limits and saved scoring parameters under their localized labels', () => {
  renderWithAppProviders(
    <ModifierBehaviorDetails
      behavior={{
        ...rule,
        kind: 'scoring',
        reward: 'points',
        resolution: {
          type: 'nonNegativeCount',
          inputLabel: 'Количество убийств',
          maximumKind: 'activations',
          maximumPerActivation: 0,
        },
        formulaReference: {
          code: 'growing_kill_value',
          version: 1,
          parameters: {
            type: 'growingKillValue',
            incrementPointsPerKill: 5,
            zeroKillPenaltyPoints: 0,
          },
        },
      }}
    />,
  )
  expect(screen.getByRole('group', { name: 'Максимум на активацию' })).toHaveTextContent('0')
  const calculation = within(screen.getByRole('group', { name: 'Расчёт награды', exact: true }))
  expect(calculation.getByRole('group', { name: 'Формула' })).toHaveTextContent(
    'Растущая стоимость убийства',
  )
  expect(calculation.getByRole('group', { name: 'Прирост за убийство' })).toHaveTextContent('5')
  expect(calculation.getByRole('group', { name: 'Штраф без убийств' })).toHaveTextContent('0')
  expect(screen.getByRole('group', { name: 'Подпись ввода' })).toHaveTextContent(
    'Количество убийств',
  )
})

it('shows the authoritative automatic metric and activation duration', () => {
  renderWithAppProviders(
    <ModifierBehaviorDetails
      behavior={{
        ...rule,
        resolution: { type: 'automaticRoundMetric', metric: 'bountyCount' },
        durationSecondsPerActivation: 30,
        stackingPolicy: 'independentInstances',
      }}
    />,
  )
  expect(screen.getByRole('group', { name: 'Метрика' })).toHaveTextContent('Награды')
  expect(screen.getByRole('group', { name: 'Тип результата' })).toHaveTextContent(
    'Автоматически из показателей раунда',
  )
  expect(screen.getByRole('group', { name: 'Длительность одной активации' })).toHaveTextContent(
    '30 с',
  )
  expect(screen.getByRole('group', { name: 'Сложение' })).toHaveTextContent(
    'Каждая активация отдельно',
  )
})
