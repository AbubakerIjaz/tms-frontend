import { Plus, Trash2 } from 'lucide-react'
import { Button } from './ui/Button'
import { Input } from './ui/Input'

export interface FieldRow {
  key: string
  value: string
}

export function measurementsToRows(measurements: Record<string, string | number> = {}): FieldRow[] {
  const entries = Object.entries(measurements)
  return entries.length > 0
    ? entries.map(([key, value]) => ({ key, value: String(value) }))
    : [{ key: '', value: '' }]
}

export function rowsToMeasurements(rows: FieldRow[]): Record<string, string> {
  const result: Record<string, string> = {}
  for (const row of rows) {
    const key = row.key.trim()
    if (key && row.value !== '') {
      result[key] = row.value
    }
  }
  return result
}

interface DynamicFieldsEditorProps {
  rows: FieldRow[]
  onChange: (rows: FieldRow[]) => void
  unit?: string
  keyPlaceholder?: string
  valuePlaceholder?: string
}

export function DynamicFieldsEditor({
  rows,
  onChange,
  unit,
  keyPlaceholder = 'Field name (e.g. Lambai, Chest, Teera)',
  valuePlaceholder = 'Value',
}: DynamicFieldsEditorProps) {
  function updateRow(index: number, field: 'key' | 'value', value: string) {
    onChange(rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)))
  }

  function addRow() {
    onChange([...rows, { key: '', value: '' }])
  }

  function removeRow(index: number) {
    onChange(rows.length > 1 ? rows.filter((_, i) => i !== index) : [{ key: '', value: '' }])
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-xs font-medium text-slate-500 px-1">
        <span>Field name</span>
        <span>Value{unit ? ` (${unit})` : ''}</span>
        <span className="w-8" />
      </div>
      {rows.map((row, index) => (
        <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-start">
          <Input
            value={row.key}
            onChange={(e) => updateRow(index, 'key', e.target.value)}
            placeholder={keyPlaceholder}
          />
          <Input
            value={row.value}
            onChange={(e) => updateRow(index, 'value', e.target.value)}
            placeholder={valuePlaceholder}
            type="text"
          />
          <button
            type="button"
            onClick={() => removeRow(index)}
            className="mt-2 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      <Button type="button" size="sm" variant="secondary" onClick={addRow}>
        <Plus size={16} /> Add field
      </Button>
    </div>
  )
}

export interface MeasurementSection {
  name: string
  rows: FieldRow[]
}

export function sectionsToPayload(sections: MeasurementSection[]) {
  return sections
    .map((section) => ({
      name: section.name.trim() || 'Measurements',
      measurements: rowsToMeasurements(section.rows),
    }))
    .filter((section) => Object.keys(section.measurements).length > 0)
}

export function payloadToSections(sections: { name: string; measurements: Record<string, string | number> }[]): MeasurementSection[] {
  if (!sections?.length) {
    return [{ name: 'Kameez', rows: [{ key: '', value: '' }] }]
  }
  return sections.map((section) => ({
    name: section.name,
    rows: measurementsToRows(section.measurements),
  }))
}

interface SectionsEditorProps {
  sections: MeasurementSection[]
  onChange: (sections: MeasurementSection[]) => void
  unit?: string
}

export function SectionsEditor({ sections, onChange, unit }: SectionsEditorProps) {
  function updateSection(index: number, patch: Partial<MeasurementSection>) {
    onChange(sections.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }

  function addSection() {
    onChange([...sections, { name: '', rows: [{ key: '', value: '' }] }])
  }

  function removeSection(index: number) {
    onChange(sections.length > 1 ? sections.filter((_, i) => i !== index) : sections)
  }

  return (
    <div className="space-y-4">
      {sections.map((section, index) => (
        <div key={index} className="rounded-lg border border-slate-200 p-4 space-y-3">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input
                label="Section name"
                value={section.name}
                onChange={(e) => updateSection(index, { name: e.target.value })}
                placeholder="e.g. Kameez, Shalwar, Coat"
              />
            </div>
            {sections.length > 1 && (
              <Button type="button" size="sm" variant="danger" onClick={() => removeSection(index)}>
                Remove
              </Button>
            )}
          </div>
          <DynamicFieldsEditor
            rows={section.rows}
            onChange={(rows) => updateSection(index, { rows })}
            unit={unit}
          />
        </div>
      ))}
      <Button type="button" size="sm" variant="secondary" onClick={addSection}>
        <Plus size={16} /> Add section (e.g. Shalwar, Dupatta)
      </Button>
    </div>
  )
}
