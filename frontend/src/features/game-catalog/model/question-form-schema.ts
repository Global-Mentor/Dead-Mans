import { z } from '../../../shared/validation/zod.ts'
import { normalizeQuestionAnswer, trimQuestionAnswer } from './question-answer-normalize.ts'

export const maxQuestionAnswers = 10
export const minQuestionAnswers = 2

interface QuestionFormSchemaMessages {
  required: string
  number: string
  tooLong: string
  maxAnswers: string
  duplicateAnswers: string
  correctAnswer: string
}

export function createQuestionFormSchema(messages: QuestionFormSchemaMessages) {
  const answerValueSchema = z
    .string()
    .transform(trimQuestionAnswer)
    .pipe(z.string().min(1, messages.required).max(500, messages.tooLong))

  return z.object({
    categoryId: z.string().trim().min(1, messages.required),
    text: z.string().trim().min(1, messages.required).max(2000, messages.tooLong),
    options: z
      .array(z.object({ text: answerValueSchema, isCorrect: z.boolean() }))
      .min(minQuestionAnswers, messages.required)
      .max(maxQuestionAnswers, messages.maxAnswers)
      .superRefine((options, context) => {
        const seen = new Set<string>()
        for (let index = 0; index < options.length; index += 1) {
          const normalizedAnswer = normalizeQuestionAnswer(options[index]?.text ?? '')
          if (!normalizedAnswer) {
            continue
          }

          if (seen.has(normalizedAnswer)) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              path: [index, 'text'],
              message: messages.duplicateAnswers,
            })
            return
          }

          seen.add(normalizedAnswer)
        }

        if (options.filter((option) => option.isCorrect).length !== 1) {
          context.addIssue({ code: z.ZodIssueCode.custom, message: messages.correctAnswer })
        }
      }),
    reward: z.string().regex(/^\d+$/, messages.number),
    priority: z.string().regex(/^-?\d+$/, messages.number),
    isEnabled: z.boolean(),
  })
}

export type QuestionFormValues = z.infer<ReturnType<typeof createQuestionFormSchema>>
