import { z } from '../../../shared/validation/zod.ts'
import {
  createQuestionFormSchema,
  type QuestionFormSchemaMessages,
} from './question-form-schema.ts'

export function createScreenshotFormSchema(
  messages: QuestionFormSchemaMessages,
  locationCategoryId: string | undefined,
) {
  const questionSchema = createQuestionFormSchema(messages)
  return questionSchema
    .omit({ options: true })
    .extend({
      mapId: z.string(),
      locationId: z.string(),
      options: z.array(z.object({ text: z.string(), isCorrect: z.boolean() })),
    })
    .superRefine((values, context) => {
      if (values.categoryId === locationCategoryId) {
        for (const key of ['mapId', 'locationId'] as const) {
          if (!values[key])
            context.addIssue({ code: 'custom', path: [key], message: messages.required })
        }
      } else {
        const result = questionSchema.shape.options.safeParse(values.options)
        if (!result.success) {
          for (const issue of result.error.issues)
            context.addIssue({ ...issue, path: ['options', ...issue.path] })
        }
      }
    })
}
