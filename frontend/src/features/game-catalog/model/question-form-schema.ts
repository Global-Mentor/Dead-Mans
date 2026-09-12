import { z } from '../../../shared/validation/zod.ts'
import { normalizeQuestionAnswer, trimQuestionAnswer } from './question-answer-normalize.ts'

export const maxQuestionAnswers = 10

interface QuestionFormSchemaMessages {
  required: string
  number: string
  tooLong: string
  maxAnswers: string
  duplicateAnswers: string
}

export function createQuestionFormSchema(messages: QuestionFormSchemaMessages) {
  const answerValueSchema = z
    .string()
    .transform(trimQuestionAnswer)
    .pipe(z.string().min(1, messages.required).max(500, messages.tooLong))

  return z.object({
    categoryId: z.string().trim().min(1, messages.required),
    text: z.string().trim().min(1, messages.required).max(2000, messages.tooLong),
    answers: z
      .array(z.object({ value: answerValueSchema }))
      .min(1, messages.required)
      .max(maxQuestionAnswers, messages.maxAnswers)
      .superRefine((answers, context) => {
        const seen = new Set<string>()
        for (let index = 0; index < answers.length; index += 1) {
          const normalizedAnswer = normalizeQuestionAnswer(answers[index]?.value ?? '')
          if (!normalizedAnswer) {
            continue
          }

          if (seen.has(normalizedAnswer)) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              path: [index, 'value'],
              message: messages.duplicateAnswers,
            })
            return
          }

          seen.add(normalizedAnswer)
        }
      }),
    reward: z.string().regex(/^\d+$/, messages.number),
    priority: z.string().regex(/^-?\d+$/, messages.number),
    isEnabled: z.boolean(),
  })
}

export type QuestionFormValues = z.infer<ReturnType<typeof createQuestionFormSchema>>
