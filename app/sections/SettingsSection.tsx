'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FiPlus, FiTrash2, FiLoader, FiTag, FiMail, FiDollarSign, FiRefreshCw, FiExternalLink, FiMessageCircle, FiClock, FiX, FiCheck } from 'react-icons/fi'

interface Category {
  _id?: string
  name: string
  icon?: string
  type: string
  is_default?: boolean
}

interface EmailSyncConfigData {
  owner_user_id?: string
  enabled_providers: string[]
  custom_emails: string[]
  sync_interval_hours: number
  auto_sync_enabled: boolean
  last_auto_sync_at?: string | null
}

const ALL_PROVIDERS = [
  { name: 'KBank', label: 'KBank (กสิกรไทย)', color: '#138f2d' },
  { name: 'SCB', label: 'SCB (ไทยพาณิชย์)', color: '#4e2a84' },
  { name: 'Krungthai', label: 'Krungthai (กรุงไทย)', color: '#0066b3' },
  { name: 'Bangkok Bank', label: 'Bangkok Bank (กรุงเทพ)', color: '#1a3b6d' },
  { name: 'Shopee', label: 'Shopee', color: '#ee4d2d' },
  { name: 'Lineman', label: 'Lineman / LINE Man', color: '#06C755' },
  { name: 'Grab', label: 'Grab', color: '#00b14f' },
  { name: 'Lazada', label: 'Lazada', color: '#0f146d' },
  { name: 'Foodpanda', label: 'Foodpanda', color: '#d70f64' },
]

const SYNC_INTERVALS = [
  { value: 1, label: 'ทุก 1 ชั่วโมง' },
  { value: 2, label: 'ทุก 2 ชั่วโมง' },
  { value: 4, label: 'ทุก 4 ชั่วโมง' },
  { value: 6, label: 'ทุก 6 ชั่วโมง' },
  { value: 12, label: 'ทุก 12 ชั่วโมง' },
  { value: 24, label: 'ทุก 24 ชั่วโมง' },
]

interface SettingsProps {
  categories: Category[]
  onAddCategory: (cat: Omit<Category, '_id'>) => Promise<Category | null> | void
  onDeleteCategory: (id: string) => void
  gmailStatus: {
    connected: boolean
    configured: boolean
    email?: string | null
    last_sync_at?: string | null
  }
  syncLoading: boolean
  onConnectGmail: () => void
  onDisconnectGmail: () => Promise<void>
  onSyncGmail: () => Promise<void>
  lineLiffId?: string
  lineLiffUrl?: string
  loading: boolean
  emailSyncConfig?: EmailSyncConfigData | null
  onUpdateEmailSyncConfig?: (update: Partial<EmailSyncConfigData>) => Promise<void> | void
}

