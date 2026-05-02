'use client'

import React, { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  FiTrendingUp, FiEdit2, FiTrash2, FiLoader, FiSearch,
  FiX, FiPackage, FiPlus, FiCheck, FiCheckCircle,
  FiChevronLeft, FiChevronRight, FiMail, FiClock,
  FiFileText, FiPaperclip, FiExternalLink,
} from 'react-icons/fi'

interface BillItem {
  name: string
  amount: number
  quantity: number
  notes?: string
}

interface ReceiptFile {
  asset_id?: string
  file_name: string
  mime_type?: string
  size_bytes?: number
}

interface Transaction {
  _id?: string
  type: string
  amount: number
  category: string
  merchant: string
  date: string
  source?: string
  notes?: string
  needs_review?: boolean
  email_subject?: string
  email_html?: string
  receipt_url?: string
  receipt_files?: ReceiptFile[]
  items?: BillItem[]
}

interface Category {
  _id?: string
  name: string
  type: string
}

interface AddItemForm {
  name: string
  amount: string
  quantity: string
  notes: string
}

interface IncomeSectionProps {
  transactions: Transaction[]
  categories: Category[]
  onUpdate: (tx: Transaction) => void
  onDelete: (id: string) => void
  onAddTransaction: () => void
  onAddCategory?: (cat: { name: string; type: string; is_default: boolean }) => Promise<Category | null>
  loading: boolean
}

interface TransactionVisual {
  src: string
  alt: string
  sourceLabel: string
  detailLabel: string
}

function getTransactionVisual(tx: Transaction, mode: 'pending' | 'history' | 'detail' = 'history'): TransactionVisual {
  const lookup = `${tx?.merchant ?? ''} ${tx?.category ?? ''} ${tx?.email_subject ?? ''}`.toLowerCase()
  const bankDetail = tx?.notes || tx?.email_subject || tx?.merchant || 'Bank notification'
  const platformDetail = tx?.merchant || tx?.notes || tx?.category || 'Platform payout'
  const manualDetail = tx?.merchant || tx?.category || 'Manual entry'

  if (lookup.includes('shopee')) {
    return { src: '/logos/shopee.png', alt: 'Shopee', sourceLabel: 'Shopee payout', detailLabel: platformDetail }
  }
  if (lookup.includes('grab')) {
    return { src: '/logos/grab.png', alt: 'Grab', sourceLabel: 'Grab payout', detailLabel: platformDetail }
  }
  if (lookup.includes('line') || lookup.includes('lineman')) {
    return { src: '/logos/lineman.png', alt: 'Lineman', sourceLabel: 'Lineman payout', detailLabel: platformDetail }
  }
  if (lookup.includes('kbank') || lookup.includes('kasikorn')) {
    return { src: '/logos/kbank.png', alt: 'KBank', sourceLabel: 'KBank', detailLabel: bankDetail }
  }
  if (lookup.includes('scb')) {
    return { src: '/logos/scb.png', alt: 'SCB', sourceLabel: 'SCB', detailLabel: bankDetail }
  }
  if (lookup.includes('ktg') || lookup.includes('krungthai')) {
    return { src: '/logos/ktg.png', alt: 'KTG', sourceLabel: 'Krungthai', detailLabel: bankDetail }
  }
  return {
    src: '/logos/cashew-app.png',
    alt: 'CASHEW',
    sourceLabel: tx?.source === 'manual' ? 'Manual' : 'Gmail',
    detailLabel: manualDetail,
  }
}

function TransactionLogo({ tx, className, imageClassName = 'h-full w-full object-contain' }: { tx: Transaction; className: string; imageClassName?: string }) {
  const logo = getTransactionVisual(tx)
  return (
    <div className={className}>
      <img src={logo.src} alt={logo.alt} className={imageClassName} />
    </div>
  )
}

