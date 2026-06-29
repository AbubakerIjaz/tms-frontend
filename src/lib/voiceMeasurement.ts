import { api } from './api'
import type { Client } from '../types'
import type { StitchingSection } from '../types/stitching'

export interface VoiceParseResult {
  client_hint: string | null
  label: string | null
  sections: StitchingSection[]
  warnings: string[]
  transcript: string
  matched_clients: Pick<Client, 'id' | 'name' | 'phone'>[]
}

export interface VoiceSavePayload {
  client_id: number
  text?: string
  label?: string | null
  sections: StitchingSection[]
  notes?: string | null
  measured_at?: string
}

export async function parseVoiceMeasurement(text: string): Promise<VoiceParseResult> {
  const { data } = await api.post<VoiceParseResult>('/voice-measurements/parse', { text })
  return data
}

export async function saveVoiceMeasurement(payload: VoiceSavePayload) {
  const { data } = await api.post('/voice-measurements', {
    ...payload,
    measured_at: payload.measured_at ?? new Date().toISOString().split('T')[0],
  })
  return data
}

export const VOICE_EXAMPLES = [
  'Kameez length 42 chest 24 waist 22 bottom 25 sleeves 24',
  'For Ahmed kameez length 43 chest 25 shalwar length 41 bottom 8',
  'Shalwar length 40 in seam 16 bottom 7.5',
  'Kameez lamba 42 chati 24 kamar 22',
]

export const VOICE_HINT =
  'Speak or type naturally. Example: "Kameez length 42 chest 24 shalwar length 40". You can also say "for [client name]" at the start.'

export const VOICE_HINT_UR =
  'آسانی سے بولیں یا لکھیں۔ مثال: "Kameez length 42 chest 24"'
