import { useCallback, useEffect, useMemo, useState } from 'react'
import { Mic, MicOff, Sparkles, User } from 'lucide-react'
import { api, getErrorMessage } from '../lib/api'
import {
  parseVoiceMeasurement,
  saveVoiceMeasurement,
  VOICE_EXAMPLES,
  VOICE_HINT,
  VOICE_HINT_UR,
  type VoiceParseResult,
} from '../lib/voiceMeasurement'
import { useAuth } from '../context/AuthContext'
import { useShopFeatures } from '../hooks/useShopFeatures'
import { useVoiceInput } from '../hooks/useVoiceInput'
import { useZodForm } from '../hooks/useZodForm'
import { voiceClientSchema, voiceParseSchema } from '../lib/validation'
import type { Client, Paginated } from '../types'
import { Button } from './ui/Button'
import { Textarea } from './ui/Textarea'
import { Card, CardBody, CardHeader } from './ui/Card'
import { Select } from './ui/Select'

interface VoiceMeasurementPanelProps {
  defaultClientId?: number
  defaultClientName?: string
  compact?: boolean
  onSaved?: () => void
}

function clientOptionLabel(client: Client): string {
  const parts = [client.name]
  if (client.phone) parts.push(client.phone)
  return parts.join(' · ')
}

export function VoiceMeasurementPanel({
  defaultClientId,
  defaultClientName,
  compact,
  onSaved,
}: VoiceMeasurementPanelProps) {
  const { user } = useAuth()
  const { showUrduLabels } = useShopFeatures()
  const unit = user?.shop?.measurement_unit ?? 'inch'
  const lockedClient = Boolean(defaultClientId)

  const [text, setText] = useState('')
  const [parsed, setParsed] = useState<VoiceParseResult | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [clientsLoading, setClientsLoading] = useState(true)
  const [clientId, setClientId] = useState(String(defaultClientId ?? ''))
  const [parsing, setParsing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const voiceValidation = useZodForm(voiceParseSchema)
  const clientValidation = useZodForm(voiceClientSchema)

  const appendTranscript = useCallback((chunk: string) => {
    setText((prev) => {
      if (!prev) return chunk
      if (prev.endsWith(chunk) || chunk.startsWith(prev)) return chunk
      return `${prev} ${chunk}`.trim()
    })
  }, [])

  const { listening, supported, toggle } = useVoiceInput(appendTranscript)

  useEffect(() => {
    setClientsLoading(true)
    api
      .get<Paginated<Client>>('/clients', { params: { per_page: 200, sort: 'name' } })
      .then((res) => setClients(res.data.data))
      .finally(() => setClientsLoading(false))
  }, [])

  useEffect(() => {
    if (defaultClientId) setClientId(String(defaultClientId))
  }, [defaultClientId])

  const selectedClient = useMemo(
    () => clients.find((c) => String(c.id) === clientId) ?? null,
    [clients, clientId],
  )

  const clientOptions = useMemo(
    () => clients.map((c) => ({ value: String(c.id), label: clientOptionLabel(c) })),
    [clients],
  )

  async function handleParse() {
    const data = voiceValidation.validate({ client_id: clientId, text })
    if (!data) return
    setParsing(true)
    setError('')
    setSuccess('')
    try {
      const result = await parseVoiceMeasurement(data.text)
      setParsed(result)
      if (!lockedClient && result.matched_clients?.length === 1) {
        setClientId(String(result.matched_clients[0].id))
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setParsing(false)
    }
  }

  async function handleSave() {
    if (!parsed?.sections?.length) {
      setError('Parse measurements first')
      return
    }
    const clientData = clientValidation.validate({ client_id: clientId })
    if (!clientData) return
    setSaving(true)
    setError('')
    try {
      await saveVoiceMeasurement({
        client_id: Number(clientData.client_id),
        text,
        label: parsed.label,
        sections: parsed.sections,
        notes: text,
      })
      setSuccess(
        selectedClient
          ? `Measurement saved for ${selectedClient.name}`
          : 'Measurement saved successfully',
      )
      setText('')
      setParsed(null)
      onSaved?.()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  function applyExample(example: string) {
    setText(example)
    setParsed(null)
    setError('')
  }

  const clientLabel = showUrduLabels ? 'گاہک منتخب کریں' : 'Select client'
  const clientSearchPlaceholder = showUrduLabels ? 'نام یا فون سے تلاش…' : 'Search by name or phone…'

  return (
    <Card className={compact ? '' : 'border-brand-100'}>
      <CardHeader
        title="Voice Measurements"
        action={
          supported ? (
            <Button type="button" size="sm" variant={listening ? 'danger' : 'primary'} onClick={toggle}>
              {listening ? <MicOff size={16} /> : <Mic size={16} />}
              {listening ? 'Stop' : 'Speak'}
            </Button>
          ) : null
        }
      />
      <CardBody className="space-y-4">
        <p className="text-sm text-slate-500">{showUrduLabels ? VOICE_HINT_UR : VOICE_HINT}</p>

        {lockedClient && defaultClientName ? (
          <div className="flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50/60 px-4 py-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-brand-100 text-brand-700">
              <User size={18} />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-brand-600">
                {showUrduLabels ? 'گاہک' : 'Client'}
              </p>
              <p className="font-semibold text-slate-900">{defaultClientName}</p>
            </div>
          </div>
        ) : (
          <Select
            label={clientLabel}
            searchable
            searchPlaceholder={clientSearchPlaceholder}
            placeholder={clientsLoading ? 'Loading clients…' : 'Choose a client…'}
            value={clientId}
            onChange={(e) => {
              setClientId(e.target.value)
              voiceValidation.clearField('client_id')
              clientValidation.clearField('client_id')
              setError('')
            }}
            error={voiceValidation.fieldErrors.client_id || clientValidation.fieldErrors.client_id}
            disabled={clientsLoading}
            required
            options={[{ value: '', label: 'Choose a client…' }, ...clientOptions]}
          />
        )}

        {selectedClient && !lockedClient && (
          <p className="text-sm text-slate-600">
            <span className="font-medium text-slate-800">{selectedClient.name}</span>
            {selectedClient.phone ? ` · ${selectedClient.phone}` : ''}
            {showUrduLabels ? ' — اس گاہک کے لیے ناپ محفوظ ہوگا' : ' — measurements will save to this client'}
          </p>
        )}

        {!supported && (
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
            Type measurements below, or use the microphone on your keyboard to dictate.
          </p>
        )}

        <Textarea
          label={showUrduLabels ? 'کیا ناپ لیا؟' : 'What did you measure?'}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setParsed(null)
            voiceValidation.clearField('text')
          }}
          error={voiceValidation.fieldErrors.text}
          rows={compact ? 3 : 4}
          placeholder='e.g. "Kameez length 42 chest 24 shalwar length 40 bottom 8"'
          disabled={!clientId}
        />

        {!clientId && !lockedClient && (
          <p className="text-sm text-amber-700">Select a client above before adding measurements.</p>
        )}

        <div className="flex flex-wrap gap-2">
          {VOICE_EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => applyExample(ex)}
              disabled={!clientId}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 hover:border-brand-200 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {ex.length > 48 ? `${ex.slice(0, 48)}…` : ex}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={handleParse}
            disabled={parsing || !text.trim() || !clientId}
          >
            <Sparkles size={16} /> {parsing ? 'Understanding…' : 'Understand'}
          </Button>
        </div>

        {parsed && (
          <div className="space-y-4 rounded-2xl border border-brand-100 bg-brand-50/40 p-4">
            {parsed.warnings.length > 0 && (
              <ul className="space-y-1 text-sm text-amber-700">
                {parsed.warnings.map((w) => (
                  <li key={w}>• {w}</li>
                ))}
              </ul>
            )}

            {parsed.sections.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {parsed.sections.map((section, i) => (
                  <div key={i} className="rounded-xl bg-white p-3 shadow-sm">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-700">{section.name}</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {Object.entries(section.measurements).map(([key, val]) => (
                        <div key={key} className="rounded bg-slate-50 px-2 py-1.5 text-sm">
                          <span className="text-slate-500">{key}:</span>{' '}
                          <span className="font-medium">{val} {unit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {!lockedClient && parsed.matched_clients && parsed.matched_clients.length > 1 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">
                  {showUrduLabels ? 'نام ملتا ہوا — منتخب کریں' : 'Name match — pick client'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {parsed.matched_clients.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setClientId(String(c.id))}
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                        clientId === String(c.id)
                          ? 'bg-brand-600 text-white'
                          : 'bg-white text-slate-700 ring-1 ring-slate-200'
                      }`}
                    >
                      <User size={12} /> {c.name}
                      {c.phone ? ` · ${c.phone}` : ''}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Button type="button" onClick={handleSave} disabled={saving || !parsed.sections.length || !clientId}>
              {saving ? 'Saving…' : showUrduLabels ? 'ناپ محفوظ کریں' : 'Save measurement'}
            </Button>
          </div>
        )}

        {(error || voiceValidation.formError || clientValidation.formError) && (
          <p className="text-sm text-red-600">{error || voiceValidation.formError || clientValidation.formError}</p>
        )}
        {success && <p className="text-sm text-emerald-600">{success}</p>}
      </CardBody>
    </Card>
  )
}
