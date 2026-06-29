import { useMemo } from 'react'
import { MessageCircle, Pencil } from 'lucide-react'
import type { Order } from '../types'
import { ActionMenu, type ActionMenuItem } from './ui/ActionMenu'

interface OrderRowActionsProps {
  order: Order
  whatsAppEnabled: boolean
  canWhatsApp: boolean
  onWhatsApp: () => void
  onEdit?: () => void
}

export function OrderRowActions({
  order,
  whatsAppEnabled,
  canWhatsApp,
  onWhatsApp,
  onEdit,
}: OrderRowActionsProps) {
  const items = useMemo<ActionMenuItem[]>(() => {
    const actions: ActionMenuItem[] = []

    if (onEdit) {
      actions.push({
        id: 'edit',
        label: 'Edit order',
        icon: <Pencil size={16} />,
        onClick: onEdit,
      })
    }

    if (whatsAppEnabled && canWhatsApp) {
      actions.push({
        id: 'whatsapp',
        label: 'Send WhatsApp',
        icon: <MessageCircle size={16} />,
        variant: 'success',
        onClick: onWhatsApp,
      })
    }

    return actions
  }, [onEdit, onWhatsApp, whatsAppEnabled, canWhatsApp])

  return (
    <ActionMenu
      items={items}
      ariaLabel={`Actions for order ${order.order_number}`}
    />
  )
}
