import { useEffect, useState } from 'react'
import {
  Users, ClipboardList, Shirt, Scissors, Image, FolderOpen, Wallet, Ruler, Mic,
  Mail, Bell, Languages, Store, UserCircle, LayoutGrid, MessageCircle,
  CheckCircle2, AlertCircle, Upload, Scissors as ScissorsIcon, ShoppingBag, Sparkles,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { api, getErrorMessage } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import type { Shop } from '../types'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Textarea } from '../components/ui/Textarea'
import { Button } from '../components/ui/Button'
import { LoadingSpinner } from '../components/ui/Badge'
import { FeatureToggle } from '../components/ui/FeatureToggle'
import {
  SettingsNav,
  SettingsSectionCard,
  SettingsFieldGroup,
  type SettingsSectionDef,
} from '../components/ui/SettingsLayout'
import {
  DEFAULT_ORDER_CREATED_TEMPLATE,
  DEFAULT_ORDER_READY_TEMPLATE,
  parseWhatsAppSettings,
  WHATSAPP_TEMPLATE_HINT,
  whatsAppSettingsToPayload,
  type ShopWhatsAppSettings,
} from '../lib/whatsappSettings'
import {
  emailSettingsToPayload,
  listCardColorsToPayload,
  measurementCardColorsToPayload,
  moduleSettingsToPayload,
  MODULE_OPTIONS,
  parseEmailSettings,
  parseListCardColorSetting,
  parseMeasurementCardColorSetting,
  parseModuleSettings,
  parseUrduLabelsSetting,
  urduLabelsToPayload,
  type ShopEmailSettings,
  type ShopModuleSettings,
} from '../lib/shopSettings'
import { useZodForm } from '../hooks/useZodForm'
import { profileSettingsFormSchema, shopSettingsFormSchema } from '../lib/validation'

const MODULE_ICONS = {
  clients: Users,
  orders: ClipboardList,
  designs: Shirt,
  garmentTypes: Scissors,
  gallery: Image,
  categories: FolderOpen,
  accounts: Wallet,
  measurements: Ruler,
  voiceMeasurements: Mic,
} as const

const SECTIONS: SettingsSectionDef[] = [
  { id: 'shop', title: 'Shop', description: 'Business details & branding', icon: Store, iconClass: 'bg-gradient-to-br from-brand-500 to-brand-700' },
  { id: 'profile', title: 'Profile', description: 'Your account & password', icon: UserCircle, iconClass: 'bg-gradient-to-br from-violet-500 to-violet-700' },
  { id: 'features', title: 'Features', description: 'Enable or disable modules', icon: LayoutGrid, iconClass: 'bg-gradient-to-br from-accent-500 to-accent-700' },
  { id: 'email', title: 'Email', description: 'Admin email notifications', icon: Mail, iconClass: 'bg-gradient-to-br from-emerald-500 to-emerald-700' },
  { id: 'whatsapp', title: 'WhatsApp', description: 'Client message templates', icon: MessageCircle, iconClass: 'bg-gradient-to-br from-green-500 to-green-700' },
]

const SHOP_TYPES: { value: Shop['type']; label: string; labelUr: string; description: string; icon: LucideIcon }[] = [
  { value: 'tailor', label: 'Tailor', labelUr: 'درزی', description: 'Stitching & measurements', icon: ScissorsIcon },
  { value: 'boutique', label: 'Boutique', labelUr: 'بوتیک', description: 'Ready designs & gallery', icon: ShoppingBag },
  { value: 'both', label: 'Both', labelUr: 'دونوں', description: 'Full tailor + boutique', icon: Sparkles },
]

function InlineAlert({ type, message }: { type: 'success' | 'error'; message: string }) {
  const isSuccess = type === 'success'
  return (
    <div
      className={`flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm ${
        isSuccess ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
      }`}
    >
      {isSuccess ? <CheckCircle2 size={18} className="shrink-0" /> : <AlertCircle size={18} className="shrink-0" />}
      <span>{message}</span>
    </div>
  )
}

