import { useCallback, useState } from 'react'
import type { ZodType } from 'zod'
import { validateForm, type FieldErrors } from '../lib/validation'

export function useZodForm<T extends object>(schema: ZodType<T>) {
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<T>>({})
  const [formError, setFormError] = useState('')

  const clearErrors = useCallback(() => {
    setFieldErrors({})
    setFormError('')
  }, [])

  const clearField = useCallback((field: keyof T & string) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }, [])

  const validate = useCallback(
    (data: unknown): T | null => {
      const result = validateForm(schema, data)
      if (!result.success) {
        setFieldErrors(result.errors)
        setFormError(result.message)
        return null
      }
      clearErrors()
      return result.data
    },
    [schema, clearErrors],
  )

  return {
    fieldErrors,
    formError,
    setFormError,
    setFieldErrors,
    validate,
    clearErrors,
    clearField,
  }
}
