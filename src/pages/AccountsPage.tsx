import { useCallback, useEffect, useState } from 'react'
import { Plus, Wallet } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { api, getErrorMessage } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { DEFAULT_PAGE_SIZE, defaultPaginationMeta, listingQueryParams, metaFromPaginated, dateRangeFromSearchParams, useDateRangeFilter, useDebouncedSearch } from '../lib/listing'
import type { Transaction, TransactionsResponse } from '../types'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Textarea } from '../components/ui/Textarea'
import { Card, CardBody } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { ListingToolbar } from '../components/ui/ListingToolbar'
import { Pagination } from '../components/ui/Pagination'
import { ListingPageLayout, ScrollableTableCard } from '../components/ListingPageLayout'
import { Badge, EmptyState, formatCurrency, formatDate, LoadingSpinner } from '../components/ui/Badge'

export function AccountsPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const currency = user?.shop?.currency || 'PKR'
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [meta, setMeta] = useState(defaultPaginationMeta())
  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0 })
  const [typeFilter, setTypeFilter] = useState(() => searchParams.get('type') || '')
  const { searchInput, setSearchInput, searchQuery } = useDebouncedSearch()
  const { dateRange, setDateRange } = useDateRangeFilter(dateRangeFromSearchParams(searchParams))
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(DEFAULT_PAGE_SIZE)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    type: 'income', amount: '', description: '', category: '', payment_method: 'cash',
    transaction_date: new Date().toISOString().split('T')[0], notes: '',
  })

  const load = useCallback(() => {
    setLoading(true)
    api.get<TransactionsResponse>('/transactions', {
      params: listingQueryParams(page, perPage, dateRange, {
        type: typeFilter,
        search: searchQuery,
      }),
    })
      .then((res) => {
        setTransactions(res.data.data)
        setMeta(metaFromPaginated(res.data))
        setSummary(res.data.summary)
      })
      .finally(() => setLoading(false))
  }, [page, perPage, dateRange, typeFilter, searchQuery])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    setPage(1)
  }, [typeFilter, searchQuery, dateRange.from, dateRange.to])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.post('/transactions', form)
      setModalOpen(false)
      setForm({ type: 'income', amount: '', description: '', category: '', payment_method: 'cash', transaction_date: new Date().toISOString().split('T')[0], notes: '' })
      setPage(1)
      load()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this transaction?')) return
    await api.delete(`/transactions/${id}`)
    load()
  }

  return (
    <ListingPageLayout
      header={
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="page-heading">Accounts</h2>
            <p className="page-subtitle">Track income, expenses, and payments</p>
          </div>
          <Button className="w-full sm:w-auto" onClick={() => setModalOpen(true)}><Plus size={18} /> Add Transaction</Button>
        </div>
      }
      toolbar={
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card><CardBody><p className="text-sm text-slate-500">Total Income</p><p className="text-2xl font-bold text-emerald-600">{formatCurrency(summary.income, currency)}</p></CardBody></Card>
            <Card><CardBody><p className="text-sm text-slate-500">Total Expense</p><p className="text-2xl font-bold text-red-600">{formatCurrency(summary.expense, currency)}</p></CardBody></Card>
            <Card><CardBody><p className="text-sm text-slate-500">Balance</p><p className="text-2xl font-bold text-brand-600">{formatCurrency(summary.balance, currency)}</p></CardBody></Card>
          </div>
          <ListingToolbar
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            dateLabel="Transaction date"
            search={{
              value: searchInput,
              onChange: setSearchInput,
              placeholder: 'Search description, category, notes...',
            }}
          >
            <Select
              className="w-48"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              options={[
                { value: '', label: 'All Transactions' },
                { value: 'income', label: 'Income Only' },
                { value: 'expense', label: 'Expense Only' },
              ]}
            />
          </ListingToolbar>
        </div>
      }
    >
      <ScrollableTableCard
        loading={loading && transactions.length > 0}
        empty={
          loading && transactions.length === 0 ? (
            <LoadingSpinner />
          ) : transactions.length === 0 ? (
            <EmptyState icon={<Wallet size={48} />} title="No transactions found" description="Adjust filters or add a transaction" />
          ) : undefined
        }
        pagination={
          <Pagination meta={meta} onPageChange={setPage} onPerPageChange={(n) => { setPerPage(n); setPage(1) }} />
        }
      >
        <table className="table-premium table-sticky-head w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3">Description</th>
              <th className="px-5 py-3">Category</th>
              <th className="px-5 py-3">Type</th>
              <th className="px-5 py-3">Amount</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {transactions.map((tx) => (
              <tr key={tx.id} className="hover:bg-slate-50/80">
                <td className="px-5 py-3">{formatDate(tx.transaction_date)}</td>
                <td className="px-5 py-3">{tx.description}</td>
                <td className="px-5 py-3 text-slate-500">{tx.category || '—'}</td>
                <td className="px-5 py-3"><Badge status={tx.type} /></td>
                <td className={`px-5 py-3 font-medium ${tx.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                  {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, currency)}
                </td>
                <td className="px-5 py-3">
                  <Button size="sm" variant="danger" onClick={() => handleDelete(tx.id)}>Delete</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollableTableCard>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Transaction">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select label="Type" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            options={[{ value: 'income', label: 'Income' }, { value: 'expense', label: 'Expense' }]} />
          <Input label="Amount" type="number" step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required />
          <Input label="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} required />
          <Input label="Category" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="e.g. Fabric, Rent, Order Payment" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Payment Method" value={form.payment_method} onChange={(e) => setForm((f) => ({ ...f, payment_method: e.target.value }))}
              options={[
                { value: 'cash', label: 'Cash' },
                { value: 'card', label: 'Card' },
                { value: 'bank', label: 'Bank Transfer' },
                { value: 'other', label: 'Other' },
              ]} />
            <Input label="Date" type="date" value={form.transaction_date} onChange={(e) => setForm((f) => ({ ...f, transaction_date: e.target.value }))} required />
          </div>
          <Textarea label="Notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </div>
        </form>
      </Modal>
    </ListingPageLayout>
  )
}
