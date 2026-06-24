import type { Shop } from '../types'

export interface ShopWhatsAppSettings {
  enabled: boolean
  orderCreatedMessage: string
  orderReadyMessage: string
}

export const WHATSAPP_TEMPLATE_HINT =
  'Placeholders: {client_name}, {order_number}, {shop_name}, {item}, {total}, {balance}, {due_date}, {shop_phone}'

export const DEFAULT_ORDER_CREATED_TEMPLATE = `Assalam-o-Alaikum {client_name},

Thank you for your order at *{shop_name}*.

Order #: {order_number}
{item}
Total: {total}
Due date: {due_date}

We will notify you when your order is ready. Shukriya!

Contact: {shop_phone}`

export const DEFAULT_ORDER_READY_TEMPLATE = `Assalam-o-Alaikum {client_name},

Your order *{order_number}* is ready for pickup at *{shop_name}*.
{item}
{balance_line}

Please visit us at your convenience. Shukriya!

Contact: {shop_phone}`

export function parseWhatsAppSettings(shop?: Shop | null): ShopWhatsAppSettings {
  const settings = shop?.settings ?? {}
  const raw = settings.whatsapp_enabled
  const enabled = raw === true || raw === 1 || raw === '1'
  return {
    enabled,
    orderCreatedMessage: String(settings.whatsapp_order_created_message ?? '').trim(),
    orderReadyMessage: String(settings.whatsapp_order_ready_message ?? '').trim(),
  }
}

export function isWhatsAppEnabled(shop?: Shop | null): boolean {
  return parseWhatsAppSettings(shop).enabled
}

export function whatsAppSettingsToPayload(
  current: Record<string, unknown>,
  wa: ShopWhatsAppSettings,
): Record<string, unknown> {
  return {
    ...current,
    whatsapp_enabled: wa.enabled,
    whatsapp_order_created_message: wa.orderCreatedMessage,
    whatsapp_order_ready_message: wa.orderReadyMessage,
  }
}
