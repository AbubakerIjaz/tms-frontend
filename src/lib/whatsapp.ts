const PK_COUNTRY_CODE = '92'

/** Minimum national digits after country code (e.g. 3001234567). */
const MIN_NATIONAL_DIGITS = 9
/** Maximum national digits after country code (landlines included). */
const MAX_NATIONAL_DIGITS = 11

export type OpenWhatsAppResult =
  | { ok: true; url: string }
  | { ok: false; reason: 'invalid_phone' | 'empty_message' | 'popup_blocked' | 'unavailable' }

/**
 * Normalizes Pakistani phone numbers to wa.me format: digits only, leading 92.
 * Accepts +92, 0092, 03xx, and bare mobile numbers.
 */
export function sanitizePkPhoneNumber(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null

  let digits = raw.replace(/\D/g, '')
  if (!digits) return null

  if (digits.startsWith('00')) {
    digits = digits.slice(2)
  }

  if (digits.startsWith('0')) {
    digits = PK_COUNTRY_CODE + digits.slice(1)
  } else if (!digits.startsWith(PK_COUNTRY_CODE)) {
    digits = PK_COUNTRY_CODE + digits
  }

  if (!digits.startsWith(PK_COUNTRY_CODE)) return null

  const nationalDigits = digits.length - PK_COUNTRY_CODE.length
  if (nationalDigits < MIN_NATIONAL_DIGITS || nationalDigits > MAX_NATIONAL_DIGITS) {
    return null
  }

  return digits
}

/** Builds a wa.me deep link with an encoded message payload. */
export function buildWhatsAppDeepLink(phone: string, message: string): string | null {
  const sanitized = sanitizePkPhoneNumber(phone)
  const trimmedMessage = message.trim()
  if (!sanitized || !trimmedMessage) return null

  return `https://wa.me/${sanitized}?text=${encodeURIComponent(trimmedMessage)}`
}

/**
 * Opens WhatsApp in a new tab via the universal wa.me scheme.
 * Uses noopener/noreferrer and clears opener for safety.
 */
export function openWhatsAppChat(phone: string, message: string): OpenWhatsAppResult {
  const url = buildWhatsAppDeepLink(phone, message)
  if (!url) {
    if (!message.trim()) return { ok: false, reason: 'empty_message' }
    return { ok: false, reason: 'invalid_phone' }
  }

  if (typeof window === 'undefined') {
    return { ok: false, reason: 'unavailable' }
  }

  const popup = window.open(url, '_blank', 'noopener,noreferrer')
  if (!popup) {
    return { ok: false, reason: 'popup_blocked' }
  }

  popup.opener = null
  return { ok: true, url }
}
