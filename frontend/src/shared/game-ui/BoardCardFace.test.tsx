import { cleanup, render, screen } from '@testing-library/react'
import { createInstance } from 'i18next'
import { I18nextProvider } from 'react-i18next'
import { afterEach, describe, expect, it } from 'vitest'
import { localeResources } from '../../locales/index.ts'
import { BoardCardFace } from './BoardCardFace.tsx'

afterEach(cleanup)

describe('standalone board card translations', () => {
  it.each([
    ['en', '100 pts', 'Played', '330 pts'],
    ['ru', '100 очк.', 'Сыграно', '330 очк.'],
    ['uk', '100 оч.', 'Зіграно', '330 очк.'],
    ['pl', '100 pkt', 'Rozegrano', '330 pkt'],
  ] as const)(
    'renders prices and results in %s without the game-page dictionary',
    async (language, cost, played, points) => {
      const instance = createInstance()
      const resources = Object.fromEntries(
        Object.entries(localeResources).map(([locale, resource]) => [
          locale,
          {
            translation: Object.fromEntries(
              Object.entries(resource.translation).filter(
                ([key]) => key === 'common' || key === 'boardCard',
              ),
            ),
          },
        ]),
      )
      await instance.init({
        lng: language,
        fallbackLng: 'ru',
        resources,
        interpolation: { escapeValue: false },
      })
      expect(instance.exists('gameBoard.costLabel')).toBe(false)
      const { container } = render(
        <I18nextProvider i18n={instance}>
          <BoardCardFace cell={{ state: 'closed', cost: 100 }} />
          <BoardCardFace
            cell={{ state: 'open', cost: 100, title: 'Test card' }}
            playResult={{
              teamName: 'Test team',
              teamSlotIndex: 1,
              scoreDetails: { finalScore: 330, penaltyTotal: 0 },
            }}
          />
        </I18nextProvider>,
      )
      expect(screen.getByText(cost)).toBeInTheDocument()
      expect(screen.getByText(played)).toBeInTheDocument()
      expect(screen.getByText(points)).toBeInTheDocument()
      expect(container.textContent).not.toMatch(/gameBoard\.|boardCard\.|\{\{/)
    },
  )
})
