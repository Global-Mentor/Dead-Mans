import { describe, expect, it } from 'vitest'
import i18n from '../../../i18n.ts'
import { formatCurrentCardLabel, formatShortCardLabel } from './game-history-formatters.ts'

describe('game history formatters', () => {
  it('uses column then row names for an untitled current card and preserves custom titles', () => {
    const t = i18n.getFixedT('ru')
    const coordinates = { cellRowIndex: 1, cellColIndex: 0 }
    const labels = { colLabels: ['Оружие'], rowLabels: ['100', '200'] }
    expect(formatCurrentCardLabel({ ...coordinates, cellTitle: null }, labels, t)).toBe(
      'Оружие · 200',
    )
    expect(formatCurrentCardLabel({ ...coordinates, cellTitle: '  ' }, labels, t)).toBe(
      'Оружие · 200',
    )
    expect(formatCurrentCardLabel({ ...coordinates, cellTitle: 'Дуэль' }, labels, t)).toBe('Дуэль')
    expect(formatCurrentCardLabel(coordinates, undefined, t)).toBe('Игровая карточка')
    expect(formatCurrentCardLabel({ cellRowIndex: 9, cellColIndex: 9 }, labels, t)).toBe(
      'Игровая карточка',
    )
  })

  it('labels the snapshotted card value independently from the card title', () => {
    const t = i18n.getFixedT('ru')

    expect(formatShortCardLabel({ cellTitle: 'Карточка 100', cellCost: 375 }, t)).toBe(
      'Карточка 100 · Стоимость 375 очк.',
    )
  })
})
