'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FiHome, FiTrendingUp, FiTrendingDown, FiSettings, FiLoader, FiPlus, FiTrash2, FiX, FiPaperclip, FiFile, FiCalendar, FiChevronDown, FiMessageCircle, FiStar } from 'react-icons/fi'

import DashboardSection from './sections/DashboardSection'
import IncomeSection from './sections/IncomeSection'
import ExpenseSection from './sections/ExpenseSection'
import SettingsSection from './sections/SettingsSection'

const THEME_VARS = {
  '--background': '160 35% 96%',
  '--foreground': '160 35% 8%',
  '--card': '160 30% 99%',
  '--card-foreground': '160 35% 8%',
  '--primary': '160 85% 35%',
  '--primary-foreground': '0 0% 100%',
  '--secondary': '160 20% 92%',
  '--secondary-foreground': '160 35% 15%',
  '--muted': '160 15% 92%',
  '--muted-foreground': '160 10% 45%',
  '--accent': '45 95% 50%',
  '--accent-foreground': '45 95% 15%',
  '--destructive': '0 84% 60%',
  '--destructive-foreground': '0 0% 100%',
  '--border': '160 20% 88%',
  '--input': '160 20% 88%',
  '--ring': '160 85% 35%',
  '--radius': '0.875rem',
} as React.CSSProperties

export interface BillItem {
  name: string
  amount: number
  quantity: number
  notes?: string
}

export interface ReceiptFile {
  asset_id?: string
  file_name: string
  mime_type?: string
  size_bytes?: number
}

export interface Transaction {
  is_favorite?: boolean

  _id?: string
  type: string
  amount: number
  category: string
  merchant: string
  date: string
  source?: string
  email_subject?: string
  needs_review?: boolean
  receipt_url?: string
  receipt_files?: ReceiptFile[]
  notes?: string
  items?: BillItem[]
}

interface Budget {
  _id?: string
  category: string
  monthly_limit: number
  month_year: string
}

interface AuthUser {
  id: string
  email: string
  name?: string
}

interface GmailIntegrationStatus {
  connected: boolean
  configured: boolean
  email?: string | null
  last_sync_at?: string | null
}

export interface CategoryItem {
  _id?: string
  name: string
  icon?: string
  type: string
  is_default?: boolean
}

export interface EmailSyncConfigData {
  owner_user_id?: string
  enabled_providers: string[]
  custom_emails: string[]
  sync_interval_hours: number
  auto_sync_enabled: boolean
  last_auto_sync_at?: string | null
}

declare global {
  interface Window {
    liff?: any
  }
}

const NEXT_PUBLIC_LINE_LIFF_ID = process.env.NEXT_PUBLIC_LINE_LIFF_ID || ''
const LIFF_URL = NEXT_PUBLIC_LINE_LIFF_ID ? `https://liff.line.me/${NEXT_PUBLIC_LINE_LIFF_ID}` : ''


class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button onClick={() => this.setState({ hasError: false, error: '' })} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">Try again</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}



function AuthScreen({
  onLineLogin,
  submitting,
  error,
}: {
  onLogin?: any
  onRegister?: any
  onLineLogin: () => Promise<void>
  submitting: boolean
  error: string
}) {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(160 40% 94%) 0%, hsl(180 35% 93%) 30%, hsl(160 35% 95%) 60%, hsl(140 40% 94%) 100%)' }}>
      <div className="w-full max-w-sm rounded-2xl border border-white/20 bg-white/85 p-8 shadow-xl" style={{ backdropFilter: 'blur(16px)' }}>
        <div className="flex flex-col items-center justify-center mb-8">
          <h1 className="text-3xl font-black tracking-tight" style={{ color: 'hsl(160 85% 35%)' }}>CASHEW</h1>
          <p className="mt-2 text-center text-sm font-medium text-slate-500">Welcome to your financial workspace</p>
        </div>
        
        {error && <p className="mb-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-500">{error}</p>}
        
        <div className="space-y-4">
          <Button
            type="button"
            onClick={onLineLogin}
            disabled={submitting}
            className="h-12 w-full rounded-[14px] bg-[#00B900] text-[15px] font-bold text-white transition-all hover:scale-[1.02] hover:bg-[#00A000] hover:shadow-lg active:scale-[0.98]"
          >
            {submitting ? <FiLoader className="mr-2 h-5 w-5 animate-spin" /> : <FiMessageCircle className="mr-2 h-5 w-5" />}
            เข้าสู่ระบบด้วย LINE
          </Button>
          <p className="text-center text-[11px] font-medium leading-relaxed text-slate-400">
            เข้าใช้งานอย่างปลอดภัยและรวดเร็ว<br/>ผ่าน LINE Account ของคุณ
          </p>
        </div>
      </div>
    </div>
  )
}

