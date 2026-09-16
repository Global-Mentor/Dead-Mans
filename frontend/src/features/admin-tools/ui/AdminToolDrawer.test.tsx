import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import i18n from '../../../i18n.ts'
import { renderWithAppProviders } from '../../../test/render-with-app-providers.tsx'
import { AdminToolDrawer } from './AdminToolDrawer.tsx'

afterEach(cleanup)

beforeAll(async () => {
  await i18n.changeLanguage('ru')
})

describe('AdminToolDrawer', () => {
  it('switches using visible tabs and keeps tool form state', () => {
    renderDrawer()
    fireEvent.click(screen.getByRole('button', { name: 'Управление игрой' }))

    fireEvent.change(screen.getByRole('textbox', { name: 'Поле игры' }), {
      target: { value: 'несохранённое значение' },
    })
    fireEvent.click(screen.getByRole('tab', { name: 'Модификаторы' }))

    expect(screen.getByRole('tabpanel', { name: 'Модификаторы' })).toBeVisible()
    expect(screen.queryByRole('textbox', { name: 'Поле игры' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'Игра' }))

    expect(screen.getByRole('textbox', { name: 'Поле игры' })).toHaveValue('несохранённое значение')
  })

  it('associates the selected tab with its panel', () => {
    renderDrawer()
    fireEvent.click(screen.getByRole('button', { name: 'Управление игрой' }))
    const tab = screen.getByRole('tab', { name: 'Модификаторы' })
    fireEvent.click(tab)
    expect(tab).toHaveAttribute('aria-selected', 'true')
    expect(tab).toHaveAttribute(
      'aria-controls',
      screen.getByRole('tabpanel', { name: 'Модификаторы' }).id,
    )

    expect(screen.getByRole('tabpanel', { name: 'Модификаторы' })).toBeVisible()
  })

  it('returns focus to the opener after closing', async () => {
    renderDrawer()
    const opener = screen.getByRole('button', { name: 'Управление игрой' })
    fireEvent.click(opener)
    fireEvent.click(screen.getByRole('button', { name: 'Закрыть инструменты управления' }))

    await waitFor(() => expect(opener).toHaveFocus())
  })
})

function renderDrawer() {
  return renderWithAppProviders(
    <AdminToolDrawer
      initialToolId="game"
      tools={[
        {
          id: 'game',
          label: 'Игра',
          content: <StatefulTool label="Поле игры" />,
        },
        {
          id: 'modifiers',
          label: 'Модификаторы',
          content: <StatefulTool label="Поле модификаторов" />,
        },
      ]}
    />,
  )
}

function StatefulTool({ label }: { label: string }) {
  const [value, setValue] = useState('')

  return (
    <input aria-label={label} value={value} onChange={(event) => setValue(event.target.value)} />
  )
}