export function SettingsPage() {
  const { user, refreshUser } = useAuth()
  const [active, setActive] = useState('shop')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [shopSettings, setShopSettings] = useState<Record<string, unknown>>({})
  const [form, setForm] = useState({
    name: '', type: 'tailor', phone: '', email: '', address: '', city: '',
    currency: 'PKR', measurement_unit: 'inch',
  })
  const [modules, setModules] = useState<ShopModuleSettings>(parseModuleSettings())
  const [urduLabels, setUrduLabels] = useState(false)
  const [emailSettings, setEmailSettings] = useState<ShopEmailSettings>(parseEmailSettings())
  const [whatsapp, setWhatsapp] = useState<ShopWhatsAppSettings>({
    enabled: false,
    orderCreatedMessage: '',
    orderReadyMessage: '',
  })
  const [logo, setLogo] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [listCardColors, setListCardColors] = useState(true)
  const [measurementCardColors, setMeasurementCardColors] = useState(true)
  const [profile, setProfile] = useState({ name: '', phone: '', password: '', password_confirmation: '' })
  const shopValidation = useZodForm(shopSettingsFormSchema)
  const profileValidation = useZodForm(profileSettingsFormSchema)

  useEffect(() => {
    api.get<Shop>('/settings').then((res) => {
      const s = res.data
      setForm({
        name: s.name, type: s.type, phone: s.phone || '', email: s.email || '',
        address: s.address || '', city: s.city || '', currency: s.currency,
        measurement_unit: s.measurement_unit,
      })
      setShopSettings(s.settings ?? {})
      setModules(parseModuleSettings(s))
      setUrduLabels(parseUrduLabelsSetting(s))
      setListCardColors(parseListCardColorSetting(s))
      setMeasurementCardColors(parseMeasurementCardColorSetting(s))
      setEmailSettings(parseEmailSettings(s))
      setWhatsapp(parseWhatsAppSettings(s))
      setLogoPreview(s.logo_url)
    }).finally(() => setLoading(false))
    if (user) setProfile({ name: user.name, phone: user.phone || '', password: '', password_confirmation: '' })
  }, [user])

  function clearAlerts() {
    setError('')
    setSuccess('')
  }

  function selectSection(id: string) {
    clearAlerts()
    setActive(id)
  }

  async function saveShop() {
    const data = shopValidation.validate(form)
    if (!data) {
      setError(shopValidation.formError || 'Please fix the highlighted fields.')
      return
    }
    setSaving(true)
    clearAlerts()
    const fd = new FormData()
    Object.entries(data).forEach(([k, v]) => fd.append(k, v ?? ''))
    if (logo) fd.append('logo', logo)
    try {
      await api.post('/settings', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      const settingsRes = await api.put('/settings', {
        settings: measurementCardColorsToPayload(
          listCardColorsToPayload(
            urduLabelsToPayload(shopSettings, urduLabels),
            listCardColors,
          ),
          measurementCardColors,
        ),
      })
      setShopSettings(settingsRes.data.settings ?? {})
      await refreshUser()
      setSuccess('Shop settings saved successfully')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function saveProfile() {
    const data = profileValidation.validate(profile)
    if (!data) {
      setError(profileValidation.formError || 'Please fix the highlighted fields.')
      return
    }
    setSaving(true)
    clearAlerts()
    try {
      const payload: Record<string, string> = { name: data.name, phone: data.phone ?? '' }
      if (data.password) {
        payload.password = data.password
        payload.password_confirmation = data.password_confirmation ?? ''
      }
      await api.put('/auth/profile', payload)
      await refreshUser()
      setProfile((p) => ({ ...p, password: '', password_confirmation: '' }))
      setSuccess('Profile updated successfully')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function saveModules() {
    setSaving(true)
    clearAlerts()
    try {
      await api.put('/settings', {
        settings: moduleSettingsToPayload(shopSettings, modules),
      })
      const res = await api.get<Shop>('/settings')
      setShopSettings(res.data.settings ?? {})
      setModules(parseModuleSettings(res.data))
      await refreshUser()
      setSuccess('Feature settings saved successfully')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function saveEmail() {
    if (emailSettings.enabled && !emailSettings.adminAddress && !form.email) {
      setError('Please set admin email address or shop email in Shop settings')
      return
    }
    setSaving(true)
    clearAlerts()
    try {
      await api.put('/settings', {
        settings: emailSettingsToPayload(shopSettings, emailSettings),
      })
      const res = await api.get<Shop>('/settings')
      setShopSettings(res.data.settings ?? {})
      setEmailSettings(parseEmailSettings(res.data))
      await refreshUser()
      setSuccess('Email notification settings saved successfully')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function saveWhatsApp() {
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
      setSuccess('WhatsApp settings saved successfully')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner />

  const section = SECTIONS.find((s) => s.id === active) ?? SECTIONS[0]
  const shopType = form.type as Shop['type']

  const alert = success ? (
    <InlineAlert type="success" message={success} />
  ) : error ? (
    <InlineAlert type="error" message={error} />
  ) : undefined

  function saveButton(onClick: () => void) {
    return (
      <Button type="button" onClick={onClick} disabled={saving} size="lg">
        {saving ? 'Saving...' : 'Save changes'}
      </Button>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="page-heading">Settings</h2>
        <p className="page-subtitle">Manage your shop, account, modules and notifications</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-6">
        <SettingsNav sections={SECTIONS} active={active} onSelect={selectSection} />

        <div className="min-w-0">
          {active === 'shop' && (
            <SettingsSectionCard section={section} alert={alert} footer={saveButton(saveShop)}>
              <div className="space-y-6">
                <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="size-20 rounded-2xl border border-slate-200 object-cover shadow-sm" />
                  ) : (
                    <div className="flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-3xl font-bold text-white shadow-md">
                      {form.name.charAt(0) || 'S'}
                    </div>
                  )}
                  <div>
                    <p className="mb-1.5 text-sm font-semibold text-slate-800">Shop logo</p>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-brand-200 hover:bg-brand-50/50">
                      <Upload size={16} />
                      {logoPreview ? 'Change logo' : 'Upload logo'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            setLogo(file)
                            setLogoPreview(URL.createObjectURL(file))
                          }
                        }}
                      />
                    </label>
                    <p className="mt-1.5 text-xs text-slate-400">PNG or JPG, up to 2MB</p>
                  </div>
                </div>

                <Input
                  label="Shop name"
                  value={form.name}
                  onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); shopValidation.clearField('name') }}
                  error={shopValidation.fieldErrors.name}
                  required
                />

                <SettingsFieldGroup title="Shop type" description="What kind of business do you run?">
                  <div className="grid gap-3 sm:grid-cols-3">
                    {SHOP_TYPES.map((t) => {
                      const Icon = t.icon
                      const isActive = form.type === t.value
                      return (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, type: t.value }))}
                          className={`flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-all ${
                            isActive
                              ? 'border-brand-300 bg-brand-50/70 ring-1 ring-brand-200'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <span
                            className={`flex size-10 items-center justify-center rounded-xl ${
                              isActive ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            <Icon size={20} />
                          </span>
                          <span className="flex items-baseline gap-1.5">
                            <span className="text-sm font-semibold text-slate-900">{t.label}</span>
                            {urduLabels && <span className="text-xs text-brand-600/80" dir="rtl">{t.labelUr}</span>}
                          </span>
                          <span className="text-xs text-slate-500">{t.description}</span>
                        </button>
                      )
                    })}
                  </div>
                </SettingsFieldGroup>

                <SettingsFieldGroup title="Contact details">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input label="Phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
                    <Input label="Email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                  </div>
                  <Textarea label="Address" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} rows={2} />
                  <Input label="City" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
                </SettingsFieldGroup>

                <SettingsFieldGroup title="Preferences">
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
                </SettingsFieldGroup>

                <FeatureToggle
                  checked={listCardColors}
                  onChange={setListCardColors}
                  label="Colorful listing cards"
                  description="Use soft pastel cards for listing tables and dashboard summaries."
                  icon={<Sparkles size={20} />}
                />

                <FeatureToggle
                  checked={measurementCardColors}
                  onChange={setMeasurementCardColors}
                  label="Colorful measurement cards"
                  description="Use soft pastel cards for measurement records."
                  icon={<Sparkles size={20} />}
                />

                <FeatureToggle
                  checked={urduLabels}
                  onChange={setUrduLabels}
                  label="Show Urdu labels"
                  description="Show Urdu text in menu, dashboard buttons and throughout the app."
                  icon={<Languages size={20} />}
                />
              </div>
            </SettingsSectionCard>
          )}

          {active === 'profile' && (
            <SettingsSectionCard section={section} alert={alert} footer={saveButton(saveProfile)}>
              <div className="space-y-6">
                <SettingsFieldGroup title="Account details">
                  <Input
                    label="Name"
                    value={profile.name}
                    onChange={(e) => { setProfile((p) => ({ ...p, name: e.target.value })); profileValidation.clearField('name') }}
                    error={profileValidation.fieldErrors.name}
                    required
                  />
                  <Input
                    label="Phone"
                    value={profile.phone}
                    onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                  />
                  <Input label="Email" value={user?.email || ''} disabled />
                </SettingsFieldGroup>

                <SettingsFieldGroup title="Change password" description="Leave blank to keep your current password.">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      label="New password"
                      type="password"
                      value={profile.password}
                      onChange={(e) => { setProfile((p) => ({ ...p, password: e.target.value })); profileValidation.clearField('password') }}
                      error={profileValidation.fieldErrors.password}
                      placeholder="••••••••"
                    />
                    <Input
                      label="Confirm password"
                      type="password"
                      value={profile.password_confirmation}
                      onChange={(e) => { setProfile((p) => ({ ...p, password_confirmation: e.target.value })); profileValidation.clearField('password_confirmation') }}
                      error={profileValidation.fieldErrors.password_confirmation}
                      placeholder="••••••••"
                    />
                  </div>
                </SettingsFieldGroup>
              </div>
            </SettingsSectionCard>
          )}

          {active === 'features' && (
            <SettingsSectionCard section={section} alert={alert} footer={saveButton(saveModules)}>
              <div className="space-y-3">
                {MODULE_OPTIONS.map((opt) => {
                  const Icon = MODULE_ICONS[opt.key]
                  const relevant = !opt.forTypes || opt.forTypes.includes(shopType)
                  return (
                    <FeatureToggle
                      key={opt.key}
                      checked={modules[opt.key]}
                      onChange={(checked) => setModules((m) => ({ ...m, [opt.key]: checked }))}
                      label={opt.label}
                      labelUr={opt.labelUr}
                      description={
                        relevant
                          ? opt.description
                          : `${opt.description} (recommended for ${shopType} shops)`
                      }
                      icon={<Icon size={20} />}
                      showUrduLabel={urduLabels}
                    />
                  )
                })}
              </div>
              <p className="mt-4 text-xs text-slate-400">
                Dashboard and Settings are always visible. Disabled modules are hidden from the menu, forms, and listings.
              </p>
            </SettingsSectionCard>
          )}

          {active === 'email' && (
            <SettingsSectionCard section={section} alert={alert} footer={saveButton(saveEmail)}>
              <div className="space-y-5">
                <FeatureToggle
                  checked={emailSettings.enabled}
                  onChange={(checked) => setEmailSettings((e) => ({ ...e, enabled: checked }))}
                  label="Enable email notifications"
                  labelUr="ای میل نوٹیفکیشن"
                  description="Send automatic emails to admin when orders and accounts change."
                  icon={<Mail size={20} />}
                  showUrduLabel={urduLabels}
                />

                <Input
                  label="Admin email address"
                  type="email"
                  value={emailSettings.adminAddress}
                  onChange={(e) => setEmailSettings((s) => ({ ...s, adminAddress: e.target.value }))}
                  placeholder={form.email || 'Uses shop email if empty'}
                  disabled={!emailSettings.enabled}
                />

                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                  <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Bell size={16} /> Order emails
                    <span className="font-normal text-slate-400">— includes full customer details &amp; sizes</span>
                  </p>
                  <div className="space-y-2">
                    <FeatureToggle
                      checked={emailSettings.onOrderCreated}
                      onChange={(c) => setEmailSettings((e) => ({ ...e, onOrderCreated: c }))}
                      label="New order placed"
                      labelUr="نیا آرڈر"
                      disabled={!emailSettings.enabled}
                      showUrduLabel={urduLabels}
                    />
                    <FeatureToggle
                      checked={emailSettings.onOrderUpdated}
                      onChange={(c) => setEmailSettings((e) => ({ ...e, onOrderUpdated: c }))}
                      label="Order updated"
                      labelUr="آرڈر اپڈیٹ"
                      disabled={!emailSettings.enabled}
                      showUrduLabel={urduLabels}
                    />
                    <FeatureToggle
                      checked={emailSettings.onOrderReady}
                      onChange={(c) => setEmailSettings((e) => ({ ...e, onOrderReady: c }))}
                      label="Order ready for delivery"
                      labelUr="آرڈر تیار"
                      disabled={!emailSettings.enabled}
                      showUrduLabel={urduLabels}
                    />
                    <FeatureToggle
                      checked={emailSettings.onPaymentReceived}
                      onChange={(c) => setEmailSettings((e) => ({ ...e, onPaymentReceived: c }))}
                      label="Payment received"
                      labelUr="ادائیگی موصول"
                      disabled={!emailSettings.enabled}
                      showUrduLabel={urduLabels}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
                  <p className="mb-3 text-sm font-semibold text-emerald-800">
                    Account emails <span className="font-normal text-emerald-600/80">— separate job</span>
                  </p>
                  <FeatureToggle
                    checked={emailSettings.onTransaction}
                    onChange={(c) => setEmailSettings((e) => ({ ...e, onTransaction: c }))}
                    label="Income & expense transactions"
                    labelUr="آمدن اور خرچ"
                    description="Detailed account email when any income or expense is recorded."
                    disabled={!emailSettings.enabled}
                    showUrduLabel={urduLabels}
                  />
                </div>
              </div>
            </SettingsSectionCard>
          )}

          {active === 'whatsapp' && (
            <SettingsSectionCard section={section} alert={alert} footer={saveButton(saveWhatsApp)}>
              <div className="space-y-5">
                <FeatureToggle
                  checked={whatsapp.enabled}
                  onChange={(checked) => setWhatsapp((w) => ({ ...w, enabled: checked }))}
                  label="Enable WhatsApp messaging"
                  labelUr="واٹس ایپ"
                  description="Show WhatsApp on orders and prompt when an order is placed or marked ready."
                  icon={<MessageCircle size={20} />}
                  showUrduLabel={urduLabels}
                />

                <div className="rounded-xl bg-brand-50/60 px-4 py-3 text-xs text-brand-700">
                  {WHATSAPP_TEMPLATE_HINT}
                </div>

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
                  Leave message fields empty to use the default text shown in each placeholder.
                </p>
              </div>
            </SettingsSectionCard>
          )}
        </div>
      </div>
    </div>
  )
}
