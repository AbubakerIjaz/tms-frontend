import type { Client, Paginated } from './index'

export interface StitchingSection {
  name: string
  measurements: Record<string, string | number>
}

export interface StitchingSize {
  id: number
  client_id: number
  label: string | null
  standard_size: 'S' | 'M' | 'L' | 'XL' | null
  sections: StitchingSection[]
  notes: string | null
  measured_at: string
  client?: Client
}

export interface StitchingPresets {
  size_presets: Record<string, StitchingSection[]>
  example_sections: StitchingSection[]
}

export type { Paginated }