export default function SettingsSection({
  categories,
  onAddCategory,
  onDeleteCategory,
  gmailStatus,
  syncLoading,
  onConnectGmail,
  onDisconnectGmail,
  onSyncGmail,
  lineLiffId,
  lineLiffUrl,
  loading,
  emailSyncConfig,
  onUpdateEmailSyncConfig,
}: SettingsProps) {
  const safeCats = Array.isArray(categories) ? categories : []
  const [showAdd, setShowAdd] = useState(false)
  const [newCat, setNewCat] = useState({ name: '', type: 'expense' })
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [newCustomEmail, setNewCustomEmail] = useState('')

  const [localEnabledProviders, setLocalEnabledProviders] = useState<string[]>([])
  const [localSyncInterval, setLocalSyncInterval] = useState<number>(2)
  const [localAutoSyncEnabled, setLocalAutoSyncEnabled] = useState<boolean>(true)

  const customEmails = emailSyncConfig?.custom_emails ?? []

  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (emailSyncConfig && !initialized) {
      setLocalEnabledProviders(emailSyncConfig.enabled_providers ?? ALL_PROVIDERS.map(p => p.name))
      setLocalSyncInterval(emailSyncConfig.sync_interval_hours ?? 2)
      setLocalAutoSyncEnabled(emailSyncConfig.auto_sync_enabled ?? true)
      setInitialized(true)
    } else if (!emailSyncConfig && !initialized) {
      setLocalEnabledProviders(ALL_PROVIDERS.map(p => p.name))
    }
  }, [emailSyncConfig, initialized])

  function handleAdd() {
    if (!newCat.name.trim()) return
    onAddCategory({ name: newCat.name.trim(), type: newCat.type, is_default: false })
    setNewCat({ name: '', type: 'expense' })
    setShowAdd(false)
  }

  function toggleProvider(providerName: string) {
    const current = [...localEnabledProviders]
    const idx = current.indexOf(providerName)
    if (idx >= 0) {
      current.splice(idx, 1)
    } else {
      current.push(providerName)
    }
    setLocalEnabledProviders(current) // Optimistic update
    if (onUpdateEmailSyncConfig) {
      onUpdateEmailSyncConfig({ enabled_providers: current })
    }
  }

  function addCustomEmail() {
    if (!onUpdateEmailSyncConfig || !newCustomEmail.trim() || !newCustomEmail.includes('@')) return
    const email = newCustomEmail.trim().toLowerCase()
    if (customEmails.includes(email)) {
      setNewCustomEmail('')
      return
    }
    onUpdateEmailSyncConfig({ custom_emails: [...customEmails, email] })
    setNewCustomEmail('')
  }

  function removeCustomEmail(email: string) {
    if (!onUpdateEmailSyncConfig) return
    onUpdateEmailSyncConfig({ custom_emails: customEmails.filter(e => e !== email) })
  }

  function handleSyncIntervalChange(value: string) {
    const num = Number(value)
    setLocalSyncInterval(num) // Optimistic update
    if (onUpdateEmailSyncConfig) {
      onUpdateEmailSyncConfig({ sync_interval_hours: num })
    }
  }

  function handleAutoSyncToggle(checked: boolean) {
    setLocalAutoSyncEnabled(checked) // Optimistic update
    if (onUpdateEmailSyncConfig) {
      onUpdateEmailSyncConfig({ auto_sync_enabled: checked })
    }
  }

  const expenseCats = safeCats.filter((c) => c?.type === 'expense')
  const incomeCats = safeCats.filter((c) => c?.type === 'income')

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <FiLoader className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading settings...</span>
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-24">
      <h2 className="text-xl font-bold">Settings</h2>

      {/* Categories Card */}
      <Card className="border-none shadow-md" style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(16px)' }}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FiTag className="h-4 w-4" /> Categories
            </CardTitle>
            <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => setShowAdd(true)}>
              <FiPlus className="h-3 w-3" /> Add
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {safeCats.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <FiTag className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No categories yet</p>
              <p className="text-xs mt-1">Add categories to organize transactions</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[300px]">
              {expenseCats.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Expense</p>
                  <div className="space-y-1">
                    {expenseCats.map((c) => (
                      <div key={c?._id ?? c?.name} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/50">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                            <FiTag className="h-3 w-3 text-red-500" />
                          </div>
                          <span className="text-sm">{c?.name}</span>
                          {c?.is_default && <Badge variant="outline" className="text-[10px] px-1.5 py-0">Default</Badge>}
                        </div>
                        {!c?.is_default && (
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500" onClick={() => setDeleteConfirm(c?._id ?? null)}>
                            <FiTrash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {incomeCats.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Income</p>
                  <div className="space-y-1">
                    {incomeCats.map((c) => (
                      <div key={c?._id ?? c?.name} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/50">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                            <FiTag className="h-3 w-3 text-green-600" />
                          </div>
                          <span className="text-sm">{c?.name}</span>
                          {c?.is_default && <Badge variant="outline" className="text-[10px] px-1.5 py-0">Default</Badge>}
                        </div>
                        {!c?.is_default && (
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500" onClick={() => setDeleteConfirm(c?._id ?? null)}>
                            <FiTrash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Currency Card */}
      <Card className="border-none shadow-md" style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(16px)' }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FiDollarSign className="h-4 w-4" /> Currency
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Display currency: <span className="font-semibold text-foreground">THB (Thai Baht)</span></p>
        </CardContent>
      </Card>

      {/* Gmail Connection Card */}
      <Card className="border-none shadow-md" style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(16px)' }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FiMail className="h-4 w-4" /> Email Sync
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-white/70 px-3 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-700">Gmail</p>
              <p className="text-xs text-slate-400">
                {gmailStatus.connected ? (gmailStatus.email || 'Connected') : gmailStatus.configured ? 'พร้อมเชื่อมบัญชี Google' : 'ยังไม่ได้ตั้งค่า Google OAuth'}
              </p>
              {gmailStatus.last_sync_at && (
                <p className="mt-1 text-[11px] text-slate-400">Last sync: {new Date(gmailStatus.last_sync_at).toLocaleString('th-TH')}</p>
              )}
            </div>
            <Badge variant="outline" className="text-[10px]">
              {gmailStatus.connected ? 'Connected' : gmailStatus.configured ? 'Ready' : 'Config'}
            </Badge>
          </div>
          <div className="flex gap-2">
            {!gmailStatus.connected ? (
              <Button
                type="button"
                onClick={onConnectGmail}
                disabled={!gmailStatus.configured}
                className="h-10 flex-1 rounded-[12px] text-sm font-semibold"
                style={{ background: 'hsl(160 85% 35%)' }}
              >
                <FiMail className="mr-2 h-4 w-4" />
                เชื่อม Gmail
              </Button>
            ) : (
              <>
                <Button type="button" onClick={onSyncGmail} disabled={syncLoading} className="h-10 flex-1 rounded-[12px] text-sm font-semibold" style={{ background: 'hsl(160 85% 35%)' }}>
                  {syncLoading ? <FiLoader className="mr-2 h-4 w-4 animate-spin" /> : <FiRefreshCw className="mr-2 h-4 w-4" />}
                  Sync ตอนนี้
                </Button>
                <Button type="button" variant="outline" onClick={onDisconnectGmail} className="h-10 rounded-[12px] text-sm">
                  ยกเลิก
                </Button>
              </>
            )}
          </div>
          <p className="text-xs leading-relaxed text-slate-400">
            ใช้ Google OAuth แบบ web server พร้อมสิทธิ์ Gmail read-only เพื่อดึงอีเมลจริง แล้วสร้างรายการรอยืนยันจากอีเมลธนาคารและแพลตฟอร์ม
          </p>
        </CardContent>
      </Card>

      {/* Email Source Configuration Card */}
      <Card className="border-none shadow-md" style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(16px)' }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FiRefreshCw className="h-4 w-4" /> ตั้งค่าการดึงอีเมล
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Auto-sync toggle */}
          <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-white/70 px-3 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-700">Auto-sync</p>
              <p className="text-xs text-slate-400">ดึงอีเมลอัตโนมัติเมื่อเปิดแอป</p>
            </div>
            <Switch
              checked={localAutoSyncEnabled}
              onCheckedChange={handleAutoSyncToggle}
            />
          </div>

          {/* Sync interval */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
              <FiClock className="h-3.5 w-3.5" /> ความถี่ในการดึง
            </Label>
            <Select value={String(localSyncInterval)} onValueChange={handleSyncIntervalChange}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SYNC_INTERVALS.map((interval) => (
                  <SelectItem key={interval.value} value={String(interval.value)}>
                    {interval.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Provider toggles */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-500">แหล่งที่ต้องการดึง</Label>
            <div className="grid grid-cols-1 gap-1.5">
              {ALL_PROVIDERS.map((provider) => {
                const isEnabled = localEnabledProviders.includes(provider.name)
                return (
                  <button
                    key={provider.name}
                    type="button"
                    onClick={() => toggleProvider(provider.name)}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all ${isEnabled
                      ? 'border-emerald-200 bg-emerald-50/60'
                      : 'border-slate-100 bg-white/70 opacity-60'
                      }`}
                  >
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-white text-[10px] font-bold shrink-0"
                      style={{ backgroundColor: provider.color }}
                    >
                      {provider.name.slice(0, 2)}
                    </div>
                    <span className="flex-1 text-sm font-medium text-slate-700">{provider.label}</span>
                    <div className={`flex h-5 w-5 items-center justify-center rounded-full ${isEnabled ? 'bg-emerald-500 text-white' : 'border border-slate-300'}`}>
                      {isEnabled && <FiCheck className="h-3 w-3" />}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Custom emails */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-500">Custom Email (เพิ่มเอง)</Label>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="example@bank.com"
                value={newCustomEmail}
                onChange={(e) => setNewCustomEmail(e.target.value)}
                className="h-9 rounded-xl flex-1"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomEmail() } }}
              />
              <Button
                type="button"
                size="sm"
                onClick={addCustomEmail}
                disabled={!newCustomEmail.trim() || !newCustomEmail.includes('@')}
                className="h-9 rounded-xl px-3"
                style={{ background: 'hsl(160 85% 35%)' }}
              >
                <FiPlus className="h-3.5 w-3.5" />
              </Button>
            </div>
            {customEmails.length > 0 && (
              <div className="space-y-1">
                {customEmails.map((email) => (
                  <div key={email} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-white/70 px-3 py-1.5">
                    <FiMail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="flex-1 text-sm text-slate-600 truncate">{email}</span>
                    <button
                      type="button"
                      onClick={() => removeCustomEmail(email)}
                      className="p-0.5 rounded hover:bg-red-50 text-red-400 hover:text-red-600"
                    >
                      <FiX className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[11px] text-slate-400">
              ระบบจะดึงอีเมลจาก address เหล่านี้มาวิเคราะห์เป็นรายการรายรับ-รายจ่าย
            </p>
          </div>

          {/* Last auto-sync info */}
          {emailSyncConfig?.last_auto_sync_at && (
            <div className="rounded-xl border border-slate-100 bg-white/70 px-3 py-2">
              <p className="text-[11px] text-slate-400">
                Auto-sync ล่าสุด: {new Date(emailSyncConfig.last_auto_sync_at).toLocaleString('th-TH')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* LINE LIFF Card */}
      <Card className="border-none shadow-md" style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(16px)' }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FiMessageCircle className="h-4 w-4" /> LINE LIFF
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-white/70 px-3 py-3">
            <div>
              <p className="text-sm font-medium">Rich menu entry</p>
              <p className="text-[11px] text-muted-foreground">
                {lineLiffId ? `ใช้ LIFF ID ${lineLiffId}` : 'ยังไม่ได้ตั้งค่า NEXT_PUBLIC_LINE_LIFF_ID'}
              </p>
            </div>
            <Badge variant="outline" className="text-[10px]">{lineLiffId ? 'Enabled' : 'Config'}</Badge>
          </div>
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-3 py-3">
            <p className="text-xs font-semibold text-slate-500">สำหรับ rich menu</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              ตั้ง action type เป็น <span className="font-semibold text-slate-500">URI</span> แล้วชี้ไปที่ LIFF URL นี้
            </p>
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-[11px] text-slate-500">
              <span className="truncate">{lineLiffUrl || 'https://liff.line.me/<your-liff-id>'}</span>
              {lineLiffUrl && <FiExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
              แนะนำ scope: <span className="font-semibold text-slate-500">openid profile</span> และถ้าต้องการอีเมลให้เพิ่ม <span className="font-semibold text-slate-500">email</span>
            </p>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <div>
              <p className="text-sm font-medium">LINE login</p>
              <p className="text-[11px] text-muted-foreground">Auth screen รองรับ LIFF login แล้ว</p>
            </div>
            <Badge variant="outline" className="text-[10px]">LIFF</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Add Category Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={newCat.name} onChange={(e) => setNewCat((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Groceries" />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={newCat.type} onValueChange={(v) => setNewCat((p) => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button onClick={handleAdd} disabled={!newCat.name.trim()}>Add Category</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Category Confirm Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure? This cannot be undone.</p>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { if (deleteConfirm) { onDeleteCategory(deleteConfirm); setDeleteConfirm(null) } }}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
