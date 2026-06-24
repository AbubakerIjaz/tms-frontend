import type { Order, Shop } from '../types'
import { formatCurrency, formatDate } from '../components/ui/Badge'
import {
  DEFAULT_ORDER_CREATED_TEMPLATE,
  DEFAULT_ORDER_READY_TEMPLATE,
  parseWhatsAppSettings,
} from './whatsappSettings'

export interface OrderMessageInput {
  order: Order
  shop?: Shop | null
  currency?: string
}

export function getOrderItemLabel(order: Order): string | null {
  return order.design?.name || order.garment_type?.name || null
}

function messageVariables({ order, shop, currency = 'PKR' }: OrderMessageInput): Record<string, string> {
  const clientName = order.client?.name?.trim() || 'Customer'
  const shopName = shop?.name?.trim() || 'our shop'
  const item = getOrderItemLabel(order)
  const balance = order.balance ?? Math.max(0, Number(order.total_amount) - Number(order.paid_amount))

  return {
    client_name: clientName,
    order_number: order.order_number,
    shop_name: shopName,
    item: item ? `Item: ${item}` : '',
    total: formatCurrency(order.total_amount, currency),
    balance: formatCurrency(balance, currency),
    balance_line: balance > 0 ? `Remaining balance: ${formatCurrency(balance, currency)}` : '',
    due_date: order.due_date ? formatDate(order.due_date) : '—',
    shop_phone: shop?.phone?.trim() ? `Contact: ${shop.phone.trim()}` : '',
  }
}

function applyTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? '').trim()
}

/** Order placed — uses custom template from settings or default. */
export function buildOrderCreatedMessage(input: OrderMessageInput): string {
  const vars = messageVariables(input)
  const custom = parseWhatsAppSettings(input.shop).orderCreatedMessage
  const template = custom || DEFAULT_ORDER_CREATED_TEMPLATE
  return applyTemplate(template, vars)
}

/** Order ready — uses custom template from settings or default. */
export function buildOrderReadyMessage(input: OrderMessageInput): string {
  const vars = messageVariables(input)
  const custom = parseWhatsAppSettings(input.shop).orderReadyMessage
  const template = custom || DEFAULT_ORDER_READY_TEMPLATE
  return applyTemplate(template, vars)
}
