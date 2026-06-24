import { MessageCircle, Wallet } from 'lucide-react'
import type { Order } from '../types'
import { Button } from './ui/Button'

interface OrderRowActionsProps {
  order: Order
  whatsAppEnabled: boolean
  canWhatsApp: boolean
  onWhatsApp: () => void
  onPay?: () => void
}

export function OrderRowActions({
  order,
  whatsAppEnabled,
  canWhatsApp,
  onWhatsApp,
  onPay,
}: OrderRowActionsProps) {
  const showPay = (order.balance ?? 0) > 0 && order.payment_status !== 'paid' && onPay
  const showWhatsApp = whatsAppEnabled && canWhatsApp

  if (!showPay && !showWhatsApp) {
    return <span className="text-xs text-slate-300">—</span>
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      {showWhatsApp && (
        <button
          type="button"
          title="Send WhatsApp notification"
          onClick={onWhatsApp}
          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-800 transition hover:bg-emerald-100"
        >
          <MessageCircle size={14} />
          WhatsApp
        </button>
      )}
      {showPay && (
        <Button size="sm" variant="secondary" onClick={onPay} className="!px-2.5">
          <Wallet size={14} />
          Pay
        </Button>
      )}
    </div>
  )
}
