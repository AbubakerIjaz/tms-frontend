import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink, Plus, Shirt, Trash2 } from 'lucide-react'
import type { Design, GarmentType, OrderSuitDraft } from '../../types'
import { createDefaultSuitItems } from '../../lib/orderForm'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { DesignPickerModal } from './DesignPickerModal'

interface OrderSuitItemsEditorProps {
  items: OrderSuitDraft[]
  onChange: (items: OrderSuitDraft[]) => void
  designs: Design[]
  garmentTypes: GarmentType[]
  designsLocked?: boolean
  showDesigns?: boolean
  showGarmentTypes?: boolean
}

export function OrderSuitItemsEditor({
  items,
  onChange,
  designs,
  garmentTypes,
  designsLocked = false,
  showDesigns = true,
  showGarmentTypes = true,
}: OrderSuitItemsEditorProps) {
  const [pickerFor, setPickerFor] = useState<string | null>(null)

  function updateItem(key: string, patch: Partial<OrderSuitDraft>) {
    onChange(items.map((item) => (item.key === key ? { ...item, ...patch } : item)))
  }

  function addSuit() {
    const draft = createDefaultSuitItems()[0]
    onChange([...items, { ...draft, key: `suit-${Date.now()}-${items.length}`, label: `Suit ${items.length + 1}` }])
  }

  function removeSuit(key: string) {
    if (items.length <= 1) return
    onChange(items.filter((item) => item.key !== key))
  }

  const pickerItem = items.find((i) => i.key === pickerFor)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-800">Suits / pieces</p>
          <p className="text-xs text-slate-500">
            {showDesigns ? 'Each piece can have its own design' : 'Label each piece in the order'}
          </p>
        </div>
        {showDesigns && (
        <Link
          to="/designs"
          target="_blank"
          className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-800"
        >
          <ExternalLink size={14} />
          Manage designs
        </Link>
        )}
      </div>

      {designsLocked && (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Delivered orders no longer keep designs linked to suits — labels and garment types can still be edited.
        </p>
      )}

      {items.map((item, index) => (
        <div key={item.key} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Piece {index + 1}</p>
            {items.length > 1 && (
              <button type="button" onClick={() => removeSuit(item.key)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                <Trash2 size={16} />
              </button>
            )}
          </div>

          <div className={`grid gap-3 ${showGarmentTypes ? 'sm:grid-cols-2' : ''}`}>
            <Input
              label="Label"
              value={item.label}
              onChange={(e) => updateItem(item.key, { label: e.target.value })}
              placeholder="e.g. Kameez, Shalwar, Waistcoat"
            />
            {showGarmentTypes && (
            <Select
              label="Garment type"
              searchable
              value={item.garment_type_id}
              onChange={(e) => updateItem(item.key, { garment_type_id: e.target.value })}
              options={[{ value: '', label: 'None' }, ...garmentTypes.map((t) => ({ value: t.id, label: t.name }))]}
            />
            )}
          </div>

          {showDesigns && (
          <div className="mt-3">
            <p className="mb-2 text-sm font-medium text-slate-700">Design</p>
            {designsLocked ? (
              <p className="text-sm text-slate-500">{item.design?.name ? `${item.design.name} (unlinked)` : 'No design linked'}</p>
            ) : item.design ? (
              <div className="flex items-center gap-3 rounded-xl border border-brand-200 bg-white p-3">
                <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  {item.design.image_url ? (
                    <img src={item.design.image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-300">
                      <Shirt size={24} />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900">{item.design.name}</p>
                  <p className="text-xs text-slate-500">{item.design.garment_type?.name}</p>
                  <Link to="/designs" target="_blank" className="text-xs font-medium text-brand-600 hover:underline">
                    View in Designs
                  </Link>
                </div>
                <Button type="button" size="sm" variant="secondary" onClick={() => setPickerFor(item.key)}>
                  Change
                </Button>
              </div>
            ) : (
              <Button type="button" variant="secondary" className="w-full" onClick={() => setPickerFor(item.key)}>
                <Shirt size={16} />
                Select design
              </Button>
            )}
          </div>
          )}
        </div>
      ))}

      <Button type="button" variant="ghost" onClick={addSuit}>
        <Plus size={16} />
        Add another piece
      </Button>

      {showDesigns && (
      <DesignPickerModal
        open={!designsLocked && pickerFor !== null}
        onClose={() => setPickerFor(null)}
        designs={designs}
        selectedId={pickerItem?.design_id}
        onSelect={(design) => {
          if (!pickerFor) return
          const current = items.find((i) => i.key === pickerFor)
          updateItem(pickerFor, {
            design_id: String(design.id),
            design,
            garment_type_id:
              showGarmentTypes
                ? (current?.garment_type_id || (design.garment_type_id ? String(design.garment_type_id) : ''))
                : '',
          })
        }}
      />
      )}
    </div>
  )
}

export { createDefaultSuitItems } from '../../lib/orderForm'
