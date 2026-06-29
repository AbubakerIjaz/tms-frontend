import type { Shop } from '../types'

export interface ShopModuleSettings {
  clients: boolean
  orders: boolean
  designs: boolean
  garmentTypes: boolean
  gallery: boolean
  categories: boolean
  accounts: boolean
  measurements: boolean
  voiceMeasurements: boolean
}

export interface ShopEmailSettings {
  enabled: boolean
  adminAddress: string
  onOrderCreated: boolean
  onOrderUpdated: boolean
  onOrderReady: boolean
  onPaymentReceived: boolean
  onTransaction: boolean
}

export interface ShopFeatureSettings {
  modules: ShopModuleSettings
  email: ShopEmailSettings
  urduLabels: boolean
}

const MODULE_KEY_MAP: Record<keyof ShopModuleSettings, string> = {
  clients: 'module_clients',
  orders: 'module_orders',
  designs: 'module_designs',
  garmentTypes: 'module_garment_types',
  gallery: 'module_gallery',
  categories: 'module_categories',
  accounts: 'module_accounts',
  measurements: 'module_measurements',
  voiceMeasurements: 'module_voice_measurements',
}

function isTruthy(value: unknown): boolean {
  return value === true || value === 1 || value === '1'
}

function defaultsForType(type: Shop['type']): ShopModuleSettings {
  const all: ShopModuleSettings = {
    clients: true,
    orders: true,
    designs: true,
    garmentTypes: true,
    gallery: true,
    categories: true,
    accounts: true,
    measurements: true,
    voiceMeasurements: true,
  }
  if (type === 'boutique') {
    all.garmentTypes = false
    all.measurements = false
    all.voiceMeasurements = false
  }
  return all
}

export function parseModuleSettings(shop?: Shop | null): ShopModuleSettings {
  const settings = shop?.settings ?? {}
  const defaults = defaultsForType(shop?.type ?? 'tailor')
  const result = { ...defaults }
  for (const [key, settingKey] of Object.entries(MODULE_KEY_MAP) as [keyof ShopModuleSettings, string][]) {
    if (settingKey in settings) {
      result[key] = isTruthy(settings[settingKey])
    }
  }
  return result
}

export function parseEmailSettings(shop?: Shop | null): ShopEmailSettings {
  const settings = shop?.settings ?? {}
  return {
    enabled: isTruthy(settings.email_enabled),
    adminAddress: String(settings.email_admin_address ?? '').trim(),
    onOrderCreated: settings.email_on_order_created !== undefined ? isTruthy(settings.email_on_order_created) : true,
    onOrderUpdated: settings.email_on_order_updated !== undefined ? isTruthy(settings.email_on_order_updated) : true,
    onOrderReady: settings.email_on_order_ready !== undefined ? isTruthy(settings.email_on_order_ready) : true,
    onPaymentReceived: settings.email_on_payment_received !== undefined ? isTruthy(settings.email_on_payment_received) : true,
    onTransaction: settings.email_on_transaction !== undefined ? isTruthy(settings.email_on_transaction) : true,
  }
}

export function parseUrduLabelsSetting(shop?: Shop | null): boolean {
  return isTruthy(shop?.settings?.urdu_labels_enabled)
}

export function parseFeatureSettings(shop?: Shop | null): ShopFeatureSettings {
  return {
    modules: parseModuleSettings(shop),
    email: parseEmailSettings(shop),
    urduLabels: parseUrduLabelsSetting(shop),
  }
}

export function moduleSettingsToPayload(
  current: Record<string, unknown>,
  modules: ShopModuleSettings,
): Record<string, unknown> {
  const payload = { ...current }
  for (const [key, settingKey] of Object.entries(MODULE_KEY_MAP) as [keyof ShopModuleSettings, string][]) {
    payload[settingKey] = modules[key]
  }
  return payload
}

export function emailSettingsToPayload(
  current: Record<string, unknown>,
  email: ShopEmailSettings,
): Record<string, unknown> {
  return {
    ...current,
    email_enabled: email.enabled,
    email_admin_address: email.adminAddress,
    email_on_order_created: email.onOrderCreated,
    email_on_order_updated: email.onOrderUpdated,
    email_on_order_ready: email.onOrderReady,
    email_on_payment_received: email.onPaymentReceived,
    email_on_transaction: email.onTransaction,
  }
}

export function urduLabelsToPayload(
  current: Record<string, unknown>,
  enabled: boolean,
): Record<string, unknown> {
  return {
    ...current,
    urdu_labels_enabled: enabled,
  }
}

export const MODULE_OPTIONS: {
  key: keyof ShopModuleSettings
  label: string
  labelUr: string
  description: string
  forTypes?: Shop['type'][]
}[] = [
  { key: 'clients', label: 'Clients', labelUr: 'گاہک', description: 'Customer list and profiles' },
  { key: 'orders', label: 'Orders', labelUr: 'آرڈرز', description: 'Order management and tracking' },
  { key: 'designs', label: 'Designs', labelUr: 'ڈیزائن', description: 'Design catalog with prices', forTypes: ['boutique', 'both'] },
  { key: 'garmentTypes', label: 'Garment Types', labelUr: 'کپڑے کی اقسام', description: 'Measurement fields per garment', forTypes: ['tailor', 'both'] },
  { key: 'gallery', label: 'Gallery', labelUr: 'گیلری', description: 'Photo showcase for customers', forTypes: ['boutique', 'both'] },
  { key: 'categories', label: 'Categories', labelUr: 'زمرے', description: 'Gallery categories', forTypes: ['boutique', 'both'] },
  { key: 'accounts', label: 'Accounts', labelUr: 'اکاؤنٹس', description: 'Income and expense ledger' },
  { key: 'measurements', label: 'Measurements', labelUr: 'ناپ', description: 'Stitching sizes and measurements', forTypes: ['tailor', 'both'] },
  { key: 'voiceMeasurements', label: 'Voice Measurements', labelUr: 'آواز سے ناپ', description: 'Add measurements by speaking or typing', forTypes: ['tailor', 'both'] },
]

export function isModuleVisible(
  moduleKey: keyof ShopModuleSettings,
  shop?: Shop | null,
): boolean {
  return parseModuleSettings(shop)[moduleKey]
}
