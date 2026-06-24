import { useEffect, useState } from 'react'
import { api, getErrorMessage } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import type { Shop } from '../types'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Textarea } from '../components/ui/Textarea'
import { LoadingSpinner } from '../components/ui/Badge'
import {
  SettingsWizard,
  WizardNav,
  WizardStepHeader,
  type WizardStep,
} from '../components/ui/SettingsWizard'
import {
  DEFAULT_ORDER_CREATED_TEMPLATE,
  DEFAULT_ORDER_READY_TEMPLATE,
  parseWhatsAppSettings,
  WHATSAPP_TEMPLATE_HINT,
  whatsAppSettingsToPayload,
  type ShopWhatsAppSettings,
} from '../lib/whatsappSettings'

const WIZARD_STEPS: WizardStep[] = [
  { id: 'shop', title: 'Shop', description: 'Business details & branding' },
  { id: 'profile', title: 'Profile', description: 'Your account & password' },
  { id: 'whatsapp', title: 'WhatsApp', description: 'Client message templates' },
]

export function SettingsPage() {
  const { user, refreshUser } = useAuth()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [shopSettings, setShopSettings] = useState<Record<string, unknown>>({})
  const [form, setForm] = useState({
    name: '', type: 'tailor', phone: '', email: '', address: '', city: '',
    currency: 'PKR', measurement_unit: 'inch',
  })
  const [whatsapp, setWhatsapp] = useState<ShopWhatsAppSettings>({
    enabled: false,
    orderCreatedMessage: '',
    orderReadyMessage: '',
  })
  const [logo, setLogo] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [profile, setProfile] = useState({ name: '', phone: '', password: '', password_confirmation: '' })

  useEffect(() => {
    api.get<Shop>('/settings').then((res) => {
      const s = res.data
      setForm({
        name: s.name, type: s.type, phone: s.phone || '', email: s.email || '',
        address: s.address || '', city: s.city || '', currency: s.currency,
        measurement_unit: s.measurement_unit,
      })
      setShopSettings(s.settings ?? {})
      setWhatsapp(parseWhatsAppSettings(s))
      setLogoPreview(s.logo_url)
    }).finally(() => setLoading(false))
    if (user) setProfile({ name: user.name, phone: user.phone || '', password: '', password_confirmation: '' })
  }, [user])

  function clearAlerts() {
    setError('')
    setSuccess('')
  }

  async function saveShop(): Promise<boolean> {
    if (!form.name.trim()) {
      setError('Shop name is required')
      return false
    }
    setSaving(true)
    clearAlerts()
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => fd.append(k, v))
    if (logo) fd.append('logo', logo)
    try {
      await api.post('/settings', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      await refreshUser()
      setSuccess('Shop settings saved')
      return true
    } catch (err) {
      setError(getErrorMessage(err))
      return false
    } finally {
      setSaving(false)
    }
  }

  async function saveProfile(): Promise<boolean> {
    if (!profile.name.trim()) {
      setError('Your name is required')
      return false
    }
    if (profile.password && profile.password !== profile.password_confirmation) {
      setError('Passwords do not match')
      return false
    }
    setSaving(true)
    clearAlerts()
    try {
      const data: Record<string, string> = { name: profile.name, phone: profile.phone }
      if (profile.password) {
        data.password = profile.password
        data.password_confirmation = profile.password_confirmation
      }
      await api.put('/auth/profile', data)
      await refreshUser()
      setProfile((p) => ({ ...p, password: '', password_confirmation: '' }))
      setSuccess('Profile updated')
      return true
    } catch (err) {
      setError(getErrorMessage(err))
      return false
    } finally {
      setSaving(false)
    }
  }

  async function saveWhatsApp(): Promise<boolean> {
    setSaving(true)
    clearAlerts()
    try {
      await api.put('/settings', {
        settings: whatsAppSettingsToPayload(shopSettings, whatsapp),
      })
      const res = await api.get<Shop>('/settings')
      setShopSettings(res.data.settings ?? {})
      setWhatsapp(parseWhatsAppSettings(res.data))
      await refreshUser()
      setSuccess('WhatsApp settings saved')
      return true
    } catch (err) {
      setError(getErrorMessage(err))
      return false
    } finally {
      setSaving(false)
    }
  }

  async function handleContinue() {
    let ok = false
    if (step === 0) ok = await saveShop()
    else if (step === 1) ok = await saveProfile()
    else ok = await saveWhatsApp()

    if (ok && step < WIZARD_STEPS.length - 1) {
      setStep((s) => s + 1)
    }
  }

  function handleBack() {
    clearAlerts()
    setStep((s) => Math.max(0, s - 1))
  }

  function handleStepChange(index: number) {
    clearAlerts()
    setStep(index)
  }

  if (loading) return <LoadingSpinner />

  const current = WIZARD_STEPS[step]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="page-heading">Settings</h2>
        <p className="page-subtitle">
          Step {step + 1} of {WIZARD_STEPS.length} — {current.description}
        </p>
      </div>

      {success && <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      <SettingsWizard steps={WIZARD_STEPS} currentStep={step} onStepChange={handleStepChange}>
        {step === 0 && (
          <div>
            <WizardStepHeader
              title="Shop settings"
              description="Set up your shop name, contact details, logo, and measurement preferences."
            />
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="h-16 w-16 rounded-xl border object-cover" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-slate-100 text-2xl font-bold text-slate-400">
                    {form.name.charAt(0) || 'S'}
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Shop logo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setLogo(file)
                        setLogoPreview(URL.createObjectURL(file))
                      }
                    }}
                    className="text-sm"
                  />
                </div>
              </div>
              <Input
                label="Shop name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
              <Select
                label="Shop type"
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                options={[
                  { value: 'tailor', label: 'Tailor shop' },
                  { value: 'boutique', label: 'Boutique store' },
                  { value: 'both', label: 'Both' },
                ]}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
                <Input label="Email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <Textarea label="Address" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} rows={2} />
              <Input label="City" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Currency" value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))} />
                <Select
                  label="Measurement unit"
                  value={form.measurement_unit}
                  onChange={(e) => setForm((f) => ({ ...f, measurement_unit: e.target.value }))}
                  options={[
                    { value: 'inch', label: 'Inches' },
                    { value: 'cm', label: 'Centimeters' },
                  ]}
                />
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <WizardStepHeader
              title="Your profile"
              description="Update your name, phone, and password for signing in."
            />
            <div className="space-y-4">
              <Input
                label="Name"
                value={profile.name}
                onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                required
              />
              <Input
                label="Phone"
                value={profile.phone}
                onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
              />
              <Input label="Email" value={user?.email || ''} disabled />
              <Input
                label="New password"
                type="password"
                value={profile.password}
                onChange={(e) => setProfile((p) => ({ ...p, password: e.target.value }))}
                placeholder="Leave blank to keep current"
              />
              <Input
                label="Confirm password"
                type="password"
                value={profile.password_confirmation}
                onChange={(e) => setProfile((p) => ({ ...p, password_confirmation: e.target.value }))}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <WizardStepHeader
              title="WhatsApp notifications"
              description="Enable client messaging and customize order confirmation and ready texts."
            />
            <div className="space-y-4">
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                <input
                  type="checkbox"
                  checked={whatsapp.enabled}
                  onChange={(e) => setWhatsapp((w) => ({ ...w, enabled: e.target.checked }))}
                  className="mt-1 size-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-900">Enable WhatsApp messaging</span>
                  <span className="mt-0.5 block text-sm text-slate-500">
                    Show WhatsApp on orders and prompt when an order is placed or marked ready.
                  </span>
                </span>
              </label>

              <p className="text-xs text-slate-500">{WHATSAPP_TEMPLATE_HINT}</p>

              <Textarea
                label="Order created message (optional)"
                value={whatsapp.orderCreatedMessage}
                onChange={(e) => setWhatsapp((w) => ({ ...w, orderCreatedMessage: e.target.value }))}
                placeholder={DEFAULT_ORDER_CREATED_TEMPLATE}
                rows={7}
                disabled={!whatsapp.enabled}
              />

              <Textarea
                label="Order ready message (optional)"
                value={whatsapp.orderReadyMessage}
                onChange={(e) => setWhatsapp((w) => ({ ...w, orderReadyMessage: e.target.value }))}
                placeholder={DEFAULT_ORDER_READY_TEMPLATE}
                rows={7}
                disabled={!whatsapp.enabled}
              />

              <p className="text-xs text-slate-400">
                Leave message fields empty to use the default text in each placeholder.
              </p>
            </div>
          </div>
        )}

        <WizardNav
          currentStep={step}
          totalSteps={WIZARD_STEPS.length}
          saving={saving}
          onBack={handleBack}
          onContinue={handleContinue}
        />
      </SettingsWizard>
    </div>
  )
}
