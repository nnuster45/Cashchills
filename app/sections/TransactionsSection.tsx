'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FiTrendingUp, FiTrendingDown, FiEdit2, FiTrash2, FiDollarSign, FiLoader, FiSearch, FiChevronRight, FiX, FiPackage, FiPlus } from 'react-icons/fi'

interface BillItem {
  name: string
  amount: number
  quantity: number
  notes?: string
}

interface Transaction {
  is_favorite?: boolean

  _id?: string
  type: string
  amount: number
  category: string
  merchant: string
  date: string
  source?: string
  notes?: string
  needs_review?: boolean
  items?: BillItem[]
}

interface Category {
  _id?: string
  name: string
  type: string
}

interface TransactionsProps {
  transactions: Transaction[]
  categories: Category[]
  onUpdate: (tx: Transaction) => void
  onDelete: (id: string) => void
  onAddTransaction: () => void
  loading: boolean
}

export default function TransactionsSection({ transactions, categories, onUpdate, onDelete, onAddTransaction, loading }: TransactionsProps) {
  const safeTx = Array.isArray(transactions) ? transactions : []
  const safeCats = Array.isArray(categories) ? categories : []

  const [filterType, setFilterType] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [editTx, setEditTx] = useState<Transaction | null>(null)
  const [editForm, setEditForm] = useState({ category: '', amount: '', notes: '', date: '' })
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)

  const filtered = safeTx
    .filter((t) => filterType === 'all' || t?.type === filterType)
    .filter((t) => {
      if (!searchQuery) return true
      const q = searchQuery.toLowerCase()
      return (t?.merchant ?? '').toLowerCase().includes(q) || (t?.category ?? '').toLowerCase().includes(q)
    })
    .sort((a, b) => new Date(b?.date ?? 0).getTime() - new Date(a?.date ?? 0).getTime())

  const grouped: Record<string, Transaction[]> = {}
  filtered.forEach((tx) => {
    const dateKey = tx?.date ? new Date(tx.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Unknown Date'
    if (!grouped[dateKey]) grouped[dateKey] = []
    grouped[dateKey].push(tx)
  })

  function formatAmount(amount: number) {
    return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 0 }).format(amount)
  }

  function formatFullDate(dateStr: string) {
    if (!dateStr) return ''
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    } catch {
      return dateStr
    }
  }

  function openEdit(tx: Transaction) {
    setEditTx(tx)
    setEditForm({
      category: tx?.category ?? '',
      amount: String(tx?.amount ?? 0),
      notes: tx?.notes ?? '',
      date: tx?.date ? new Date(tx.date).toISOString().slice(0, 10) : '',
    })
  }

  function handleSaveEdit() {
    if (!editTx) return
    onUpdate({
      ...editTx,
      category: editForm.category,
      amount: parseFloat(editForm.amount) || 0,
      notes: editForm.notes,
      date: editForm.date,
    })
    setEditTx(null)
  }

  function handleDelete(id: string) {
    onDelete(id)
    setDeleteConfirm(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <FiLoader className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading transactions...</span>
      </div>
    )
  }

  // Detail view
  if (selectedTx) {
    const items = Array.isArray(selectedTx.items) ? selectedTx.items : []
    return (
      <div className="space-y-4 pb-24">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedTx(null)} className="p-2 rounded-full hover:bg-white/60">
            <FiX className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-bold">Transaction Detail</h2>
        </div>

        <Card className="border-none shadow-md" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)' }}>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${selectedTx.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                  {selectedTx.type === 'income' ? <FiTrendingUp className="h-5 w-5" /> : <FiTrendingDown className="h-5 w-5" />}
                </div>
                <div>
                  <p className="font-semibold text-base">{selectedTx.merchant || selectedTx.category}</p>
                  <p className="text-xs text-muted-foreground">{selectedTx.category}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-xl font-bold ${selectedTx.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                  {selectedTx.type === 'income' ? '+' : '-'}{formatAmount(selectedTx.amount)} THB
                </p>
              </div>
            </div>

            <div className="border-t pt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Date</span>
                <span>{formatFullDate(selectedTx.date)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Source</span>
                <Badge variant="outline" className="text-xs">{selectedTx.source === 'email' ? 'Email' : 'Manual'}</Badge>
              </div>
              {selectedTx.notes && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Notes</span>
                  <span className="text-right max-w-[60%]">{selectedTx.notes}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => { setSelectedTx(null); openEdit(selectedTx) }}>
                <FiEdit2 className="h-3.5 w-3.5" /> Edit
              </Button>
              <Button variant="outline" size="sm" className="flex-1 gap-1 text-red-500 hover:text-red-700" onClick={() => { setSelectedTx(null); setDeleteConfirm(selectedTx._id ?? null) }}>
                <FiTrash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            </div>
          </CardContent>
        </Card>

        {items.length > 0 && (
          <Card className="border-none shadow-md" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FiPackage className="h-4 w-4" /> Bill Items ({items.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-2.5 border-b last:border-b-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.name}</p>
                    {item.quantity > 1 && (
                      <p className="text-[11px] text-muted-foreground">
                        {formatAmount(item.amount)} x {item.quantity}
                      </p>
                    )}
                    {item.notes && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">{item.notes}</p>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-red-500 ml-3">
                    {formatAmount(item.amount * (item.quantity || 1))} THB
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 mt-1 border-t">
                <span className="text-sm font-semibold">Total</span>
                <span className="text-sm font-bold" style={{ color: 'hsl(160 85% 35%)' }}>
                  {formatAmount(items.reduce((sum, i) => sum + i.amount * (i.quantity || 1), 0))} THB
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Transactions</h2>
        <Button size="sm" className="gap-1" style={{ background: 'hsl(160 85% 35%)' }} onClick={onAddTransaction}>
          <FiPlus className="h-4 w-4" /> Add
        </Button>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search merchant or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex gap-2">
        {['all', 'income', 'expense'].map((f) => (
          <Button
            key={f}
            variant={filterType === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType(f)}
            className="capitalize"
          >
            {f}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="border-none shadow-md" style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(16px)' }}>
          <CardContent className="py-12 text-center">
            <FiDollarSign className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-sm text-muted-foreground">No transactions found</p>
            <p className="text-xs text-muted-foreground mt-1">Add transactions or sync from email</p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="max-h-[calc(100vh-280px)]">
          <div className="space-y-4">
            {Object.entries(grouped).map(([dateKey, txList]) => (
              <div key={dateKey}>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">{dateKey}</p>
                <div className="space-y-1.5">
                  {txList.map((tx, idx) => {
                    const hasItems = Array.isArray(tx?.items) && tx.items.length > 0
                    return (
                      <Card key={tx?._id ?? idx} className="border-none shadow-sm" style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(16px)' }}>
                        <CardContent className="p-0">
                          <button
                            onClick={() => setSelectedTx(tx)}
                            className="w-full p-3 flex items-center justify-between text-left hover:bg-muted/30 transition-colors rounded-lg"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${tx?.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                {tx?.type === 'income' ? <FiTrendingUp className="h-4 w-4" /> : <FiTrendingDown className="h-4 w-4" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-sm font-medium truncate">{tx?.merchant || 'Unknown'}</p>
                                  {tx?.needs_review && <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-400 text-amber-600">Review</Badge>}
                                  {tx?.source === 'email' && <Badge variant="outline" className="text-[10px] px-1.5 py-0">Email</Badge>}
                                  {hasItems && <Badge variant="outline" className="text-[9px] px-1 py-0">{tx.items!.length} items</Badge>}
                                </div>
                                <p className="text-[11px] text-muted-foreground">{tx?.category ?? ''}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className={`text-sm font-semibold ${tx?.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                                {tx?.type === 'income' ? '+' : '-'}{formatAmount(tx?.amount ?? 0)}
                              </span>
                              <FiChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                          </button>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      <Dialog open={!!editTx} onOpenChange={(open) => { if (!open) setEditTx(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Category</Label>
              <Select value={editForm.category} onValueChange={(v) => setEditForm((p) => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {safeCats.map((c) => (
                    <SelectItem key={c?._id ?? c?.name} value={c?.name ?? ''}>{c?.name ?? ''}</SelectItem>
                  ))}
                  {editForm.category && !safeCats.find((c) => c?.name === editForm.category) && (
                    <SelectItem value={editForm.category}>{editForm.category}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount (THB)</Label>
              <Input type="number" value={editForm.amount} onChange={(e) => setEditForm((p) => ({ ...p, amount: e.target.value }))} />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={editForm.date} onChange={(e) => setEditForm((p) => ({ ...p, date: e.target.value }))} />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={editForm.notes} onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditTx(null)}>Cancel</Button>
              <Button onClick={handleSaveEdit}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Transaction</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure? This action cannot be undone.</p>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

      <button
        onClick={onAddTransaction}
        className="fixed bottom-24 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white z-40 transition-transform hover:scale-110"
        style={{ background: 'hsl(160 85% 35%)' }}
      >
        <FiPlus className="h-6 w-6" />
      </button>
    </div>
  )
}
