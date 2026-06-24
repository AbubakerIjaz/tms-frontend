import { useEffect, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import type { Order, Shop } from '../types'
import { buildOrderCreatedMessage, buildOrderReadyMessage } from '../lib/orderWhatsAppMessage'
import { openWhatsAppChat, sanitizePkPhoneNumber } from '../lib/whatsapp'
import { Button } from './ui/Button'
import { Modal } from './ui/Modal'
import { Textarea } from './ui/Textarea'

export interface WhatsAppOrderPrompt {
  kind: 'order_created' | 'order_ready'
  order: Order
  phone: string
}

interface WhatsAppOrderMessageModalProps {
  prompt: WhatsAppOrderPrompt | null
  shop?: Shop | null
  currency?: string
  onClose: () => void
}

export function WhatsAppOrderMessageModal({
  prompt,
  shop,
  currency = 'PKR',
  onClose,
}: WhatsAppOrderMessageModalProps) {
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!prompt) {
      setMessage('')
      setError('')
      return
    }

    const input = { order: prompt.order, shop, currency }
    setMessage(
      prompt.kind === 'order_created'
        ? buildOrderCreatedMessage(input)
        : buildOrderReadyMessage(input),
    )
    setError('')
  }, [prompt, shop, currency])

  if (!prompt) return null

  const sanitizedPhone = sanitizePkPhoneNumber(prompt.phone)
  const clientName = prompt.order.client?.name || 'Customer'
  const isCreated = prompt.kind === 'order_created'

  function handleSend() {
    setError('')
    const result = openWhatsAppChat(prompt!.phone, message)
    if (!result.ok) {
      if (result.reason === 'popup_blocked') {
        setError('Popup blocked. Allow popups for this site and try again.')
      } else if (result.reason === 'invalid_phone') {
        setError('Invalid phone number. Update the client contact and try again.')
      } else {
        setError('Could not open WhatsApp. Please try again.')
      }
      return
    }
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isCreated ? 'Send order confirmation on WhatsApp?' : 'Notify client on WhatsApp?'}
      size="md"
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          {isCreated ? (
            <>
              Order <span className="font-semibold text-slate-900">{prompt.order.order_number}</span>{' '}
              was created. Send a WhatsApp message to{' '}
              <span className="font-semibold text-slate-900">{clientName}</span>?
            </>
          ) : (
            <>
              Order <span className="font-semibold text-slate-900">{prompt.order.order_number}</span> is
              ready. Send a WhatsApp message to{' '}
              <span className="font-semibold text-slate-900">{clientName}</span>?
            </>
          )}
        </p>

        {sanitizedPhone ? (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            Opens WhatsApp for +{sanitizedPhone}
          </p>
        ) : (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            Invalid phone number on file. Update the client profile before sending.
          </p>
        )}

        <Textarea
          label="Message preview"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={8}
          disabled={!sanitizedPhone}
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Skip
          </Button>
          <Button
            type="button"
            className="border-emerald-200 bg-emerald-600 text-white hover:bg-emerald-700"
            disabled={!sanitizedPhone || !message.trim()}
            onClick={handleSend}
          >
            <MessageCircle size={18} />
            Send on WhatsApp
          </Button>
        </div>
      </div>
    </Modal>
  )
}

/** @deprecated Use WhatsAppOrderMessageModal */
export const WhatsAppOrderReadyModal = WhatsAppOrderMessageModal
