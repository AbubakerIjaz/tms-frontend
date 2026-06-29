import type { ZodError, ZodType } from 'zod'

export type FieldErrors<T extends object> = Partial<Record<keyof T & string, string>>

export function fieldErrorsFromZod(error: ZodError): FieldErrors<Record<string, unknown>> {
  const errors: Record<string, string> = {}

  for (const issue of error.issues) {
    const key = issue.path[0]
    if (typeof key === 'string' && !errors[key]) {
      errors[key] = issue.message
    }
  }

  return errors
}

export function validateForm<T extends object>(
  schema: ZodType<T>,
  data: unknown,
):
  | { success: true; data: T }
  | { success: false; errors: FieldErrors<T>; message: string } {
  const result = schema.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data }
  }

  return {
    success: false,
    errors: fieldErrorsFromZod(result.error) as FieldErrors<T>,
    message: 'Please fix the highlighted fields.',
  }
}