export default function IncomeSection({ transactions, categories, onUpdate, onDelete, onAddTransaction, onAddCategory, loading }: IncomeSectionProps) {
  const safeTx = Array.isArray(transactions) ? transactions : []
  const safeCats = Array.isArray(categories) ? categories : []

  const incomeTx = safeTx
    .filter((t) => t?.type === 'income')
    .sort((a, b) => new Date(b?.date ?? 0).getTime() - new Date(a?.date ?? 0).getTime())

  const needsReview = incomeTx.filter((t) => t?.needs_review && t?.source === 'email')
  const confirmed = incomeTx.filter((t) => !t?.needs_review || t?.source !== 'email')

  const [searchQuery, setSearchQuery] = useState('')
  const [editTx, setEditTx] = useState<Transaction | null>(null)
  const [editForm, setEditForm] = useState({ category: '', amount: '', notes: '', date: '' })
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)
  const [confirmTx, setConfirmTx] = useState<Transaction | null>(null)
  const [confirmCategory, setConfirmCategory] = useState('')
  const [confirmMerchant, setConfirmMerchant] = useState('')
  const [confirmNotes, setConfirmNotes] = useState('')
  const [confirmItems, setConfirmItems] = useState<AddItemForm[]>([])
  const [showEmailHtml, setShowEmailHtml] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showAddCatConfirm, setShowAddCatConfirm] = useState(false)
  const [showAddCatEdit, setShowAddCatEdit] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [addingCat, setAddingCat] = useState(false)

  const totalIncome = confirmed.reduce((sum, t) => sum + (t?.amount ?? 0), 0)
  const incomeCategories = safeCats.filter((c) => c?.type === 'income')

  function filterBySearch(list: Transaction[]) {
    if (!searchQuery) return list
    const q = searchQuery.toLowerCase()
    return list.filter((t) => (t?.merchant ?? '').toLowerCase().includes(q) || (t?.category ?? '').toLowerCase().includes(q))
  }

  const filteredReview = filterBySearch(needsReview)
  const filteredConfirmed = filterBySearch(confirmed)

  function formatAmount(amount: number) {
    return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 0 }).format(amount)
  }

  function formatDate(dateStr: string) {
    if (!dateStr) return ''
    try {
      return new Intl.DateTimeFormat('en-GB').format(new Date(dateStr))
    } catch {
      return dateStr
    }
  }

  function formatFullDate(dateStr: string) {
    if (!dateStr) return ''
    try {
      return new Date(dateStr).toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    } catch {
      return dateStr
    }
  }

  function formatFileSize(size?: number) {
    if (!size) return ''
    if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`
    return `${Math.max(1, Math.round(size / 1024))} KB`
  }

  function getReceiptFiles(tx: Transaction): ReceiptFile[] {
    if (Array.isArray(tx.receipt_files) && tx.receipt_files.length > 0) return tx.receipt_files
    if (tx.receipt_url) {
      return [{ asset_id: tx.receipt_url, file_name: 'ไฟล์แนบ' }]
    }
    return []
  }

  function openConfirmDialog(tx: Transaction) {
    setConfirmTx(tx)
    setConfirmCategory(tx?.category || '')
    setConfirmMerchant(tx?.merchant || '')
    setConfirmNotes(tx?.notes || '')
    setConfirmItems([])
  }

  function addConfirmItem() {
    setConfirmItems((prev) => [...prev, { name: '', amount: '', quantity: '1', notes: '' }])
  }

  function removeConfirmItem(idx: number) {
    setConfirmItems((prev) => prev.filter((_, i) => i !== idx))
  }

  function updateConfirmItem(idx: number, field: keyof AddItemForm, value: string) {
    setConfirmItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  function handleConfirmWithCategory() {
    if (!confirmTx) return
    const validItems: BillItem[] = confirmItems
      .filter((item) => item.name.trim() && parseFloat(item.amount) > 0)
      .map((item) => ({
        name: item.name.trim(),
        amount: parseFloat(item.amount),
        quantity: parseInt(item.quantity) || 1,
        notes: item.notes || undefined,
      }))

    onUpdate({
      ...confirmTx,
      needs_review: false,
      category: confirmCategory || confirmTx.category,
      merchant: confirmMerchant || confirmTx.merchant,
      notes: confirmNotes || confirmTx.notes,
      items: undefined,
    })
    setConfirmTx(null)
    setConfirmCategory('')
    setConfirmMerchant('')
    setConfirmNotes('')
    setConfirmItems([])
  }

  function handleRemove(tx: Transaction) {
    if (tx._id) onDelete(tx._id)
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

  function scrollCarousel(dir: 'left' | 'right') {
    if (!scrollRef.current) return
    const scrollAmount = 300
    scrollRef.current.scrollBy({ left: dir === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <FiLoader className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading...</span>
      </div>
    )
  }

  // Detail view
  if (selectedTx) {
    const items = Array.isArray(selectedTx.items) ? selectedTx.items : []
    const receiptFiles = getReceiptFiles(selectedTx)
    return (
      <div className="space-y-5 pb-24">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedTx(null)} className="w-10 h-10 rounded-2xl bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors shadow-sm">
            <FiX className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-bold text-gray-800">รายละเอียดรายรับ</h2>
        </div>

        <div className="rounded-3xl overflow-hidden shadow-lg" style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(20px)' }}>
          <div className="p-6" style={{ background: 'linear-gradient(135deg, hsl(160 85% 38%) 0%, hsl(150 70% 32%) 100%)' }}>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <FiTrendingUp className="h-7 w-7 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-white font-bold text-lg">{selectedTx.merchant || selectedTx.category}</p>
                <p className="text-white/60 text-sm">{selectedTx.category}</p>
              </div>
            </div>
            <p className="text-3xl font-extrabold text-white mt-4">
              +{formatAmount(selectedTx.amount)}
              <span className="text-base font-normal text-white/50 ml-2">THB</span>
            </p>
          </div>

          <div className="p-6 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">วันที่</span>
              <span className="text-sm font-medium text-gray-800">{formatFullDate(selectedTx.date)}</span>
            </div>
            <div className="h-px bg-gray-100" />
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">แหล่งที่มา</span>
              <Badge variant="outline" className="text-xs rounded-full px-3">{selectedTx.source === 'email' ? 'Email' : 'Manual'}</Badge>
            </div>
            {selectedTx.email_subject && (
              <>
                <div className="h-px bg-gray-100" />
                <div className="flex justify-between items-start">
                  <span className="text-sm text-gray-500">อีเมล</span>
                  <span className="text-sm text-gray-700 text-right max-w-[60%]">{selectedTx.email_subject}</span>
                </div>
              </>
            )}
            {selectedTx.notes && (
              <>
                <div className="h-px bg-gray-100" />
                <div className="flex justify-between items-start">
                  <span className="text-sm text-gray-500">หมายเหตุ</span>
                  <span className="text-sm text-gray-700 text-right max-w-[60%]">{selectedTx.notes}</span>
                </div>
              </>
            )}
            {receiptFiles.length > 0 && (
              <>
                <div className="h-px bg-gray-100" />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">ไฟล์แนบ</span>
                    <span className="text-xs font-medium text-slate-400">{receiptFiles.length} ไฟล์</span>
                  </div>
                  <div className="space-y-2">
                    {receiptFiles.map((file, idx) => {
                      const fileLink = file.asset_id?.startsWith('http') ? file.asset_id : selectedTx.receipt_url?.startsWith('http') ? selectedTx.receipt_url : ''
                      return (
                        <div key={`${file.file_name}-${idx}`} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm">
                            <FiPaperclip className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-700">{file.file_name}</p>
                            <p className="truncate text-[11px] text-slate-400">
                              {formatFileSize(file.size_bytes) || file.mime_type || (file.asset_id ? `Asset: ${file.asset_id}` : 'แนบจากรายการ manual')}
                            </p>
                          </div>
                          {fileLink ? (
                            <a href={fileLink} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1 rounded-[10px] border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600">
                              เปิด
                              <FiExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-[11px] font-medium text-slate-400">แนบแล้ว</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="px-6 pb-6 flex gap-3">
            {selectedTx.needs_review && (
              <Button size="sm" className="flex-1 gap-1.5 h-11 rounded-2xl text-sm font-semibold" style={{ background: 'hsl(160 85% 35%)' }} onClick={() => { setSelectedTx(null); openConfirmDialog(selectedTx) }}>
                <FiCheck className="h-4 w-4" /> ยืนยัน
              </Button>
            )}
            <Button variant="outline" size="sm" className="flex-1 gap-1.5 h-11 rounded-2xl text-sm" onClick={() => { setSelectedTx(null); openEdit(selectedTx) }}>
              <FiEdit2 className="h-4 w-4" /> แก้ไข
            </Button>
            <Button variant="outline" size="sm" className="flex-1 gap-1.5 h-11 rounded-2xl text-sm text-red-500 hover:text-red-700 border-red-200 hover:bg-red-50" onClick={() => { setSelectedTx(null); setDeleteConfirm(selectedTx._id ?? null) }}>
              <FiTrash2 className="h-4 w-4" /> ลบ
            </Button>
          </div>
        </div>

        {items.length > 0 && (
          <div className="rounded-3xl overflow-hidden shadow-lg" style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(20px)' }}>
            <div className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <FiPackage className="h-5 w-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-gray-800">รายการ ({items.length})</h3>
              </div>
              <div className="space-y-1">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-b-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{item.name}</p>
                      {item.quantity > 1 && (
                        <p className="text-xs text-gray-400 mt-0.5">{formatAmount(item.amount)} x {item.quantity}</p>
                      )}
                    </div>
                    <span className="text-sm font-bold text-emerald-600 ml-3">{formatAmount(item.amount * (item.quantity || 1))} THB</span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-3 mt-2 border-t border-gray-200">
                  <span className="text-sm font-bold text-gray-800">รวม</span>
                  <span className="text-base font-extrabold text-emerald-600">{formatAmount(items.reduce((sum, i) => sum + i.amount * (i.quantity || 1), 0))} THB</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[24px] font-extrabold tracking-tight text-slate-800">รายรับ</h2>
          <p className="text-xs font-medium text-slate-400">Income</p>
        </div>
        <Button size="sm" className="h-10 gap-1.5 rounded-[10px] px-4" style={{ background: 'hsl(160 85% 35%)' }} onClick={onAddTransaction}>
          <FiPlus className="h-4 w-4" /> เพิ่มรายการ
        </Button>
      </div>

      <div className="rounded-[12px] border border-slate-100 bg-white px-5 py-5 shadow-[0_8px_20px_rgba(15,23,42,0.035)]">
        <div className="mb-5 flex items-start gap-3">
          <div className="flex items-center gap-2 text-[13px] text-slate-500">
            <FiClock className="h-4 w-4 text-amber-500" />
            <span className="font-medium">
              {needsReview.length > 0 ? `${needsReview.length} รายการที่ยังไม่ยืนยัน` : `${incomeTx.length} รายการทั้งหมด`}
            </span>
          </div>
        </div>
        <div className="text-center">
          <p className="bg-gradient-to-b from-emerald-200 to-emerald-500 bg-clip-text text-[30px] font-extrabold text-transparent">
            รายรับ
          </p>
          <p className="mt-3 text-[56px] font-extrabold leading-none text-slate-600">
            {formatAmount(totalIncome)}
          </p>
          <p className="mt-4 text-[16px] font-medium text-slate-500">THB</p>
        </div>
      </div>

      <div className="relative">
        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="ค้นหาร้านค้า หรือ หมวดหมู่..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-11 rounded-[12px] border-gray-200 bg-white/90 pl-10 shadow-sm"
        />
      </div>

      {filteredReview.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="text-[22px] font-extrabold tracking-tight text-slate-800">รอยืนยัน</p>
            </div>
            {filteredReview.length > 1 && (
              <div className="flex gap-1">
                <button onClick={() => scrollCarousel('left')} className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm transition-colors hover:bg-slate-50">
                  <FiChevronLeft className="h-4 w-4 text-gray-600" />
                </button>
                <button onClick={() => scrollCarousel('right')} className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm transition-colors hover:bg-slate-50">
                  <FiChevronRight className="h-4 w-4 text-gray-600" />
                </button>
              </div>
            )}
          </div>

          <div
            ref={scrollRef}
            className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {filteredReview.map((tx, idx) => (
              <div
                key={tx?._id ?? idx}
                className="snap-start relative h-[146px] w-[242px] shrink-0 overflow-hidden rounded-[12px] border border-slate-100 bg-white p-3 shadow-[0_8px_20px_rgba(15,23,42,0.04)]"
              >{(() => {
                const visual = getTransactionVisual(tx, 'pending')
                return (
                  <>
                <div className="relative z-10 flex justify-end">
                  <div className="text-right">
                    <p className="text-[12px] font-medium text-slate-400">{visual.sourceLabel}</p>
                    <p className="mt-1 text-[16px] font-extrabold text-emerald-600">+{formatAmount(tx?.amount ?? 0)} THB</p>
                    <p className="text-[12px] text-slate-400">{formatDate(tx?.date ?? '')}</p>
                  </div>
                </div>

                <div className="absolute bottom-[-10px] left-0">
                  <TransactionLogo
                    tx={tx}
                    className="flex h-[142px] w-[142px] items-center justify-center"
                    imageClassName="h-full w-full object-contain"
                  />
                </div>

                <div className="absolute bottom-3 right-3 z-10 flex gap-2">
                  <button
                    onClick={() => openConfirmDialog(tx)}
                    className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[8px] px-3.5 text-[13px] font-semibold text-white transition-colors"
                    style={{ background: 'hsl(160 85% 35%)' }}
                  >
                    ยืนยัน
                  </button>
                  <button
                    onClick={() => handleRemove(tx)}
                    className="flex h-8 min-w-[46px] items-center justify-center rounded-[8px] bg-slate-200 px-3 text-[13px] font-semibold text-slate-500 transition-colors hover:bg-slate-300"
                  >
                    ลบ
                  </button>
                </div>
                  </>
                )
              })()}</div>
            ))}
          </div>
        </div>
      )}

      <div>
        {filteredConfirmed.length > 0 && (
          <div className="mb-3 flex items-center gap-2">
            <p className="text-[22px] font-extrabold tracking-tight text-slate-800">รายการล่าสุด</p>
          </div>
        )}

        {filteredConfirmed.length === 0 && filteredReview.length === 0 ? (
          <div className="rounded-[12px] border border-slate-100 bg-white p-8 text-center shadow-[0_10px_24px_rgba(15,23,42,0.045)]">
            <FiTrendingUp className="h-12 w-12 mx-auto mb-3 text-emerald-200" />
            <p className="text-sm font-medium text-gray-500">ยังไม่มีรายรับ</p>
            <p className="text-xs text-gray-400 mt-1">เพิ่มรายรับหรือ sync จากอีเมล</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredConfirmed.map((tx, idx) => (
              <button
                key={tx?._id ?? idx}
                onClick={() => setSelectedTx(tx)}
                className="relative w-full overflow-hidden rounded-[12px] border border-slate-100 bg-white px-4 pt-4 pb-3 text-left shadow-[0_8px_20px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(15,23,42,0.055)] active:scale-[0.99]"
              >{(() => {
                const visual = getTransactionVisual(tx, 'history')
                return (
                  <>
                <div className="absolute bottom-[-12px] left-0">
                  <TransactionLogo
                    tx={tx}
                    className="flex h-[150px] w-[150px] items-center justify-center"
                    imageClassName="h-full w-full object-contain"
                  />
                </div>
                <div className="flex h-[118px] flex-col pl-[140px]">
                  <div className="flex min-h-0 flex-1 flex-col items-end text-right">
                    <p className="max-w-[132px] truncate text-[18px] font-bold text-slate-500">{visual.detailLabel}</p>
                    <p className="mt-2 text-[16px] font-extrabold text-emerald-600">+{formatAmount(tx?.amount ?? 0)} THB</p>
                    <p className="mt-2 text-[12px] text-slate-400">{formatDate(tx?.date ?? '')}</p>
                    <p className="mt-1 text-[12px] text-slate-400">{visual.sourceLabel}</p>
                  </div>
                  <span className="mt-auto inline-flex items-center justify-end gap-2 text-[12px] text-slate-400">
                    ดูเพิ่มเติม
                    <FiChevronRight className="h-4 w-4 text-slate-300" />
                  </span>
                </div>
                  </>
                )
              })()}</button>
            ))}
          </div>
        )}
      </div>

      {/* Confirm Detail Dialog */}
      <Dialog open={!!confirmTx} onOpenChange={(open) => { if (!open) { setConfirmTx(null); setConfirmCategory(''); setConfirmMerchant(''); setConfirmNotes(''); setConfirmItems([]); setShowEmailHtml(false) } }}>
        <DialogContent className="rounded-3xl max-h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-5 pt-5 pb-3">
            <DialogTitle>ยืนยันรายรับ</DialogTitle>
          </DialogHeader>
          {confirmTx && (
            <div className="flex-1 overflow-y-auto px-5 pb-5">
              <div className="space-y-4">
                <div className="rounded-[14px] border border-slate-100 bg-white p-3.5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                  <div className="flex gap-4">
                    <TransactionLogo
                      tx={confirmTx}
                      className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-[14px] border border-emerald-100 bg-white p-2"
                    />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-base font-extrabold text-slate-700">{confirmTx.merchant || 'Unknown'}</p>
                          <p className="mt-1 text-sm text-slate-400">{confirmTx.category || 'รอยืนยัน'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-slate-400">{confirmTx.source === 'email' ? 'Gmail' : 'บันทึกเอง'}</p>
                          <span className="mt-1 block text-base font-extrabold text-emerald-600">+{formatAmount(confirmTx.amount)} THB</span>
                          <p className="text-sm text-slate-400">{formatDate(confirmTx.date)}</p>
                        </div>
                      </div>
                      <p className="mt-auto text-sm text-slate-500">{formatFullDate(confirmTx.date)}</p>
                    </div>
                  </div>
                  {confirmTx.email_subject && (
                    <div className="mt-3 flex items-center justify-between gap-1.5 rounded-xl bg-slate-50 p-3">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <FiFileText className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <p className="truncate text-[11px] text-slate-500">{confirmTx.email_subject}</p>
                      </div>
                      {confirmTx.email_html && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 text-[11px] px-2 whitespace-nowrap text-emerald-600 hover:bg-emerald-50"
                          onClick={() => setShowEmailHtml(!showEmailHtml)}
                        >
                          {showEmailHtml ? 'ซ่อนอีเมล' : 'ดูเนื้อหาอีเมล'}
                        </Button>
                      )}
                    </div>
                  )}
                  {showEmailHtml && confirmTx.email_html && (
                    <div className="mt-3 rounded-xl border border-slate-200 overflow-hidden bg-white">
                      <iframe 
                        srcDoc={confirmTx.email_html} 
                        className="w-full h-[300px] border-0"
                        sandbox="allow-same-origin"
                        title="Email Content"
                      />
                    </div>
                  )}
                </div>

                {/* Category */}
                <div>
                  <Label className="text-xs font-semibold text-gray-500">หมวดหมู่ *</Label>
                  {showAddCatConfirm ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 mt-1">
                      <p className="text-xs font-semibold text-slate-500 mb-2">เพิ่มหมวดใหม่</p>
                      <div className="flex gap-2">
                        <Input
                          value={newCatName}
                          onChange={(e) => setNewCatName(e.target.value)}
                          placeholder="ชื่อหมวดใหม่"
                          className="h-9 bg-white rounded-lg"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              if (!newCatName.trim() || !onAddCategory || addingCat) return
                              setAddingCat(true)
                              onAddCategory({ name: newCatName.trim(), type: 'income', is_default: false }).then((cat) => {
                                if (cat?.name) setConfirmCategory(cat.name)
                                setNewCatName('')
                                setShowAddCatConfirm(false)
                                setAddingCat(false)
                              }).catch(() => setAddingCat(false))
                            }
                          }}
                        />
                        <Button
                          type="button"
                          onClick={() => {
                            if (!newCatName.trim() || !onAddCategory || addingCat) return
                            setAddingCat(true)
                            onAddCategory({ name: newCatName.trim(), type: 'income', is_default: false }).then((cat) => {
                              if (cat?.name) setConfirmCategory(cat.name)
                              setNewCatName('')
                              setShowAddCatConfirm(false)
                              setAddingCat(false)
                            }).catch(() => setAddingCat(false))
                          }}
                          disabled={!newCatName.trim() || addingCat}
                          className="h-9 rounded-lg px-3 text-xs font-semibold"
                          style={{ background: 'hsl(160 85% 35%)' }}
                        >
                          {addingCat ? <FiLoader className="h-3.5 w-3.5 animate-spin" /> : 'เพิ่ม'}
                        </Button>
                      </div>
                      <div className="mt-2 flex justify-end">
                        <button type="button" onClick={() => { setShowAddCatConfirm(false); setNewCatName('') }} className="text-[11px] font-medium text-slate-400 hover:text-slate-600">ยกเลิก</button>
                      </div>
                    </div>
                  ) : (
                    <Select value={confirmCategory} onValueChange={(val) => {
                      if (val === '__add_new__') {
                        setShowAddCatConfirm(true)
                        return
                      }
                      setConfirmCategory(val)
                    }}>
                      <SelectTrigger className="rounded-xl mt-1"><SelectValue placeholder="เลือกหมวดหมู่" /></SelectTrigger>
                      <SelectContent>
                        {safeCats.filter((c) => c?.type === 'income').map((c) => (
                          <SelectItem key={c?._id ?? c?.name} value={c?.name ?? ''}>{c?.name ?? ''}</SelectItem>
                        ))}
                        {confirmTx.category && !safeCats.find((c) => c?.name === confirmTx.category) && (
                          <SelectItem value={confirmTx.category}>{confirmTx.category} (จากอีเมล)</SelectItem>
                        )}
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

                {/* Merchant */}
                <div>
                  <Label className="text-xs font-semibold text-gray-500">ร้านค้า / แหล่งที่มา</Label>
                  <Input
                    placeholder="e.g. Freelance, Company"
                    value={confirmMerchant}
                    onChange={(e) => setConfirmMerchant(e.target.value)}
                    className="rounded-xl mt-1"
                  />
                </div>

                {/* Notes */}
                <div>
                  <Label className="text-xs font-semibold text-gray-500">หมายเหตุ</Label>
                  <Textarea
                    placeholder="หมายเหตุเพิ่มเติม..."
                    value={confirmNotes}
                    onChange={(e) => setConfirmNotes(e.target.value)}
                    rows={2}
                    className="rounded-xl mt-1"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={() => { setConfirmTx(null); setConfirmCategory(''); setConfirmMerchant(''); setConfirmNotes(''); setConfirmItems([]) }} className="flex-1 rounded-xl">ยกเลิก</Button>
                  <Button
                    onClick={handleConfirmWithCategory}
                    disabled={!confirmCategory}
                    className="flex-1 rounded-xl gap-1.5"
                    style={{ background: 'hsl(160 85% 35%)' }}
                  >
                    <FiCheck className="h-4 w-4" /> ยืนยัน
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTx} onOpenChange={(open) => { if (!open) setEditTx(null) }}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>แก้ไขรายรับ</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>หมวดหมู่</Label>
              {showAddCatEdit ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 mt-1">
                  <p className="text-xs font-semibold text-slate-500 mb-2">เพิ่มหมวดใหม่</p>
                  <div className="flex gap-2">
                    <Input
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      placeholder="ชื่อหมวดใหม่"
                      className="h-9 bg-white rounded-lg"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          if (!newCatName.trim() || !onAddCategory || addingCat) return
                          setAddingCat(true)
                          onAddCategory({ name: newCatName.trim(), type: 'income', is_default: false }).then((cat) => {
                            if (cat?.name) setEditForm((p) => ({ ...p, category: cat.name }))
                            setNewCatName('')
                            setShowAddCatEdit(false)
                            setAddingCat(false)
                          }).catch(() => setAddingCat(false))
                        }
                      }}
                    />
                    <Button
                      type="button"
                      onClick={() => {
                        if (!newCatName.trim() || !onAddCategory || addingCat) return
                        setAddingCat(true)
                        onAddCategory({ name: newCatName.trim(), type: 'income', is_default: false }).then((cat) => {
                          if (cat?.name) setEditForm((p) => ({ ...p, category: cat.name }))
                          setNewCatName('')
                          setShowAddCatEdit(false)
                          setAddingCat(false)
                        }).catch(() => setAddingCat(false))
                      }}
                      disabled={!newCatName.trim() || addingCat}
                      className="h-9 rounded-lg px-3 text-xs font-semibold"
                      style={{ background: 'hsl(160 85% 35%)' }}
                    >
                      {addingCat ? <FiLoader className="h-3.5 w-3.5 animate-spin" /> : 'เพิ่ม'}
                    </Button>
                  </div>
                  <div className="mt-2 flex justify-end">
                    <button type="button" onClick={() => { setShowAddCatEdit(false); setNewCatName('') }} className="text-[11px] font-medium text-slate-400 hover:text-slate-600">ยกเลิก</button>
                  </div>
                </div>
              ) : (
                <Select value={editForm.category} onValueChange={(v) => {
                  if (v === '__add_new__') {
                    setShowAddCatEdit(true)
                    return
                  }
                  setEditForm((p) => ({ ...p, category: v }))
                }}>
                  <SelectTrigger><SelectValue placeholder="เลือกหมวดหมู่" /></SelectTrigger>
                  <SelectContent>
                    {safeCats.filter((c) => c?.type === 'income').map((c) => (
                      <SelectItem key={c?._id ?? c?.name} value={c?.name ?? ''}>{c?.name ?? ''}</SelectItem>
                    ))}
                    {editForm.category && !safeCats.find((c) => c?.name === editForm.category) && (
                      <SelectItem value={editForm.category}>{editForm.category}</SelectItem>
                    )}
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
            <div>
              <Label>จำนวนเงิน (THB)</Label>
              <Input type="number" value={editForm.amount} onChange={(e) => setEditForm((p) => ({ ...p, amount: e.target.value }))} />
            </div>
            <div>
              <Label>วันที่</Label>
              <Input type="date" value={editForm.date} onChange={(e) => setEditForm((p) => ({ ...p, date: e.target.value }))} />
            </div>
            <div>
              <Label>หมายเหตุ</Label>
              <Textarea value={editForm.notes} onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditTx(null)} className="rounded-xl">ยกเลิก</Button>
              <Button onClick={handleSaveEdit} className="rounded-xl" style={{ background: 'hsl(160 85% 35%)' }}>บันทึก</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null) }}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>ลบรายรับ</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">คุณแน่ใจหรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="rounded-xl">ยกเลิก</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="rounded-xl">ลบ</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* FAB */}
      <button
        onClick={onAddTransaction}
        className="fixed bottom-24 right-6 w-14 h-14 rounded-2xl shadow-xl flex items-center justify-center text-white z-40 transition-transform hover:scale-110 active:scale-95"
        style={{ background: 'linear-gradient(135deg, hsl(160 85% 38%), hsl(150 70% 32%))' }}
      >
        <FiPlus className="h-6 w-6" />
      </button>
    </div>
  )
}
