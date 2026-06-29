import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getErrorMessage } from '../lib/api'
import { AUTH_BREADCRUMBS } from '../lib/breadcrumbs'
import { useZodForm } from '../hooks/useZodForm'
import { registerSchema, type RegisterFormValues } from '../lib/validation'
import { AuthLayout, AuthLink } from '../components/AuthLayout'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'

const emptyRegisterForm = (): RegisterFormValues => ({
  name: '',
  email: '',
  password: '',
  password_confirmation: '',
  phone: '',
  shop_name: '',
  shop_type: 'tailor',
})

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(emptyRegisterForm)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { fieldErrors, formError, validate, clearField } = useZodForm(registerSchema)

  function update<K extends keyof RegisterFormValues>(field: K, value: RegisterFormValues[K]) {
    setForm((prev) => ({ ...prev, [field]: value }))
    clearField(field)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const data = validate(form)
    if (!data) return
    setError('')
    setLoading(true)
    try {
      await register(data)
      navigate('/')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Create your shop"
      subtitle="Set up your professional tailor or boutique account"
      breadcrumbs={AUTH_BREADCRUMBS.register}
      footer={<>Already have an account? <AuthLink to="/login">Sign in</AuthLink></>}
    >
      <form noValidate onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Shop Name"
          placeholder="e.g. Al-Hayat Tailors"
          value={form.shop_name}
          onChange={(e) => update('shop_name', e.target.value)}
          error={fieldErrors.shop_name}
          required
        />
        <Select
          label="Shop Type"
          value={form.shop_type}
          onChange={(e) => update('shop_type', e.target.value as RegisterFormValues['shop_type'])}
          options={[
            { value: 'tailor', label: 'Tailor Shop' },
            { value: 'boutique', label: 'Boutique Store' },
            { value: 'both', label: 'Both' },
          ]}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Your Name"
            placeholder="e.g. Usman Ali"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            error={fieldErrors.name}
            required
          />
          <Input label="Phone" placeholder="e.g. 0300 1234567" value={form.phone ?? ''} onChange={(e) => update('phone', e.target.value)} />
        </div>
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={(e) => update('email', e.target.value)}
          error={fieldErrors.email}
          required
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Password"
            type="password"
            placeholder="At least 8 characters"
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            error={fieldErrors.password}
            required
          />
          <Input
            label="Confirm Password"
            type="password"
            placeholder="Re-enter password"
            value={form.password_confirmation}
            onChange={(e) => update('password_confirmation', e.target.value)}
            error={fieldErrors.password_confirmation}
            required
          />
        </div>
        {(error || formError) && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error || formError}</p>
        )}
        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? 'Creating account...' : 'Create account'}
        </Button>
      </form>
    </AuthLayout>
  )
}
