import type { Order, OrderItem, OrderSuitDraft } from '../types'

export function createDefaultSuitItems(): OrderSuitDraft[] {
  return [{
    key: `suit-${Date.now()}`,
    label: 'Kameez',
    design_id: '',
    garment_type_id: '',
    design: null,
  }]
}

export function orderItemsToSuitDrafts(items: OrderItem[] | undefined): OrderSuitDraft[] {
  if (!items?.length) return createDefaultSuitItems()
  return items.map((item, i) => ({
    key: `item-${item.id ?? i}`,
    label: item.label || `Suit ${i + 1}`,
    design_id: item.design_id ? String(item.design_id) : '',
    garment_type_id: item.garment_type_id ? String(item.garment_type_id) : '',
    design: item.design ?? null,
  }))
}

export function suitDraftsToPayload(items: OrderSuitDraft[]) {
  return items
    .filter((i) => i.design_id || i.garment_type_id || i.label.trim())
    .map((i) => ({
      label: i.label.trim() || undefined,
      design_id: i.design_id ? Number(i.design_id) : null,
      garment_type_id: i.garment_type_id ? Number(i.garment_type_id) : null,
    }))
}

export function appendOrderItemsToFormData(fd: FormData, items: OrderSuitDraft[]) {
  const payload = suitDraftsToPayload(items)
  fd.append('items', JSON.stringify(payload))
  if (items[0]?.design_id) fd.append('design_id', items[0].design_id)
  if (items[0]?.garment_type_id) fd.append('garment_type_id', items[0].garment_type_id)
}

export function appendOrderImagesToFormData(fd: FormData, files: File[]) {
  files.forEach((file) => fd.append('images[]', file))
}

export function orderSuitCount(order: { items_count?: number; items?: unknown[]; design_id?: number | null; garment_type_id?: number | null }): number {
  if (order.items_count != null && order.items_count > 0) return order.items_count
  if (order.items?.length) return order.items.length
  if (order.design_id || order.garment_type_id) return 1
  return 0
}

export interface OrderDesignSummary {
  names: string[]
  designCount: number
  totalPieces: number
}

export function orderDesignSummary(order: Order): OrderDesignSummary {
  const items = order.items ?? []

  if (items.length > 0) {
    const names: string[] = []
    let designCount = 0

    for (const item of items) {
      if (item.design?.name) {
        designCount += 1
        if (!names.includes(item.design.name)) names.push(item.design.name)
      }
    }

    return { names, designCount, totalPieces: items.length }
  }

  const fallback = order.design?.name
  return {
    names: fallback ? [fallback] : [],
    designCount: fallback ? 1 : 0,
    totalPieces: order.design_id || order.garment_type_id ? 1 : 0,
  }
}
