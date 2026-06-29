import { Link } from 'react-router-dom'
import type { TableColumnDef } from '../../hooks/useTableColumns'
import type { Client } from '../../types'
import { Button } from '../ui/Button'

export function createClientTableColumns(options: {
  rowFrom: number | null
  genderLabel: (gender: string | null) => string
  showOrders?: boolean
  showSizes?: boolean
}): TableColumnDef<Client>[] {
  const { rowFrom, genderLabel, showOrders = true, showSizes = true } = options

  const columns: TableColumnDef<Client>[] = [
    {
      id: 'index',
      label: '#',
      headerClassName: 'w-12',
      cellClassName: 'text-slate-400',
      cell: (_client, index) => (rowFrom ?? 1) + index,
    },
    {
      id: 'name',
      label: 'Name',
      required: true,
      cell: (client) => (
        <>
          <Link to={`/clients/${client.id}`} className="font-medium text-slate-900 hover:text-brand-600">
            {client.name}
          </Link>
          {client.address && (
            <p className="mt-0.5 max-w-xs truncate text-xs text-slate-400">{client.address}</p>
          )}
        </>
      ),
    },
    {
      id: 'phone',
      label: 'Phone',
      cellClassName: 'whitespace-nowrap text-slate-600',
      cell: (client) => client.phone || '—',
    },
    {
      id: 'email',
      label: 'Email',
      defaultVisible: false,
      cellClassName: 'max-w-[180px] truncate text-slate-600',
      cell: (client) => client.email || '—',
    },
    {
      id: 'gender',
      label: 'Gender',
      defaultVisible: false,
      cellClassName: 'text-slate-600',
      cell: (client) => genderLabel(client.gender),
    },
  ]

  if (showOrders) {
    columns.push({
      id: 'orders',
      label: 'Orders',
      align: 'center',
      cell: (client) => (
        <span className="inline-flex min-w-6 justify-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
          {client.orders_count ?? 0}
        </span>
      ),
    })
  }

  if (showSizes) {
    columns.push({
      id: 'sizes',
      label: 'Sizes',
      align: 'center',
      cell: (client) => (
        <span className="inline-flex min-w-6 justify-center rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
          {client.stitching_sizes_count ?? 0}
        </span>
      ),
    })
  }

  columns.push({
      id: 'actions',
      label: 'Actions',
      required: true,
      align: 'right',
      cellClassName: 'whitespace-nowrap text-right',
      cell: (client) => (
        <Link to={`/clients/${client.id}`}>
          <Button size="sm" variant="secondary">View</Button>
        </Link>
      ),
    })

  return columns
}
