import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getErrorMessage } from '../lib/api'
import { AuthLayout, AuthLink } from '../components/AuthLayout'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    phone: '',
    shop_name: '',
    shop_type: 'tailor',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(form as Parameters<typeof register>[0])
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
      footer={<>Already have an account? <AuthLink to="/login">Sign in</AuthLink></>}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Shop Name" value={form.shop_name} onChange={(e) => update('shop_name', e.target.value)} required />
        <Select
          label="Shop Type"
          value={form.shop_type}
          onChange={(e) => update('shop_type', e.target.value)}
          options={[
            { value: 'tailor', label: 'Tailor Shop' },
            { value: 'boutique', label: 'Boutique Store' },
            { value: 'both', label: 'Both' },
          ]}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Your Name" value={form.name} onChange={(e) => update('name', e.target.value)} required />
          <Input label="Phone" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
        </div>
        <Input label="Email" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} required />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Password" type="password" value={form.password} onChange={(e) => update('password', e.target.value)} required />
          <Input label="Confirm Password" type="password" value={form.password_confirmation} onChange={(e) => update('password_confirmation', e.target.value)} required />
        </div>
        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
        )}
        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? 'Creating account...' : 'Create account'}
        </Button>
      </form>
    </AuthLayout>
  )
}
