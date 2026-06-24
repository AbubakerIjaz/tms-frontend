import type { Order } from '../types'

/** Client detail URL with optional order modal query. */
export function clientOrderUrl(clientId: number | string, orderId?: number | string): string {
  const base = `/clients/${clientId}`
  return orderId != null ? `${base}?order=${orderId}` : base
}

/** Resolve order from client list or return enriched copy. */
export function resolveClientOrder(orders: Order[] | undefined, orderId: string, client?: Order['client']): Order | null {
  const order = orders?.find((o) => String(o.id) === orderId)
  if (!order) return null
  return client ? { ...order, client: order.client ?? client } : order
}
