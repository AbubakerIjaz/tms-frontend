import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Users, ClipboardList, Package, TrendingUp, TrendingDown, Sparkles,
  Plus, UserPlus, Wallet, Shirt, Mic,
} from 'lucide-react'
import { api, getErrorMessage } from '../lib/api'
import { clientOrderUrl } from '../lib/navigation'
import {
  buildFilteredUrl,
  currentMonthRange,
  dateRangeToParams,
  formatDateRangeLabel,
  isDateRangeActive,
  useDateRangeFilter,
} from '../lib/listing'
import { useAuth } from '../context/AuthContext'
import { useShopFeatures } from '../hooks/useShopFeatures'
import type { DashboardData } from '../types'
import { Button } from '../components/ui/Button'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { DateRangeFilter } from '../components/ui/DateRangeFilter'
import { Badge, formatCurrency, formatDate, LoadingSpinner } from '../components/ui/Badge'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { useToast } from '../context/ToastContext'
import type { LucideIcon } from 'lucide-react'
import type { DateRange } from '../lib/listing'

const statStyles = [
  { card: 'stat-card-indigo', icon: 'text-brand-600 bg-white/80 shadow-sm' },
  { card: 'stat-card-gold', icon: 'text-accent-600 bg-white/80 shadow-sm' },
  { card: 'stat-card-emerald', icon: 'text-emerald-600 bg-white/80 shadow-sm' },
  { card: 'stat-card-emerald', icon: 'text-emerald-600 bg-white/80 shadow-sm' },
  { card: 'stat-card-rose', icon: 'text-rose-600 bg-white/80 shadow-sm' },
  { card: 'stat-card-indigo', icon: 'text-brand-600 bg-white/80 shadow-sm' },
]

