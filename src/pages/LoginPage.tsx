import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getErrorMessage } from '../lib/api'
import { AUTH_BREADCRUMBS } from '../lib/breadcrumbs'
import { useZodForm } from '../hooks/useZodForm'
import { loginSchema } from '../lib/validation'
import { AuthLayout, AuthLink } from '../components/AuthLayout'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { fieldErrors, formError, validate, clearField } = useZodForm(loginSchema)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const data = validate({ email, password })
    if (!data) return
    setError('')
    setLoading(true)
    try {
      await login(data.email, data.password)
      navigate('/')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your tailor shop dashboard"
      breadcrumbs={AUTH_BREADCRUMBS.login}
      footer={<>Don&apos;t have an account? <AuthLink to="/register">Create shop account</AuthLink></>}
    >
      <form noValidate onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => { setEmail(e.target.value); clearField('email') }}
          error={fieldErrors.email}
          required
        />
        <Input
          label="Password"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); clearField('password') }}
          error={fieldErrors.password}
          required
        />
        {(error || formError) && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error || formError}</p>
        )}
        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>
    </AuthLayout>
  )
}
