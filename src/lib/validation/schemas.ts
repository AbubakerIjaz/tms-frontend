import { z } from 'zod'

export const GENDER_VALUES = ['male', 'female', 'other'] as const
export type GenderValue = (typeof GENDER_VALUES)[number]

export const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
] as const

export const GENDER_OPTIONS_WITH_PLACEHOLDER = [
  { value: '', label: 'Select...' },
  ...GENDER_OPTIONS,
] as const

const optionalEmail = z
  .string()
  .trim()
  .refine((value) => value === '' || z.email().safeParse(value).success, 'Enter a valid email')

const amountString = (label = 'Amount') =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .refine((value) => !Number.isNaN(Number(value)) && Number(value) >= 0, `Enter a valid ${label.toLowerCase()}`)

const optionalAmountString = z
  .string()
  .trim()
  .refine((value) => value === '' || (!Number.isNaN(Number(value)) && Number(value) >= 0), 'Enter a valid amount')

const requiredDate = (label: string) => z.string().trim().min(1, `${label} is required`)

export const clientFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(255),
  phone: z.string().trim().min(1, 'Phone is required').max(30),
  email: optionalEmail,
  address: z.string().optional(),
  gender: z
    .string()
    .refine((value): value is GenderValue => GENDER_VALUES.includes(value as GenderValue), 'Gender is required'),
  notes: z.string().optional(),
})

export type ClientFormValues = z.infer<typeof clientFormSchema>

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').pipe(z.email('Enter a valid email')),
  password: z.string().min(1, 'Password is required'),
})

export type LoginFormValues = z.infer<typeof loginSchema>

export const registerSchema = z
  .object({
    name: z.string().trim().min(1, 'Your name is required'),
    email: z.string().trim().min(1, 'Email is required').pipe(z.email('Enter a valid email')),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    password_confirmation: z.string().min(1, 'Confirm your password'),
    phone: z.string().optional(),
    shop_name: z.string().trim().min(1, 'Shop name is required'),
    shop_type: z.enum(['tailor', 'boutique', 'both']),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: 'Passwords do not match',
    path: ['password_confirmation'],
  })

export type RegisterFormValues = z.infer<typeof registerSchema>

export const orderCreateFormSchema = z.object({
  client_id: z.string().trim().min(1, 'Client is required'),
  total_amount: amountString('Total amount'),
  paid_amount: optionalAmountString,
  order_date: requiredDate('Order date'),
  due_date: z.string().optional(),
  notes: z.string().optional(),
  record_payment: z.boolean().optional(),
})

export type OrderCreateFormValues = z.infer<typeof orderCreateFormSchema>

export const orderUpdateFormSchema = z.object({
  total_amount: amountString('Total amount'),
  paid_amount: optionalAmountString,
  order_date: requiredDate('Order date'),
  due_date: z.string().optional(),
  delivery_date: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'ready', 'delivered', 'cancelled']),
  payment_status: z.enum(['paid', 'pending']),
})

export type OrderUpdateFormValues = z.infer<typeof orderUpdateFormSchema>

export const paymentAmountSchema = z.object({
  amount: amountString('Amount'),
})

export const categoryFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  description: z.string().optional(),
})

export const designFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  description: z.string().optional(),
  base_price: optionalAmountString,
  garment_type_id: z.string().optional(),
})

export const garmentTypeFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
})

export const transactionFormSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: amountString('Amount'),
  description: z.string().optional(),
  category: z.string().optional(),
  payment_method: z.string().trim().min(1, 'Payment method is required'),
  transaction_date: requiredDate('Transaction date'),
  notes: z.string().optional(),
})

export const galleryFormSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  description: z.string().optional(),
  category_id: z.string().optional(),
})

export const stitchingFormSchema = z.object({
  label: z.string().optional(),
  standard_size: z.string().optional(),
  measured_at: requiredDate('Measured date'),
  notes: z.string().optional(),
})

export const voiceClientSchema = z.object({
  client_id: z.string().trim().min(1, 'Select a client first'),
})

export const voiceParseSchema = z.object({
  client_id: z.string().trim().min(1, 'Select a client first'),
  text: z.string().trim().min(1, 'Say or type measurements first'),
})

export const shopSettingsFormSchema = z.object({
  name: z.string().trim().min(1, 'Shop name is required'),
  type: z.enum(['tailor', 'boutique', 'both']),
  phone: z.string().optional(),
  email: optionalEmail,
  address: z.string().optional(),
  city: z.string().optional(),
  currency: z.string().optional(),
  measurement_unit: z.enum(['inch', 'cm']),
})

export type ShopSettingsFormValues = z.infer<typeof shopSettingsFormSchema>

export const profileSettingsFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Your name is required'),
    phone: z.string().optional(),
    password: z.string().optional(),
    password_confirmation: z.string().optional(),
  })
  .refine((data) => !data.password || data.password.length >= 8, {
    message: 'Password must be at least 8 characters',
    path: ['password'],
  })
  .refine((data) => !data.password || data.password === data.password_confirmation, {
    message: 'Passwords do not match',
    path: ['password_confirmation'],
  })

export type ProfileSettingsFormValues = z.infer<typeof profileSettingsFormSchema>
