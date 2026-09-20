import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '../../i18n.ts'
import { renderWithAppProviders } from '../../test/render-with-app-providers.tsx'
import { GameSetupPage } from './GameSetupPage.tsx'

const pageMocks = vi.hoisted(() => ({
  useGameSetupPage: vi.fn(),
}))

vi.mock('./use-game-setup-page.ts', () => ({
  useGameSetupPage: pageMocks.useGameSetupPage,
}))

vi.mock('./ui/GameSetupRegistrationPanel.tsx', () => ({
  GameSetupRegistrationPanel: () => null,
}))

function createPageController(overrides: Record<string, unknown> = {}) {
  return {
    snapshot: null,
    draft: null,
    isLoading: false,
    isError: false,
    isDirty: false,
    syncStatus: 'idle',
    remoteChangeNotice: false,
    draftRemovedNotice: false,
    saveErrorMessage: null,
    resetErrorMessage: null,
    updateDraft: vi.fn(),
    commitDraft: vi.fn(),
    applyLayoutChange: vi.fn(),
    reloadFromServer: vi.fn(),
    createDraft: vi.fn(),
    deleteDraft: vi.fn(),
    isCreating: false,
    isResetting: false,
    isSaving: false,
    cellMediaDisplayByCellId: {},
    isCellMediaBusy: vi.fn(() => false),
    hasPendingMedia: false,
    cellMediaErrorKey: null,
    uploadCellMedia: vi.fn(),
    deleteCellMedia: vi.fn(),
    dismissCellMediaError: vi.fn(),
    dismissRemoteChangeNotice: vi.fn(),
    dismissDraftRemovedNotice: vi.fn(),
    toggleModifier: vi.fn(),
    ...overrides,
  }
}

beforeAll(async () => {
  await i18n.changeLanguage('ru')
})

beforeEach(() => {
  pageMocks.useGameSetupPage.mockReturnValue(createPageController())
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('GameSetupPage', () => {
  it('renders the loading state', () => {
    pageMocks.useGameSetupPage.mockReturnValue(createPageController({ isLoading: true }))

    renderWithAppProviders(<GameSetupPage />)

    expect(screen.getByText('Загрузка настройки игры...')).toBeInTheDocument()
  })

  it('renders the error state', () => {
    pageMocks.useGameSetupPage.mockReturnValue(createPageController({ isError: true }))

    renderWithAppProviders(<GameSetupPage />)

    expect(screen.getByText('Не удалось загрузить настройку игры.')).toBeInTheDocument()
  })

  it('renders the empty draft state with an inline create panel instead of a dialog', () => {
    renderWithAppProviders(<GameSetupPage />)

    expect(
      screen.getByText(
        'Сейчас нет игры в статусе черновика. Создайте новую, чтобы начать настройку.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Создать игру' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('has no manual save button and commits text fields when they lose focus', () => {
    const commitDraft = vi.fn()
    const updateDraft = vi.fn()
    pageMocks.useGameSetupPage.mockReturnValue(
      createPageController({
        snapshot: {
          gameId: 'draft-1',
          title: 'Draft',
          status: 'draft',
          version: 1,
          rows: 1,
          cols: 1,
          rowLabels: ['100'],
          colLabels: ['A'],
          cells: [],
          enabledModifierIds: [],
          enabledQuestionIds: [],
          quizAnswerDurationSeconds: 60,
        },
        draft: {
          title: 'Draft',
          rowLabels: ['100'],
          colLabels: ['A'],
          cells: [],
          enabledModifierIds: [],
          enabledQuestionIds: [],
          quizAnswerDurationSeconds: 60,
        },
        updateDraft,
        commitDraft,
      }),
    )

    renderWithAppProviders(<GameSetupPage />)

    expect(screen.queryByRole('button', { name: 'Сохранить изменения' })).not.toBeInTheDocument()
    const titleInput = screen.getByRole('textbox', { name: 'Название игры' })
    fireEvent.change(titleInput, { target: { value: 'Новое название' } })
    expect(updateDraft).toHaveBeenCalledOnce()
    expect(commitDraft).not.toHaveBeenCalled()

    fireEvent.blur(titleInput)
    expect(commitDraft).toHaveBeenCalledOnce()

    const columnLabel = screen.getByRole('textbox', { name: 'Подпись колонки 1' })
    const rowLabel = screen.getByRole('textbox', { name: 'Подпись строки 1' })
    expect(columnLabel.tagName).toBe('TEXTAREA')
    expect(rowLabel.tagName).toBe('TEXTAREA')
    expect(columnLabel).toHaveAttribute('maxlength', '24')
    expect(rowLabel).toHaveAttribute('maxlength', '24')
  })
})
