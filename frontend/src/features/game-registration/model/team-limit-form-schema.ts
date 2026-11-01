import { z } from '../../../shared/validation/zod.ts'

export function createTeamLimitFormSchema(invalid: string) {
  return z.object({ unlimited: z.boolean(), value: z.string() }).superRefine((input, context) => {
    if (
      !input.unlimited &&
      (!/^\d+$/.test(input.value) || Number(input.value) < 1 || Number(input.value) > 1000)
    ) {
      context.addIssue({ code: 'custom', path: ['value'], message: invalid })
    }
  })
}

export type TeamLimitFormValues = z.infer<ReturnType<typeof createTeamLimitFormSchema>>
