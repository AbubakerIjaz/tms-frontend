export interface Shop {
  id: number
  name: string
  slug: string
  type: 'tailor' | 'boutique' | 'both'
  logo_url: string | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  currency: string
  measurement_unit: 'inch' | 'cm'
  settings: Record<string, unknown>
}

export interface User {
  id: number
  name: string
  email: string
  phone: string | null
  role: 'admin' | 'staff'
  shop: Shop | null
}

export interface Paginated<T> {
  data: T[]
  current_page: number
  last_page: number
  per_page: number
  total: number
  from: number | null
  to: number | null
}

export interface Client {
  id: number
  name: string
  phone: string | null
  email: string | null
  address: string | null
  gender: 'male' | 'female' | 'other' | null
  notes: string | null
  orders_count?: number
  stitching_sizes_count?: number
  measurements_count?: number
  measurements?: ClientMeasurement[]
  orders?: Order[]
  stitching_sizes?: import('./stitching').StitchingSize[]
}

export interface MeasurementField {
  key: string
  label: string
}

export interface GarmentType {
  id: number
  name: string
  description: string | null
  measurement_fields: MeasurementField[] | null
  is_active: boolean
}

export interface ClientMeasurement {
  id: number
  client_id: number
  garment_type_id: number | null
  label: string | null
  measurements: Record<string, string | number>
  notes: string | null
  measured_at: string
  garment_type?: GarmentType
}

export interface Design {
  id: number
  garment_type_id: number | null
  name: string
  description: string | null
  base_price: string
  image_path: string | null
  image_url: string | null
  is_active: boolean
  garment_type?: GarmentType
}

export interface Category {
  id: number
  name: string
  slug: string
  description: string | null
  is_active: boolean
  gallery_items_count?: number
}

export interface GalleryItem {
  id: number
  category_id: number | null
  title: string
  description: string | null
  image_path: string
  image_url: string
  is_active: boolean
  category?: Category
}

export interface Order {
  id: number
  client_id: number
  design_id: number | null
  garment_type_id: number | null
  order_number: string
  status: 'pending' | 'in_progress' | 'ready' | 'delivered' | 'cancelled'
  total_amount: string
  paid_amount: string
  payment_status: 'paid' | 'pending'
  balance?: number
  order_date: string
  due_date: string | null
  delivery_date: string | null
  measurements_snapshot: Record<string, string | number> | null
  notes: string | null
  client?: Client
  design?: Design
  garment_type?: GarmentType
}

export interface Transaction {
  id: number
  type: 'income' | 'expense'
  amount: string
  description: string
  category: string | null
  payment_method: 'cash' | 'card' | 'bank' | 'other'
  transaction_date: string
  client_id: number | null
  order_id: number | null
  notes: string | null
  client?: Client
  order?: Order
}

export interface DashboardData {
  stats: {
    total_clients: number
    pending_orders: number
    ready_orders: number
    month_income: number
    month_expense: number
    month_profit: number
  }
  recent_orders: Order[]
  upcoming_due: Order[]
}

export interface TransactionsResponse extends Paginated<Transaction> {
  summary: { income: number; expense: number; balance: number }
}
