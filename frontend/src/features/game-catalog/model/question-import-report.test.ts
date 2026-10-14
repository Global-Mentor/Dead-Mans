import { describe, expect, it, vi } from 'vitest'
import type { ImportGameQuestionSkippedItem } from '../../../shared/api/contracts/index.ts'
import i18n from '../../../i18n.ts'
import {
  buildQuestionImportFailureReport,
  downloadQuestionImportFailureReport,
  formatSkippedQuestionWarning,
} from './question-import-report.ts'

const skippedQuestions: ImportGameQuestionSkippedItem[] = [
  {
    rowNumber: 2,
    questionText: 'What is the safe code?',
    reasonCode: 'game_question.import_duplicate_code_existing',
    reason: 'Duplicate code.',
    sourceQuestion: {
      text: 'What is the safe code?',
      answer: '742',
      reward: 100,
      externalCode: 'safe-code',
      isEnabled: true,
      priority: 2,
    },
  },
  {
    rowNumber: 5,
    questionText: null,
    reasonCode: 'game_question.import_invalid_fields',
    reason: 'Question text is required.',
    sourceQuestion: {
      text: null,
      answer: 'Answer only',
      reward: 50,
      externalCode: 'broken-question',
      isEnabled: false,
      priority: 0,
    },
  },
]

describe('question-import-report', () => {
  it('formats skipped question warnings for the alert preview', () => {
    const [firstQuestion, secondQuestion] = skippedQuestions

    expect(firstQuestion).toBeDefined()
    expect(secondQuestion).toBeDefined()

    expect(formatSkippedQuestionWarning(firstQuestion!, i18n.t.bind(i18n))).toBe(
      '#2 - What is the safe code?: The question code already exists in the catalog.',
    )
    expect(formatSkippedQuestionWarning(secondQuestion!, i18n.t.bind(i18n))).toBe(
      '#5: Check the question text, non-negative reward and 2-10 unique options with exactly one correct answer. Twitch messages must fit within 500 characters.',
    )
  })

  it('falls back to localized text when only the legacy english reason is present', async () => {
    await i18n.changeLanguage('ru')

    const warning = formatSkippedQuestionWarning(
      {
        rowNumber: 1,
        questionText: 'Какой ник у стримера?',
        reasonCode: 'unknown_reason_code',
        reason:
          'Missing or invalid required fields. Each question must include text, answer, and a non-negative reward.',
      } as unknown as ImportGameQuestionSkippedItem,
      i18n.t.bind(i18n),
    )

    expect(warning).toBe(
      '#1 - Какой ник у стримера?: Проверьте текст вопроса, неотрицательную награду и 2-10 уникальных вариантов с одним правильным ответом. Сообщения для Twitch должны помещаться в 500 символов.',
    )
  })

  it.each(['en', 'ru', 'uk', 'pl'])('localizes unexpected reasons in %s', async (locale) => {
    await i18n.changeLanguage(locale)
    const warning = formatSkippedQuestionWarning(
      {
        rowNumber: 1,
        questionText: null,
        reasonCode: 'unexpected_code',
        reason: 'Internal database diagnostic',
      } as unknown as ImportGameQuestionSkippedItem,
      i18n.t.bind(i18n),
    )
    expect(warning).toBe(`#1: ${i18n.t('gameCatalog.questions.importReasons.unknown')}`)
    expect(warning).not.toContain('Internal database diagnostic')
  })

  it('builds a JSON report with skipped question details and source file metadata', () => {
    const report = JSON.parse(
      buildQuestionImportFailureReport({
        fileName: 'questions.jsonc',
        importedCount: 3,
        skippedQuestions,
        errorMessage: null,
      }),
    ) as {
      generatedAt: string
      sourceFileName: string
      importedCount: number
      skippedCount: number
      errorMessage: string | null
      skippedQuestions: Array<{
        rowNumber: number
        questionText: string | null
        reason: string
        sourceQuestion: {
          text: string | null
          answer: string | null
          reward: number | null
          externalCode?: string | null
        } | null
      }>
    }

    expect(report.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(report.sourceFileName).toBe('questions.jsonc')
    expect(report.importedCount).toBe(3)
    expect(report.skippedCount).toBe(2)
    expect(report.errorMessage).toBeNull()
    expect(report.skippedQuestions).toEqual([
      {
        rowNumber: 2,
        questionText: 'What is the safe code?',
        reasonCode: 'game_question.import_duplicate_code_existing',
        reason: 'Duplicate code.',
        sourceQuestion: {
          text: 'What is the safe code?',
          answer: '742',
          reward: 100,
          externalCode: 'safe-code',
          isEnabled: true,
          priority: 2,
        },
      },
      {
        rowNumber: 5,
        questionText: null,
        reasonCode: 'game_question.import_invalid_fields',
        reason: 'Question text is required.',
        sourceQuestion: {
          text: null,
          answer: 'Answer only',
          reward: 50,
          externalCode: 'broken-question',
          isEnabled: false,
          priority: 0,
        },
      },
    ])
  })

  it('downloads the generated JSON report', () => {
    const createObjectURL = vi.fn(() => 'blob:test-url')
    const revokeObjectURL = vi.fn()
    const click = vi.fn()
    const append = vi.spyOn(document.body, 'append').mockImplementation(() => undefined)
    const createElement = vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName !== 'a') {
        return document.createElement(tagName)
      }

      return {
        click,
        remove: vi.fn(),
        set href(_value: string) {},
        set download(_value: string) {},
      } as unknown as HTMLAnchorElement
    })

    Object.defineProperty(URL, 'createObjectURL', {
      value: createObjectURL,
      configurable: true,
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: revokeObjectURL,
      configurable: true,
    })

    downloadQuestionImportFailureReport({
      fileName: 'questions.jsonc',
      importedCount: 0,
      skippedQuestions,
      errorMessage: 'Import failed.',
    })

    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(click).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test-url')

    append.mockRestore()
    createElement.mockRestore()
  })
})