function dueSectionTitle(range: DateRange) {
  return isDateRangeActive(range) ? 'Due in Period' : 'Due This Week'
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { isModuleEnabled, showUrduLabels } = useShopFeatures()
  const { dateRange, setDateRange } = useDateRangeFilter(currentMonthRange())
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [accountType, setAccountType] = useState<'income' | 'expense'>('income')
  const [accountAmount, setAccountAmount] = useState('')
  const [accountCategory, setAccountCategory] = useState('')
  const [accountDescription, setAccountDescription] = useState('')
  const [savingAccount, setSavingAccount] = useState(false)
  const currency = user?.shop?.currency || 'PKR'
  const { toast } = useToast()

  const quickActions = useMemo(() => {
    const actions: { label: string; labelUr: string; icon: LucideIcon; to: string; color: string }[] = []
    if (isModuleEnabled('clients')) {
      actions.push({ label: 'Add Client', labelUr: 'نیا گاہک', icon: UserPlus, to: '/clients?action=new', color: 'from-brand-500 to-brand-600' })
    }
    if (isModuleEnabled('orders')) {
      actions.push({ label: 'New Order', labelUr: 'نیا آرڈر', icon: Plus, to: '/orders?action=new', color: 'from-emerald-500 to-emerald-600' })
    }
    if (isModuleEnabled('accounts')) {
      actions.push({ label: 'Add Income', labelUr: 'آمدن', icon: Wallet, to: '/accounts?action=new&type=income', color: 'from-accent-500 to-accent-600' })
    }
    if (isModuleEnabled('voiceMeasurements')) {
      actions.push({ label: 'Voice Nap', labelUr: 'آواز سے ناپ', icon: Mic, to: '/voice-measurements', color: 'from-violet-500 to-brand-600' })
    }
    if (isModuleEnabled('designs')) {
      actions.push({ label: 'Designs', labelUr: 'ڈیزائن', icon: Shirt, to: '/designs', color: 'from-violet-500 to-violet-600' })
    }
    return actions
  }, [isModuleEnabled])

  const load = useCallback(() => {
    setLoading(true)
    api
      .get<DashboardData>('/dashboard', { params: dateRangeToParams(dateRange) })
      .then((res) => setData(res.data))
      .finally(() => setLoading(false))
  }, [dateRange])

  useEffect(() => {
    load()
  }, [load])

  async function submitAccountEntry(event: React.FormEvent) {
    event.preventDefault()
    if (!accountAmount || Number(accountAmount) <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    setSavingAccount(true)
    try {
      await api.post('/transactions', {
        type: accountType,
        amount: Number(accountAmount),
        description: accountDescription,
        category: accountCategory,
        payment_method: 'cash',
        transaction_date: new Date().toISOString().split('T')[0],
      })
      setAccountAmount('')
      setAccountDescription('')
      setAccountCategory('')
      setAccountType('income')
      toast.success('Transaction added')
      load()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSavingAccount(false)
    }
  }

  if (loading && !data) return <LoadingSpinner />
  if (!data) return null

  const stats: { label: string; value: string | number; icon: LucideIcon; to: string }[] = [
    ...(isModuleEnabled('clients')
      ? [{ label: 'Total Clients', value: data.stats.total_clients, icon: Users, to: buildFilteredUrl('/clients', dateRange) }]
      : []),
    ...(isModuleEnabled('orders')
      ? [
          {
            label: 'Pending Orders',
            value: data.stats.pending_orders,
            icon: ClipboardList,
            to: buildFilteredUrl('/orders', dateRange, { status: 'pending,in_progress' }),
          },
          {
            label: 'Ready to Deliver',
            value: data.stats.ready_orders,
            icon: Package,
            to: buildFilteredUrl('/orders', dateRange, { status: 'ready' }),
          },
        ]
      : []),
    ...(isModuleEnabled('accounts')
      ? [
          {
            label: 'Income',
            value: formatCurrency(data.stats.month_income, currency),
            icon: TrendingUp,
            to: buildFilteredUrl('/accounts', dateRange, { type: 'income' }),
          },
          {
            label: 'Expense',
            value: formatCurrency(data.stats.month_expense, currency),
            icon: TrendingDown,
            to: buildFilteredUrl('/accounts', dateRange, { type: 'expense' }),
          },
          {
            label: 'Profit',
            value: formatCurrency(data.stats.month_profit, currency),
            icon: TrendingUp,
            to: buildFilteredUrl('/accounts', dateRange),
          },
        ]
      : []),
  ]

  const periodHint = formatDateRangeLabel(dateRange) || 'all time'

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="page-heading">Dashboard</h2>
          <p className="page-subtitle">
            Welcome back, {user?.name?.split(' ')[0]} — overview for {periodHint}
          </p>
        </div>
        <div className="flex w-full max-w-full items-center gap-2 rounded-full border border-accent-200/60 bg-gradient-to-r from-accent-50 to-brand-50 px-3 py-2 text-xs font-medium text-brand-800 sm:w-auto sm:px-4 sm:text-sm">
          <Sparkles size={16} className="shrink-0 text-accent-500" />
          <span className="truncate">{user?.shop?.name}</span>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
        <DateRangeFilter
          value={dateRange}
          onChange={setDateRange}
          label="Overview period"
        />
      </div>

      {quickActions.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-700">
            Quick Actions
            {showUrduLabels && (
              <span className="font-normal text-slate-400" dir="rtl"> — فوری کام</span>
            )}
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {quickActions.map((action) => (
              <button
                key={action.to}
                type="button"
                onClick={() => navigate(action.to)}
                className={`flex flex-col items-center gap-2 rounded-2xl bg-gradient-to-br ${action.color} p-4 text-white shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98] touch-target`}
              >
                <action.icon size={28} strokeWidth={2} />
                <span className="text-sm font-semibold">{action.label}</span>
                {showUrduLabels && (
                  <span className="text-[10px] opacity-80" dir="rtl">{action.labelUr}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {isModuleEnabled('accounts') && (
        <Card>
          <CardHeader title="Quick income / expense" />
          <CardBody>
            <form noValidate onSubmit={submitAccountEntry} className="grid gap-4 sm:grid-cols-4">
              <Select
                label="Type"
                value={accountType}
                onChange={(e) => setAccountType(e.target.value as 'income' | 'expense')}
                options={[
                  { value: 'income', label: 'Income' },
                  { value: 'expense', label: 'Expense' },
                ]}
                className="sm:col-span-1"
              />
              <Input
                label="Amount"
                type="number"
                min="0"
                step="0.01"
                value={accountAmount}
                onChange={(e) => setAccountAmount(e.target.value)}
                required
                className="sm:col-span-1"
              />
              <Input
                label="Category"
                placeholder="Optional"
                value={accountCategory}
                onChange={(e) => setAccountCategory(e.target.value)}
                className="sm:col-span-1"
              />
              <Input
                label="Description"
                placeholder="Short note"
                value={accountDescription}
                onChange={(e) => setAccountDescription(e.target.value)}
                className="sm:col-span-1"
              />
              <div className="sm:col-span-4 flex justify-end">
                <Button type="submit" disabled={savingAccount}>
                  {savingAccount ? 'Saving...' : 'Add transaction'}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${loading ? 'opacity-60' : ''}`}>
        {stats.map((stat, i) => (
          <Link
            key={stat.label}
            to={stat.to}
            className={`${statStyles[i].card} block rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2`}
          >
            <div className="flex items-center gap-4">
              <div className={`rounded-xl p-3 ${statStyles[i].icon}`}>
                <stat.icon size={22} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">{stat.label}</p>
                <p className="text-xl font-bold text-surface-900">{stat.value}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className={`grid gap-6 lg:grid-cols-2 ${loading ? 'opacity-60' : ''}`}>
        <Card>
          <CardHeader
            title="Recent Orders"
            action={<Link to={buildFilteredUrl('/orders', dateRange)} className="text-sm font-medium text-brand-600 hover:text-brand-700">View all →</Link>}
          />
          <CardBody className="!p-0">
            {data.recent_orders.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-400">No orders in this period</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.recent_orders.map((order) => (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => navigate(clientOrderUrl(order.client_id, order.id))}
                    className="flex w-full items-center justify-between px-5 py-3.5 text-left transition-colors hover:bg-brand-50/30"
                  >
                    <div>
                      <p className="font-medium text-brand-700">{order.order_number}</p>
                      <p className="text-sm text-slate-500">{order.client?.name}</p>
                    </div>
                    <div className="text-right">
                      <Badge status={order.status} />
                      <p className="mt-1 text-sm text-slate-500">{formatDate(order.order_date)}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={dueSectionTitle(dateRange)} />
          <CardBody className="!p-0">
            {data.upcoming_due.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-400">
                {isDateRangeActive(dateRange) ? 'No deadlines in this period' : 'No upcoming deadlines'}
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.upcoming_due.map((order) => (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => navigate(clientOrderUrl(order.client_id, order.id))}
                    className="flex w-full items-center justify-between px-5 py-3.5 text-left transition-colors hover:bg-accent-50/30"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{order.client?.name}</p>
                      <p className="text-sm text-brand-600">{order.order_number}</p>
                    </div>
                    <p className="text-sm font-semibold text-accent-600">{formatDate(order.due_date)}</p>
                  </button>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
