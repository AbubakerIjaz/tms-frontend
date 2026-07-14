import { Link } from 'react-router-dom'
import type { TableColumnDef } from '../../hooks/useTableColumns'
import type { Transaction } from '../../types'
import { clientOrderUrl } from '../../lib/navigation'
import { Badge, formatCurrency, formatDate } from '../ui/Badge'
import { ActionMenu } from '../ui/ActionMenu'

export function createAccountTableColumns(options: {
  currency: string
  onDelete: (id: number) => void
}): TableColumnDef<Transaction>[] {
  const { currency, onDelete } = options

  return [
    {
      id: 'date',
      label: 'Date',
      cell: (tx) => formatDate(tx.transaction_date),
    },
    {
      id: 'description',
      label: 'Description',
      required: true,
      cell: (tx) => {
        if (tx.client_id && tx.order_id) {
          return (
            <Link to={clientOrderUrl(tx.client_id, tx.order_id)} className="font-medium text-brand-600 hover:underline">
              {tx.description}
            </Link>
          )
        }

        if (tx.client_id) {
          return (
            <Link to={`/clients/${tx.client_id}`} className="font-medium text-brand-600 hover:underline">
              {tx.description}
            </Link>
          )
        }

        return tx.description
      },
    },
    {
      id: 'category',
      label: 'Category',
      defaultVisible: false,
      cellClassName: 'text-slate-500',
      cell: (tx) => tx.category || '—',
    },
    {
      id: 'payment_method',
      label: 'Method',
      defaultVisible: false,
      cellClassName: 'capitalize text-slate-500',
      cell: (tx) => tx.payment_method,
    },
    {
      id: 'type',
      label: 'Type',
      cell: (tx) => <Badge status={tx.type} />,
    },
    {
      id: 'amount',
      label: 'Amount',
      required: true,
      cellClassName: 'font-medium',
      cell: (tx) => (
        <span className={tx.type === 'income' ? 'text-emerald-600' : 'text-red-600'}>
          {tx.type === 'income' ? '+' : '-'}
          {formatCurrency(tx.amount, currency)}
        </span>
      ),
    },
    {
      id: 'actions',
      label: 'Actions',
      required: true,
      align: 'right',
      cell: (tx) => (
        <ActionMenu
          items={[
            {
              id: 'delete',
              label: 'Delete',
              variant: 'danger',
              onClick: () => onDelete(tx.id),
            },
          ]}
          ariaLabel="Transaction actions"
        />
      ),
    },
  ]
}
