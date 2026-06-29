import { Link } from 'react-router-dom'
import type { TableColumnDef } from '../../hooks/useTableColumns'
import { orderDesignSummary, orderSuitCount } from '../../lib/orderForm'
import { clientOrderUrl } from '../../lib/navigation'
import type { Order, Shop } from '../../types'
import { formatCurrency, formatDate } from '../ui/Badge'
import { Select } from '../ui/Select'
import { OrderRowActions } from '../OrderRowActions'

interface OrderTableOptions {
  currency: string
  shop?: Shop | null
  whatsAppEnabled: boolean
  canWhatsApp: (order: Order) => boolean
  onOpenOrder: (order: Order) => void
  onEditOrder?: (order: Order) => void
  onUpdateStatus: (order: Order, status: string) => void
  onUpdatePaymentStatus: (order: Order, status: 'paid' | 'pending') => void
  onWhatsApp: (order: Order) => void
  showClient?: boolean
  showPaid?: boolean
  showDesigns?: boolean
  showGarmentTypes?: boolean
}

export function createOrderTableColumns(options: OrderTableOptions): TableColumnDef<Order>[] {
  const {
    currency,
    whatsAppEnabled,
    canWhatsApp,
    onOpenOrder,
    onEditOrder,
    onUpdateStatus,
    onUpdatePaymentStatus,
    onWhatsApp,
    showClient = true,
    showPaid = false,
    showDesigns = true,
    showGarmentTypes = true,
  } = options

  const columns: TableColumnDef<Order>[] = [
    {
      id: 'order_number',
      label: 'Order #',
      required: true,
      cellClassName: 'font-medium',
      cell: (order) => (
        <button
          type="button"
          onClick={() => onOpenOrder(order)}
          className="text-brand-600 hover:text-brand-800 hover:underline"
        >
          {order.order_number}
        </button>
      ),
    },
  ]

  if (showClient) {
    columns.push({
      id: 'client',
      label: 'Client',
      required: true,
      cell: (order) =>
        order.client_id ? (
          <Link
            to={clientOrderUrl(order.client_id)}
            className="font-medium text-slate-800 hover:text-brand-600"
          >
            {order.client?.name}
          </Link>
        ) : (
          order.client?.name || '—'
        ),
    })
  }

  if (showDesigns || showGarmentTypes) {
    columns.push({
      id: showDesigns ? 'design' : 'garment',
      label: showDesigns ? 'Design' : 'Garment',
      cell: (order) => {
        const { names } = orderDesignSummary(order)

        if (showDesigns && names.length > 0) {
          const [first, ...rest] = names
          return (
            <span className="inline-flex items-center gap-1.5" title={names.join(', ')}>
              <span className="truncate">{first}</span>
              {rest.length > 0 && (
                <span className="shrink-0 rounded-full bg-brand-50 px-1.5 py-0.5 text-xs font-semibold text-brand-700">
                  +{rest.length}
                </span>
              )}
            </span>
          )
        }

        if (showGarmentTypes) {
          return order.garment_type?.name || '—'
        }

        return '—'
      },
    })
  }

  columns.push(
    {
      id: 'suits',
      label: 'Suits',
      cellClassName: 'text-center tabular-nums',
      align: 'center',
      cell: (order) => {
        const { designCount, totalPieces } = orderDesignSummary(order)
        const count = orderSuitCount(order) || totalPieces

        if (count === 0) return '—'

        return (
          <span
            className="inline-flex items-center gap-1"
            title={designCount > 0 ? `${designCount} of ${count} pieces have a design` : `${count} pieces`}
          >
            <span className="font-medium">{count}</span>
            {designCount > 0 && designCount < count && (
              <span className="text-xs text-slate-400">({designCount} w/ design)</span>
            )}
          </span>
        )
      },
    },
    {
      id: 'total',
      label: 'Total',
      cell: (order) => formatCurrency(order.total_amount, currency),
    },
  )

  if (showPaid) {
    columns.push({
      id: 'paid',
      label: 'Paid',
      defaultVisible: false,
      cellClassName: 'whitespace-nowrap',
      cell: (order) => formatCurrency(order.paid_amount, currency),
    })
  }

  columns.push(
    {
      id: 'balance',
      label: 'Balance',
      cell: (order) => formatCurrency(order.balance ?? 0, currency),
    },
    {
      id: 'due',
      label: 'Due',
      defaultVisible: false,
      cell: (order) => formatDate(order.due_date),
    },
    {
      id: 'status',
      label: 'Status',
      cell: (order) => (
        <Select
          size="sm"
          className="min-w-[120px]"
          value={order.status}
          onChange={(e) => onUpdateStatus(order, e.target.value)}
          searchable={false}
          options={['pending', 'in_progress', 'ready', 'delivered', 'cancelled'].map((s) => ({
            value: s,
            label: s.replace('_', ' '),
          }))}
        />
      ),
    },
    {
      id: 'payment',
      label: 'Payment',
      cell: (order) => (
        <Select
          size="sm"
          className="min-w-[110px]"
          tone={order.payment_status === 'paid' ? 'success' : 'warning'}
          value={order.payment_status || 'pending'}
          onChange={(e) => onUpdatePaymentStatus(order, e.target.value as 'paid' | 'pending')}
          searchable={false}
          options={[
            { value: 'pending', label: 'Pending' },
            { value: 'paid', label: 'Paid' },
          ]}
        />
      ),
    },
    {
      id: 'order_date',
      label: 'Date',
      defaultVisible: false,
      cellClassName: 'whitespace-nowrap',
      cell: (order) => formatDate(order.order_date),
    },
    {
      id: 'actions',
      label: 'Actions',
      required: true,
      align: 'right',
      cellClassName: 'text-right',
      cell: (order) => (
        <OrderRowActions
          order={order}
          whatsAppEnabled={whatsAppEnabled}
          canWhatsApp={canWhatsApp(order)}
          onEdit={onEditOrder ? () => onEditOrder(order) : undefined}
          onWhatsApp={() => onWhatsApp(order)}
        />
      ),
    },
  )

  return columns
}
