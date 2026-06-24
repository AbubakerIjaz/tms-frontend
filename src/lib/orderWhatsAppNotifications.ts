import type { Order, Shop } from '../types'
import type { WhatsAppOrderPrompt } from '../components/WhatsAppOrderMessageModal'
import { isWhatsAppEnabled } from './whatsappSettings'
import { sanitizePkPhoneNumber } from './whatsapp'

function phonePrompt(order: Order, kind: WhatsAppOrderPrompt['kind']): WhatsAppOrderPrompt | null {
  const phone = order.client?.phone
  if (!phone || !sanitizePkPhoneNumber(phone)) return null
  return { kind, order, phone }
}

/** Prompt after a new order is created (if WhatsApp enabled). */
export function createOrderCreatedWhatsAppPrompt(
  order: Order,
  shop?: Shop | null,
): WhatsAppOrderPrompt | null {
  if (!isWhatsAppEnabled(shop)) return null
  return phonePrompt(order, 'order_created')
}

/** Prompt when status becomes ready (if WhatsApp enabled). */
export function createOrderReadyWhatsAppPrompt(
  order: Order,
  newStatus: string,
  shop?: Shop | null,
): WhatsAppOrderPrompt | null {
  if (!isWhatsAppEnabled(shop)) return null
  if (newStatus !== 'ready') return null
  return phonePrompt({ ...order, status: 'ready' }, 'order_ready')
}