function UserProfileMenu({
  user,
  onLogout,
  submitting,
}: {
  user: AuthUser
  onLogout: () => Promise<void>
  submitting: boolean
}) {
  const initials = (user.name || user.email || 'U').trim().slice(0, 1).toUpperCase()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex h-10 items-center gap-2 rounded-[12px] border border-slate-200 bg-white px-2.5 pr-3 shadow-sm">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
            {initials}
          </span>
          <span className="max-w-[96px] truncate text-[12px] font-medium text-slate-600">
            {user.name || user.email}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[220px] rounded-[16px] border-slate-200 p-3">
        <div className="space-y-3">
          <div>
            <p className="truncate text-sm font-semibold text-slate-700">{user.name || 'ผู้ใช้งาน'}</p>
            <p className="truncate text-xs text-slate-400">{user.email}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={onLogout}
            disabled={submitting}
            className="h-10 w-full justify-center rounded-[10px] text-sm font-medium"
          >
            {submitting ? <><FiLoader className="mr-2 h-4 w-4 animate-spin" />กำลังออกจากระบบ...</> : 'ออกจากระบบ'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

interface AddItemForm {
  name: string
  amount: string
  quantity: string
  notes: string
}

type DateFilterPreset = 'today' | 'thisMonth' | 'all' | 'custom'

function formatAmount(amount: number) {
  return new Intl.NumberFormat('th-TH').format(amount)
}

function AddTransactionSheet({
  open,
  onClose,
  categories,
  onSave,
  onAddCategory,
  favoriteTransactions = [],
  defaultType,
}: {
  open: boolean
  onClose: () => void
  categories: CategoryItem[]
  onSave: (tx: Omit<Transaction, '_id'>) => Promise<void>
  onAddCategory: (cat: Omit<CategoryItem, '_id'>) => Promise<CategoryItem | null>
  favoriteTransactions?: Transaction[]
  defaultType?: 'income' | 'expense'
}) {
  const [type, setType] = useState<'expense' | 'income'>(defaultType || 'expense')
  const [category, setCategory] = useState('')
  const [merchant, setMerchant] = useState('')
  const [date, setDate] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<AddItemForm[]>([{ name: '', amount: '', quantity: '1', notes: '' }])
  const [saving, setSaving] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [showQuickCategory, setShowQuickCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [addingCategory, setAddingCategory] = useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const filteredCats = Array.isArray(categories) ? categories.filter((c) => c?.type === type) : []

  // Update type when defaultType changes (e.g. switching tabs)
  useEffect(() => {
    if (defaultType) setType(defaultType)
  }, [defaultType])

  function resetForm() {
    setType(defaultType || 'expense')
    setCategory('')
    setMerchant('')
    setDate(formatDateValue(new Date()))
    setNotes('')
    setItems([{ name: '', amount: '', quantity: '1', notes: '' }])
    setAttachedFiles([])
  }

  function applyFavorite(tx: Transaction) {
    setType(tx.type as 'income' | 'expense')
    setCategory(tx.category)
    setMerchant(tx.merchant)
    setNotes(tx.notes || '')
    if (tx.items && tx.items.length > 0) {
      setItems(tx.items.map(i => ({
        name: i.name,
        amount: String(i.amount),
        quantity: String(i.quantity || 1),
        notes: i.notes || ''
      })))
    } else {
      setItems([{ name: tx.merchant || tx.category || 'รายการ', amount: String(tx.amount), quantity: '1', notes: '' }])
    }
  }

  useEffect(() => {
    if (open) {
      resetForm()
    }
  }, [open])

  function addItem() {
    setItems((prev) => [...prev, { name: '', amount: '', quantity: '1', notes: '' }])
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  function updateItem(idx: number, field: keyof AddItemForm, value: string) {
    setItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (files) {
      setAttachedFiles((prev) => [...prev, ...Array.from(files)])
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removeFile(idx: number) {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  const totalAmount = items.reduce((sum, item) => {
    const amt = parseFloat(item.amount) || 0
    const qty = parseInt(item.quantity) || 1
    return sum + amt * qty
  }, 0)

  const incomeAmount = parseFloat(items[0]?.amount || '0') || 0
  const hasValidItems = items.some((item) => item.name.trim() && parseFloat(item.amount) > 0)
  const canSave = type === 'income' ? Boolean(category && merchant.trim() && incomeAmount > 0) : Boolean(category && hasValidItems)
  const displayTotal = type === 'income' ? incomeAmount : totalAmount

  async function handleQuickAddCategory() {
    const nextName = newCategoryName.trim()
    if (!nextName || addingCategory) return

    const existing = filteredCats.find((cat) => (cat?.name || '').toLowerCase() === nextName.toLowerCase())
    if (existing?.name) {
      setCategory(existing.name)
      setNewCategoryName('')
      setShowQuickCategory(false)
      return
    }

    setAddingCategory(true)
    const created = await onAddCategory({ name: nextName, type, is_default: false })
    setAddingCategory(false)
    if (created?.name) {
      setCategory(created.name)
      setNewCategoryName('')
      setShowQuickCategory(false)
    }
  }

  async function handleSave() {
    if (!canSave) return
    setSaving(true)

    let receiptUrl = ''
    let receiptFiles: ReceiptFile[] = []
    if (attachedFiles.length > 0) {
      setUploading(true)
      try {
        const formData = new FormData()
        attachedFiles.forEach((file) => formData.append('files', file))
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
        const uploadData = await uploadRes.json()
        if (uploadData?.success && uploadData?.asset_ids?.length > 0) {
          receiptUrl = uploadData.asset_ids[0]
        }
        receiptFiles = attachedFiles.map((file, idx) => {
          const uploaded = Array.isArray(uploadData?.files) ? uploadData.files[idx] : null
          return {
            asset_id: uploaded?.asset_id || undefined,
            file_name: uploaded?.file_name || file.name,
            mime_type: file.type || undefined,
            size_bytes: file.size || undefined,
          }
        })
      } catch { }
      setUploading(false)
    }

    const validItems: BillItem[] = items
      .filter((item) => item.name.trim() && parseFloat(item.amount) > 0)
      .map((item) => ({
        name: item.name.trim(),
        amount: parseFloat(item.amount),
        quantity: parseInt(item.quantity) || 1,
        notes: item.notes || undefined,
      }))

    await onSave({
      type,
      amount: type === 'income' ? incomeAmount : totalAmount,
      category,
      merchant,
      date: date || new Date().toISOString(),
      source: 'manual',
      notes,
      items: type === 'income' ? undefined : (validItems.length > 0 ? validItems : undefined),
      receipt_url: receiptUrl || undefined,
      receipt_files: receiptFiles.length > 0 ? receiptFiles : undefined,
    })
    setSaving(false)
    setType('expense')
    setCategory('')
    setMerchant('')
    setDate('')
    setNotes('')
    setItems([{ name: '', amount: '', quantity: '1', notes: '' }])
    setAttachedFiles([])
    setNewCategoryName('')
    setShowQuickCategory(false)
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative mt-auto max-h-[90vh] bg-white rounded-t-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-lg font-bold">เพิ่มรายการ</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100">
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className="mb-2 -mx-5 px-5">
            <div className="flex items-center gap-1.5 mb-2.5 text-slate-500">
              <FiStar className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="text-[11px] font-bold uppercase tracking-wider">เลือกจากรายการโปรด</span>
            </div>
            {favoriteTransactions.filter(tx => tx.type === type).length > 0 ? (
              <div className="flex overflow-x-auto gap-2 pb-2 -mx-5 px-5 scrollbar-hide snap-x">
                {favoriteTransactions.filter(tx => tx.type === type).map((tx, idx) => (
                  <button
                    key={tx._id || idx}
                    onClick={() => applyFavorite(tx)}
                    className="snap-start shrink-0 flex flex-col justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-left shadow-sm transition-all active:scale-95 min-w-[120px]"
                  >
                    <p className="text-xs font-bold text-slate-700 truncate w-full">{tx.merchant || tx.category || 'ไม่ระบุชื่อ'}</p>
                    <p className={`text-[11px] font-bold mt-0.5 ${tx.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatAmount(tx.amount)}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-3 py-4 text-center">
                <p className="text-xs text-slate-400">ยังไม่มีรายการโปรดสำหรับ{type === 'income' ? 'รายรับ' : 'รายจ่าย'}<br/>คุณสามารถติดดาว ⭐ ได้จากหน้ารายละเอียดรายการ</p>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant={type === 'expense' ? 'default' : 'outline'} size="sm" className="flex-1" onClick={() => { setType('expense'); setCategory('') }} style={type === 'expense' ? { background: 'hsl(0 84% 60%)' } : undefined}>
              รายจ่าย
            </Button>
            <Button variant={type === 'income' ? 'default' : 'outline'} size="sm" className="flex-1" onClick={() => { setType('income'); setCategory(''); setItems([{ name: '', amount: '', quantity: '1', notes: '' }]) }} style={type === 'income' ? { background: 'hsl(160 85% 35%)' } : undefined}>
              รายรับ
            </Button>
          </div>

          <div>
            <Label className="text-xs font-semibold text-gray-500">Category *</Label>
            <div className="space-y-2">
              {showQuickCategory ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                  <p className="text-xs font-semibold text-slate-500 mb-2">เพิ่มหมวดใหม่</p>
                  <div className="flex gap-2">
                    <Input
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="ชื่อหมวดใหม่"
                      className="h-9 bg-white"
                      autoFocus
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleQuickAddCategory() } }}
                    />
                    <Button
                      type="button"
                      onClick={handleQuickAddCategory}
                      disabled={!newCategoryName.trim() || addingCategory}
                      className="h-9 rounded-[10px] px-3 text-xs font-semibold"
                      style={{ background: 'hsl(160 85% 35%)' }}
                    >
                      {addingCategory ? <FiLoader className="h-3.5 w-3.5 animate-spin" /> : 'เพิ่ม'}
                    </Button>
                  </div>
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setShowQuickCategory(false)
                        setNewCategoryName('')
                      }}
                      className="text-[11px] font-medium text-slate-400 hover:text-slate-600"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </div>
              ) : (
                <Select value={category} onValueChange={(val) => {
                  if (val === '__add_new__') {
                    setShowQuickCategory(true)
                    return
                  }
                  setCategory(val)
                }}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {filteredCats.map((c) => (
                      <SelectItem key={c?._id ?? c?.name} value={c?.name ?? ''}>{c?.name ?? ''}</SelectItem>
                    ))}
                    <SelectItem value="__add_new__" className="text-emerald-700 font-semibold border-t border-slate-100 mt-1">
                      <span className="inline-flex items-center gap-1.5">
                        <FiPlus className="h-3.5 w-3.5" />
                        เพิ่มหมวดใหม่...
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold text-gray-500">{type === 'income' ? 'ชื่อรายการ' : 'Merchant / Store'}</Label>
            <Input placeholder={type === 'income' ? 'e.g. Shopee payout 25/04' : 'e.g. Starbucks, 7-Eleven'} value={merchant} onChange={(e) => setMerchant(e.target.value)} />
          </div>

          <div>
            <Label className="text-xs font-semibold text-gray-500">Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ textAlign: 'left' }} />
          </div>

          {type === 'income' ? (
            <div>
              <Label className="text-xs font-semibold text-gray-500">Amount *</Label>
              <Input
                type="number"
                placeholder="Amount"
                value={items[0]?.amount || ''}
                onChange={(e) => updateItem(0, 'amount', e.target.value)}
              />
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-semibold text-gray-500">Bill Items *</Label>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addItem}>
                  <FiPlus className="h-3 w-3" /> Add Item
                </Button>
              </div>
              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div key={idx} className="rounded-xl border bg-gray-50/80 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-400">Item #{idx + 1}</span>
                      {items.length > 1 && (
                        <button onClick={() => removeItem(idx)} className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600">
                          <FiTrash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <Input
                      placeholder="Item name"
                      value={item.name}
                      onChange={(e) => updateItem(idx, 'name', e.target.value)}
                      className="h-9 text-sm"
                    />
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input
                          type="number"
                          placeholder="Price"
                          value={item.amount}
                          onChange={(e) => updateItem(idx, 'amount', e.target.value)}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="w-20">
                        <Input
                          type="number"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                          className="h-9 text-sm text-center"
                          min="1"
                        />
                      </div>
                    </div>
                    {parseFloat(item.amount) > 0 && parseInt(item.quantity) > 1 && (
                      <p className="text-[11px] text-muted-foreground text-right">
                        Subtotal: {new Intl.NumberFormat('th-TH').format(parseFloat(item.amount) * (parseInt(item.quantity) || 1))} THB
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label className="text-xs font-semibold text-gray-500">Notes</Label>
            <Textarea placeholder="Optional notes..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>

          <div>
            <Label className="text-xs font-semibold text-gray-500">Attachments</Label>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.html,.htm"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-1 w-full h-12 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center gap-2 text-sm text-gray-400 hover:border-gray-300 hover:text-gray-500 hover:bg-gray-50/50 transition-colors"
            >
              <FiPaperclip className="h-4 w-4" />
              Attach files (receipt, bill, etc.)
            </button>
            {attachedFiles.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {attachedFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border">
                    <FiFile className="h-4 w-4 text-blue-500 shrink-0" />
                    <span className="text-xs text-gray-600 truncate flex-1">{file.name}</span>
                    <span className="text-[10px] text-gray-400 shrink-0">{(file.size / 1024).toFixed(0)} KB</span>
                    <button onClick={() => removeFile(idx)} className="p-0.5 rounded hover:bg-red-50 text-red-400">
                      <FiX className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="border-t px-5 py-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-gray-600">Total</span>
            <span className="text-xl font-bold" style={{ color: type === 'expense' ? 'hsl(0 84% 60%)' : 'hsl(160 85% 35%)' }}>
              {type === 'expense' ? '-' : '+'}{new Intl.NumberFormat('th-TH').format(displayTotal)} THB
            </span>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving || uploading || !canSave}
            className="w-full h-12 text-sm font-semibold"
            style={{ background: 'hsl(160 85% 35%)' }}
          >
            {saving || uploading ? <><FiLoader className="mr-2 h-4 w-4 animate-spin" /> {uploading ? 'Uploading...' : 'Saving...'}</> : 'บันทึกรายการ'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function formatDateValue(date: Date) {
  return date.toISOString().slice(0, 10)
}

function formatFilterLabel(start: string, end: string, preset: DateFilterPreset) {
  if (preset === 'today') return 'วันนี้'
  if (preset === 'thisMonth') return 'เดือนนี้'
  if (preset === 'all') return 'ทุกช่วงเวลา'
  const startLabel = start ? new Intl.DateTimeFormat('th-TH', { day: '2-digit', month: 'short' }).format(new Date(start)) : ''
  const endLabel = end ? new Intl.DateTimeFormat('th-TH', { day: '2-digit', month: 'short' }).format(new Date(end)) : ''
  return startLabel && endLabel ? `${startLabel} - ${endLabel}` : 'เลือกช่วงวันที่'
}

function DateFilterControl({
  open,
  onOpenChange,
  filterLabel,
  startDate,
  endDate,
  onPresetChange,
  onStartDateChange,
  onEndDateChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  filterLabel: string
  startDate: string
  endDate: string
  onPresetChange: (preset: DateFilterPreset) => void
  onStartDateChange: (value: string) => void
  onEndDateChange: (value: string) => void
}) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button className="flex h-11 w-full items-center gap-2 rounded-[12px] border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-600 shadow-sm">
          <FiCalendar className="h-4 w-4 text-slate-500" />
          <span>{filterLabel}</span>
          <FiChevronDown className="h-3.5 w-3.5 text-slate-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[320px] rounded-[16px] border-slate-200 p-4">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="justify-start rounded-[10px] text-sm" onClick={() => onPresetChange('today')}>วันนี้</Button>
            <Button variant="outline" className="justify-start rounded-[10px] text-sm" onClick={() => onPresetChange('thisMonth')}>เดือนนี้</Button>
            <Button variant="outline" className="justify-start rounded-[10px] text-sm" onClick={() => onPresetChange('all')}>ทั้งหมด</Button>
            <Button variant="outline" className="justify-start rounded-[10px] text-sm" onClick={() => onPresetChange('custom')}>กำหนดเอง</Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-slate-500">เริ่มต้น</Label>
              <Input type="date" value={startDate} onChange={(e) => onStartDateChange(e.target.value)} className="rounded-[10px]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-slate-500">สิ้นสุด</Label>
              <Input type="date" value={endDate} onChange={(e) => onEndDateChange(e.target.value)} className="rounded-[10px]" />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function AppContent({
  user,
  onLogout,
  authSubmitting,
}: {
  user: AuthUser
  onLogout: () => Promise<void>
  authSubmitting: boolean
}) {
  const [tab, setTab] = useState<'dashboard' | 'income' | 'expense' | 'settings'>('dashboard')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [syncLoading, setSyncLoading] = useState(false)
  const [syncStatus, setSyncStatus] = useState('')
  const [showAddTx, setShowAddTx] = useState(false)

  const [gmailStatus, setGmailStatus] = useState<GmailIntegrationStatus>({ connected: false, configured: false })
  const [emailSyncConfig, setEmailSyncConfig] = useState<EmailSyncConfigData | null>(null)
  const [dateFilterOpen, setDateFilterOpen] = useState(false)
  const [showGoogleConsent, setShowGoogleConsent] = useState(false)
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false)
  const [selectedGoogleServices, setSelectedGoogleServices] = useState({
    gmail: true,
    sheets: false,
    drive: false,
  })
  const today = new Date()
  const [datePreset, setDatePreset] = useState<DateFilterPreset>('thisMonth')
  const [startDate, setStartDate] = useState(formatDateValue(new Date(today.getFullYear(), today.getMonth(), 1)))
  const [endDate, setEndDate] = useState(formatDateValue(today))

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [txRes, budgetRes, catRes] = await Promise.all([
        fetch('/api/transactions').then((r) => r.json()).catch(() => ({ success: false, data: [] })),
        fetch('/api/budgets').then((r) => r.json()).catch(() => ({ success: false, data: [] })),
        fetch('/api/categories').then((r) => r.json()).catch(() => ({ success: false, data: [] })),
      ])
      setTransactions(Array.isArray(txRes?.data) ? txRes.data : [])
      setBudgets(Array.isArray(budgetRes?.data) ? budgetRes.data : [])
      setCategories(Array.isArray(catRes?.data) ? catRes.data : [])
    } catch {
    }
    setLoading(false)
  }, [])

  const fetchGoogleStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/integrations/google/status', { cache: 'no-store' })
      const data = await response.json().catch(() => ({ data: null }))
      if (data?.success && data?.data) {
        setGmailStatus(data.data)
      }
    } catch {}
  }, [])

  const fetchEmailSyncConfig = useCallback(async () => {
    try {
      const response = await fetch('/api/integrations/google/email-config', { cache: 'no-store' })
      const data = await response.json().catch(() => ({ data: null }))
      if (data?.success && data?.data) {
        setEmailSyncConfig(data.data)
      }
    } catch {}
  }, [])

  const triggerAutoSync = useCallback(async () => {
    if (!gmailStatus.connected) return
    try {
      const response = await fetch('/api/integrations/google/auto-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await response.json().catch(() => ({}))
      if (data?.success && data?.data && !data.data.skipped && data.data.imported > 0) {
        await fetchData()
        setSyncStatus(`Auto-sync: นำเข้า ${data.data.imported} รายการใหม่`)
        setTimeout(() => setSyncStatus(''), 5000)
      }
    } catch {}
  }, [gmailStatus.connected, fetchData])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { fetchGoogleStatus() }, [fetchGoogleStatus])
  useEffect(() => { fetchEmailSyncConfig() }, [fetchEmailSyncConfig])

  // Auto-sync: check on mount and every 30 minutes
  useEffect(() => {
    if (!gmailStatus.connected) return
    const timer = setTimeout(() => triggerAutoSync(), 3000) // initial check after 3s
    const interval = setInterval(() => triggerAutoSync(), 30 * 60 * 1000) // every 30 min
    return () => {
      clearTimeout(timer)
      clearInterval(interval)
    }
  }, [gmailStatus.connected, triggerAutoSync])

  // Listen for tab visibility change (e.g. returning from Safari back to LINE app) to refresh status
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchGoogleStatus();
        fetchData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchGoogleStatus, fetchData])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const gmail = params.get('gmail')
    if (!gmail) return

    if (gmail === 'connected') {
      setSyncStatus('เชื่อม Gmail สำเร็จแล้ว พร้อมดึงอีเมลจริงได้เลย')
      fetchGoogleStatus()
    } else {
      setSyncStatus('เชื่อม Gmail ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
    }

    const cleanUrl = `${window.location.pathname}${window.location.hash || ''}`
    window.history.replaceState({}, '', cleanUrl)
  }, [fetchGoogleStatus])

  const displayTx = transactions.filter((tx) => {
    if (datePreset === 'all') return true
    const current = (tx?.date || '').slice(0, 10)
    if (!current) return false
    return current >= startDate && current <= endDate
  })
  const displayBudgets = budgets
  const displayCats = categories
  const filterLabel = formatFilterLabel(startDate, endDate, datePreset)

  function applyDatePreset(preset: DateFilterPreset) {
    const now = new Date()
    if (preset === 'today') {
      const value = formatDateValue(now)
      setDatePreset(preset)
      setStartDate(value)
      setEndDate(value)
      return
    }
    if (preset === 'thisMonth') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      setDatePreset(preset)
      setStartDate(formatDateValue(start))
      setEndDate(formatDateValue(end))
      return
    }
    if (preset === 'all') {
      setDatePreset(preset)
      setStartDate('2000-01-01')
      setEndDate(formatDateValue(now))
      return
    }
    setDatePreset('custom')
  }

  function handleStartDateChange(value: string) {
    setDatePreset('custom')
    setStartDate(value)
    if (endDate && value > endDate) setEndDate(value)
  }

  function handleEndDateChange(value: string) {
    setDatePreset('custom')
    setEndDate(value)
    if (startDate && value < startDate) setStartDate(value)
  }

  function handleConnectGmail() {
    if (!gmailStatus.configured) {
      setSyncStatus('เซิร์ฟเวอร์ยังไม่ได้ตั้งค่า GOOGLE_CLIENT_ID และ GOOGLE_CLIENT_SECRET')
      return
    }
    setShowGoogleConsent(true)
  }

  async function confirmGoogleConnect() {
    const services = [];
    if (selectedGoogleServices.gmail) services.push('gmail');
    if (selectedGoogleServices.sheets) services.push('sheets');
    if (selectedGoogleServices.drive) services.push('drive');
    
    if (services.length === 0) return;

    setIsConnectingGoogle(true);

    // Detect LINE in-app browser via User-Agent
    const isLINEBrowser = /Line\//i.test(navigator.userAgent);

    // If in LINE, tell the server to redirect back to LIFF after OAuth
    // Force return to our success page which will then tell the user to go back to LINE
    const returnTo = isLINEBrowser ? `/google-sync-success` : `${window.location.pathname}${window.location.search}`;
    const connectUrl = `/api/integrations/google/connect?services=${services.join(',')}&returnTo=${encodeURIComponent(returnTo)}`;

    if (isLINEBrowser) {
      try {
        setSyncStatus('กำลังเตรียมลิงก์เชื่อมต่อ...');
        // Fetch the Google Auth URL as JSON
        const res = await fetch(`${connectUrl}&mode=json`);
        const data = await res.json();
        if (!data?.url) {
          setSyncStatus('ไม่สามารถสร้างลิงก์เชื่อมต่อ Google ได้');
          setIsConnectingGoogle(false);
          return;
        }

        setSyncStatus('กำลังโหลด LINE SDK...');
        let liff = window.liff;
        if (!liff) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('โหลด SDK ไม่สำเร็จ'));
            document.head.appendChild(script);
          });
          liff = window.liff;
        }

        // Ensure LIFF is initialized before calling openWindow
        if (liff && NEXT_PUBLIC_LINE_LIFF_ID) {
          setSyncStatus('กำลังเตรียมเปิดเบราว์เซอร์...');
          try {
            await liff.init({ liffId: NEXT_PUBLIC_LINE_LIFF_ID });
          } catch (e: any) {
            console.warn('LIFF Init error:', e);
            // Ignore error, might already be initialized
          }
          
          liff.openWindow({ url: data.url, external: true });
          setShowGoogleConsent(false);
          setSyncStatus(''); // clear status on success
        } else {
          setSyncStatus('ไม่พบ LINE LIFF SDK');
        }
      } catch (e: any) {
        setSyncStatus(`เกิดข้อผิดพลาด: ${e.message || 'ไม่ทราบสาเหตุ'}`);
      } finally {
        setIsConnectingGoogle(false);
      }
    } else {
      // Desktop / normal browser - direct redirect
      window.location.href = connectUrl;
      // We don't need to set isConnectingGoogle to false here because the page will redirect
    }
  }

  async function handleSyncEmail() {
    if (!gmailStatus.configured) {
      setSyncStatus('เซิร์ฟเวอร์ยังไม่ได้ตั้งค่า GOOGLE_CLIENT_ID และ GOOGLE_CLIENT_SECRET')
      return
    }

    if (!gmailStatus.connected) {
      handleConnectGmail()
      return
    }

    setSyncLoading(true)
    setSyncStatus('')
    try {
      const response = await fetch('/api/integrations/google/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: 30 }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data?.error || 'Failed to sync Gmail')
      await Promise.all([fetchData(), fetchGoogleStatus()])
      const summary = data?.data
      setSyncStatus(`ดึงอีเมลจริงแล้ว: นำเข้า ${summary?.imported ?? 0} รายการ, ซ้ำ ${summary?.duplicates ?? 0}, ตรวจเจอ ${summary?.parsed ?? 0} จาก ${summary?.scanned ?? 0} อีเมล`)
    } catch (err: any) {
      setSyncStatus(err?.message ?? 'Error syncing Gmail.')
    }
    setSyncLoading(false)
  }

  async function handleDisconnectGmail() {
    try {
      const response = await fetch('/api/integrations/google/disconnect', { method: 'DELETE' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data?.error || 'ไม่สามารถยกเลิกการเชื่อม Gmail ได้')
      setGmailStatus({ connected: false, configured: gmailStatus.configured })
      setSyncStatus('ยกเลิกการเชื่อม Gmail แล้ว')
    } catch (error: any) {
      setSyncStatus(error?.message || 'ไม่สามารถยกเลิกการเชื่อม Gmail ได้')
    }
  }

  async function handleAddTransaction(tx: Omit<Transaction, '_id'>) {
    try {
      await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tx),
      })
      await fetchData()
    } catch { }
  }

  async function handleUpdateTx(tx: Transaction) {
    try {
      await fetch('/api/transactions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tx),
      })
      await fetchData()
    } catch { }
  }

  async function handleDeleteTx(id: string) {
    try {
      await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' })
      await fetchData()
    } catch { }
  }

  async function handleAddCategory(cat: Omit<CategoryItem, '_id'>) {
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cat),
      })
      const data = await response.json().catch(() => ({}))
      await fetchData()
      return data?.data ?? null
    } catch {
      return null
    }
  }

  async function handleDeleteCategory(id: string) {
    try {
      await fetch(`/api/categories?id=${id}`, { method: 'DELETE' })
      await fetchData()
    } catch { }
  }

  async function handleUpdateEmailSyncConfig(update: Partial<EmailSyncConfigData>) {
    try {
      const response = await fetch('/api/integrations/google/email-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      })
      const data = await response.json().catch(() => ({}))
      if (data?.success && data?.data) {
        setEmailSyncConfig(data.data)
      }
    } catch {}
  }

  const tabs = [
    { key: 'dashboard' as const, label: 'หน้าแรก', icon: FiHome },
    { key: 'income' as const, label: 'รายรับ', icon: FiTrendingUp },
    { key: 'expense' as const, label: 'รายจ่าย', icon: FiTrendingDown },
    { key: 'settings' as const, label: 'ตั้งค่า', icon: FiSettings },
  ]

  return (
    <div className="flex flex-col" style={{ height: '100dvh', background: 'linear-gradient(135deg, hsl(160 40% 94%) 0%, hsl(180 35% 93%) 30%, hsl(160 35% 95%) 60%, hsl(140 40% 94%) 100%)' }}>
      <div className="flex-1 overflow-y-auto max-w-lg mx-auto w-full px-4 pt-4 pb-4">
        <div className="mb-4 space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <DateFilterControl
                open={dateFilterOpen}
                onOpenChange={setDateFilterOpen}
                filterLabel={filterLabel}
                startDate={startDate}
                endDate={endDate}
                onPresetChange={applyDatePreset}
                onStartDateChange={handleStartDateChange}
                onEndDateChange={handleEndDateChange}
              />
            </div>
            <UserProfileMenu user={user} onLogout={onLogout} submitting={authSubmitting} />
          </div>

        </div>

        {tab === 'dashboard' && (
          <DashboardSection
            transactions={displayTx}
            budgets={displayBudgets}
            onSyncEmail={handleSyncEmail}
            syncLoading={syncLoading}
            syncStatus={syncStatus}
            loading={loading}
            onGoToIncome={() => setTab('income')}
            onGoToExpense={() => setTab('expense')}
            gmailStatus={gmailStatus}
            onConnectGmail={handleConnectGmail}
          />
        )}
        {tab === 'income' && (
          <IncomeSection
            transactions={displayTx}
            categories={displayCats}
            onUpdate={handleUpdateTx}
            onDelete={handleDeleteTx}
            onAddTransaction={() => setShowAddTx(true)}
            onAddCategory={handleAddCategory}
            loading={loading}
          />
        )}
        {tab === 'expense' && (
          <ExpenseSection
            transactions={displayTx}
            categories={displayCats}
            onUpdate={handleUpdateTx}
            onDelete={handleDeleteTx}
            onAddTransaction={() => setShowAddTx(true)}
            onAddCategory={handleAddCategory}
            loading={loading}
          />
        )}
        {tab === 'settings' && (
          <SettingsSection
            categories={displayCats}
            onAddCategory={handleAddCategory}
            onDeleteCategory={handleDeleteCategory}
            gmailStatus={gmailStatus}
            syncLoading={syncLoading}
            onConnectGmail={handleConnectGmail}
            onDisconnectGmail={handleDisconnectGmail}
            onSyncGmail={handleSyncEmail}
            lineLiffId={NEXT_PUBLIC_LINE_LIFF_ID}
            lineLiffUrl={LIFF_URL}
            loading={loading}
            emailSyncConfig={emailSyncConfig}
            onUpdateEmailSyncConfig={handleUpdateEmailSyncConfig}
          />
        )}
      </div>

      <div className="shrink-0 z-50" style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(16px)', borderTop: '1px solid rgba(0,0,0,0.06)', paddingBottom: '4px' }}>
        <div className="max-w-lg mx-auto flex">
          {tabs.map((t) => {
            const Icon = t.icon
            const isActive = tab === t.key
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 flex flex-col items-center py-3 text-xs transition-colors ${isActive ? 'font-semibold' : 'text-muted-foreground'}`}
                style={isActive ? { color: 'hsl(160 85% 35%)' } : undefined}
              >
                <Icon className="h-5 w-5 mb-0.5" />
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      <AddTransactionSheet
        open={showAddTx}
        onClose={() => setShowAddTx(false)}
        categories={displayCats}
        onSave={handleAddTransaction}
        onAddCategory={handleAddCategory}
        favoriteTransactions={displayTx.filter(t => t.is_favorite)}
        defaultType={tab === 'income' ? 'income' : 'expense'}
      />

      {/* Google Consent Dialog */}
      <Dialog open={showGoogleConsent} onOpenChange={setShowGoogleConsent}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 font-bold text-blue-600">G</span>
              เชื่อมต่อ Google Services
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-500">เลือกบริการที่คุณต้องการให้แอปเข้าถึงและจัดการ:</p>
            <div className="space-y-4">
              
              <div>
                <div className="mb-2 text-xs font-bold text-emerald-600 uppercase tracking-wider">ส่วนที่ 1: ดึงข้อมูลอัตโนมัติ</div>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-100 bg-white p-3 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:border-emerald-200 hover:bg-emerald-50/30 transition-all">
                  <div className="mt-0.5">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
                      checked={selectedGoogleServices.gmail}
                      onChange={(e) => setSelectedGoogleServices(p => ({ ...p, gmail: e.target.checked }))}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">อ่านใบเสร็จจากอีเมล (Gmail)</p>
                    <p className="text-xs text-slate-500 mt-0.5">ใช้ AI อ่านอีเมลแจ้งเตือนเงินเข้า/ออกจากธนาคาร เพื่อสร้างรายการรายรับรายจ่ายให้คุณโดยอัตโนมัติ</p>
                  </div>
                </label>
              </div>

              <div>
                <div className="mb-2 text-xs font-bold text-blue-600 uppercase tracking-wider">ส่วนที่ 2: พื้นที่จัดเก็บส่วนตัว (BYOS)</div>
                <div className="space-y-2">
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-100 bg-white p-3 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:border-blue-200 hover:bg-blue-50/30 transition-all">
                    <div className="mt-0.5">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                        checked={selectedGoogleServices.sheets}
                        onChange={(e) => setSelectedGoogleServices(p => ({ ...p, sheets: e.target.checked }))}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">แบ็คอัพลงตาราง (Google Sheets)</p>
                      <p className="text-xs text-slate-500 mt-0.5">เก็บประวัติรายการทั้งหมดลง Sheet อัตโนมัติ ป้องกันข้อมูลหายและช่วยปลดล็อกลิมิตพื้นที่แอป</p>
                    </div>
                  </label>

                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-100 bg-white p-3 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:border-blue-200 hover:bg-blue-50/30 transition-all">
                    <div className="mt-0.5">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                        checked={selectedGoogleServices.drive}
                        onChange={(e) => setSelectedGoogleServices(p => ({ ...p, drive: e.target.checked }))}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">เก็บสลิปโอนเงิน (Google Drive)</p>
                      <p className="text-xs text-slate-500 mt-0.5">สร้างโฟลเดอร์สำหรับเก็บสลิปโดยเฉพาะ ไม่เปลืองพื้นที่แอป และไม่ละเมิดไฟล์ส่วนตัวอื่นๆ ใน Drive ของคุณ</p>
                    </div>
                  </label>
                </div>
              </div>
              
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" onClick={() => setShowGoogleConsent(false)} disabled={isConnectingGoogle}>ยกเลิก</Button>
            <Button
              onClick={confirmGoogleConnect}
              disabled={isConnectingGoogle || (!selectedGoogleServices.gmail && !selectedGoogleServices.sheets && !selectedGoogleServices.drive)}
              style={{ background: 'hsl(160 85% 35%)' }}
              className="min-w-[120px]"
            >
              {isConnectingGoogle ? (
                <>
                  <FiLoader className="h-4 w-4 mr-2 animate-spin" />
                  กำลังโหลด...
                </>
              ) : (
                'ดำเนินการต่อ'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AuthGate() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [authSubmitting, setAuthSubmitting] = useState(false)
  const [authError, setAuthError] = useState('')
  const [lineAutoLoginPending, setLineAutoLoginPending] = useState(false)
  const [lineAutoLoginTried, setLineAutoLoginTried] = useState(false)

  async function ensureLiffLoaded() {
    if (window.liff) return window.liff
    await new Promise<void>((resolve, reject) => {
      const existing = document.querySelector('script[data-liff-sdk="true"]') as HTMLScriptElement | null
      if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true })
        existing.addEventListener('error', () => reject(new Error('ไม่สามารถโหลด LIFF SDK ได้')), { once: true })
        return
      }
      const script = document.createElement('script')
      script.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js'
      script.async = true
      script.dataset.liffSdk = 'true'
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('ไม่สามารถโหลด LIFF SDK ได้'))
      document.head.appendChild(script)
    })
    return window.liff
  }

  const loadCurrentUser = useCallback(async () => {
    setCheckingAuth(true)
    try {
      const response = await fetch('/api/auth/me', { cache: 'no-store' })
      const data = await response.json().catch(() => ({ user: null }))
      setUser(data?.user ?? null)
    } catch {
      setUser(null)
    } finally {
      setCheckingAuth(false)
    }
  }, [])

  useEffect(() => {
    loadCurrentUser()
  }, [loadCurrentUser])

  async function login(payload: { email: string; password: string }) {
    setAuthSubmitting(true)
    setAuthError('')
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data?.error || 'เข้าสู่ระบบไม่สำเร็จ')
      }
      setUser(data?.user ?? null)
    } catch (error: any) {
      setAuthError(error?.message || 'เข้าสู่ระบบไม่สำเร็จ')
    } finally {
      setAuthSubmitting(false)
    }
  }

  async function register(payload: { name: string; email: string; password: string }) {
    setAuthSubmitting(true)
    setAuthError('')
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data?.error || 'สร้างบัญชีไม่สำเร็จ')
      }
      setUser(data?.user ?? null)
    } catch (error: any) {
      setAuthError(error?.message || 'สร้างบัญชีไม่สำเร็จ')
    } finally {
      setAuthSubmitting(false)
    }
  }

  async function logout() {
    setAuthSubmitting(true)
    setAuthError('')
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      setUser(null)
    } catch {
      setAuthError('ออกจากระบบไม่สำเร็จ')
    } finally {
      setAuthSubmitting(false)
    }
  }

  async function loginWithLine() {
    if (!NEXT_PUBLIC_LINE_LIFF_ID) {
      setAuthError('LIFF ยังไม่ได้ตั้งค่า')
      return
    }

    setAuthSubmitting(true)
    setAuthError('')

    try {
      const liff = await ensureLiffLoaded()
      await liff.init({ liffId: NEXT_PUBLIC_LINE_LIFF_ID, withLoginOnExternalBrowser: true })

      if (!liff.isLoggedIn()) {
        if (!liff.isInClient()) {
          liff.login({ redirectUri: window.location.href })
          return
        }
        throw new Error('LINE ยังไม่ได้ยืนยันตัวตนใน LIFF')
      }

      const idToken = liff.getIDToken()
      if (!idToken) {
        throw new Error('LINE ไม่ส่ง ID token กลับมา')
      }

      const response = await fetch('/api/auth/line-liff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data?.error || 'เข้าสู่ระบบด้วย LINE ไม่สำเร็จ')
      }
      setUser(data?.user ?? null)
    } catch (error: any) {
      setAuthError(error?.message || 'เข้าสู่ระบบด้วย LINE ไม่สำเร็จ')
    } finally {
      setAuthSubmitting(false)
    }
  }

  useEffect(() => {
    if (checkingAuth || user || authSubmitting || !NEXT_PUBLIC_LINE_LIFF_ID) return
    const params = new URLSearchParams(window.location.search)
    const ua = window.navigator.userAgent.toLowerCase()
    const openedFromLine = ua.includes(' line/')
    const hasLiffState = params.has('liff.state') || params.has('access_token') || params.has('id_token')
    if ((openedFromLine || hasLiffState) && !lineAutoLoginTried) {
      setLineAutoLoginTried(true)
      setLineAutoLoginPending(true)
      loginWithLine().finally(() => setLineAutoLoginPending(false))
    }
  }, [checkingAuth, user, authSubmitting, lineAutoLoginTried])

  if (checkingAuth || lineAutoLoginPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm">
          <FiLoader className="h-4 w-4 animate-spin text-emerald-600" />
          {lineAutoLoginPending ? 'กำลังเชื่อมต่อ LINE...' : 'กำลังโหลดข้อมูลผู้ใช้...'}
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <AuthScreen
        onLogin={login}
        onRegister={register}
        onLineLogin={loginWithLine}
        submitting={authSubmitting}
        error={authError}
      />
    )
  }

  return <AppContent user={user} onLogout={logout} authSubmitting={authSubmitting} />
}

export default function Page() {
  return (
    <ErrorBoundary>
      <div style={THEME_VARS} className="min-h-screen bg-background text-foreground">
        <AuthGate />
      </div>
    </ErrorBoundary>
  )
}
