import { useShopFeatures } from '../hooks/useShopFeatures'
import { Navigate } from 'react-router-dom'
import { Mic } from 'lucide-react'
import { VoiceMeasurementPanel } from '../components/VoiceMeasurementPanel'

export function VoiceMeasurementsPage() {
  const { isModuleEnabled, showUrduLabels } = useShopFeatures()

  if (!isModuleEnabled('voiceMeasurements')) {
    return <Navigate to="/settings" replace />
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-brand-600 text-white shadow-md">
            <Mic size={22} />
          </div>
          <div>
            <h2 className="page-heading">Voice Measurements</h2>
            <p className="page-subtitle">
              {showUrduLabels
                ? 'آواز یا ٹائپ سے ناپ محفوظ کریں — سادہ اور تیز'
                : 'Add measurements by speaking or typing — fast and simple'}
            </p>
          </div>
        </div>
      </div>

      <VoiceMeasurementPanel />
    </div>
  )
}
