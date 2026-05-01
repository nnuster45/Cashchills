'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { FiMail, FiTrendingUp, FiTrendingDown, FiLoader, FiChevronRight, FiClock, FiBell } from 'react-icons/fi'

interface BillItem {
  name: string
  amount: number
  quantity: number
  notes?: string
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
  items?: BillItem[]
}

interface Budget {
  _id?: string
  category: string
  monthly_limit: number
  month_year: string
}

interface DashboardProps {
  transactions: Transaction[]
  budgets: Budget[]
  onSyncEmail: () => void
  syncLoading: boolean
  syncStatus: string
  loading: boolean
  onGoToIncome: () => void
  onGoToExpense: () => void
  gmailStatus?: {
    connected: boolean
    configured: boolean
    email?: string | null
    last_sync_at?: string | null
  }
  onConnectGmail?: () => void
}

const CATEGORY_COLORS: Record<string, string> = {
  'Food & Dining': '#4CAF50',
  'Transportation': '#FF9800',
  'Shopping': '#E91E63',
  'Rent': '#9C27B0',
  'Utilities': '#00BCD4',
  'Salary': '#4CAF50',
  'Freelance': '#2196F3',
  'Entertainment': '#FF5722',
  'Health': '#8BC34A',
}

function getCategoryColor(category: string, idx: number): string {
  if (CATEGORY_COLORS[category]) return CATEGORY_COLORS[category]
  const fallback = ['#4CAF50', '#FF9800', '#E91E63', '#9C27B0', '#00BCD4', '#2196F3', '#FF5722']
  return fallback[idx % fallback.length]
}

export default function DashboardSection({
  transactions,
  onSyncEmail,
  syncLoading,
  syncStatus,
  loading,
  onGoToIncome,
  onGoToExpense,
  gmailStatus,
  onConnectGmail,
}: DashboardProps) {
  const safeTransactions = Array.isArray(transactions) ? transactions : []

  const totalIncome = safeTransactions
    .filter((t) => t?.type === 'income')
    .reduce((sum, t) => sum + (t?.amount ?? 0), 0)

  const totalExpense = safeTransactions
    .filter((t) => t?.type === 'expense')
    .reduce((sum, t) => sum + (t?.amount ?? 0), 0)

  const incomeCount = safeTransactions.filter((t) => t?.type === 'income').length
  const expenseCount = safeTransactions.filter((t) => t?.type === 'expense').length

  const pendingIncomeCount = safeTransactions.filter((t) => t?.type === 'income' && t?.needs_review && t?.source === 'email').length
  const pendingExpenseCount = safeTransactions.filter((t) => t?.type === 'expense' && t?.needs_review && t?.source === 'email').length

  // Category breakdowns for expense
  const expenseByCategory: Record<string, number> = {}
  safeTransactions.filter((t) => t?.type === 'expense').forEach((t) => {
    const cat = t?.category || 'Other'
    expenseByCategory[cat] = (expenseByCategory[cat] || 0) + (t?.amount ?? 0)
  })
  const expenseCategories = Object.entries(expenseByCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  // Category breakdowns for income
  const incomeByCategory: Record<string, number> = {}
  safeTransactions.filter((t) => t?.type === 'income').forEach((t) => {
    const cat = t?.category || 'Other'
    incomeByCategory[cat] = (incomeByCategory[cat] || 0) + (t?.amount ?? 0)
  })
  const incomeCategories = Object.entries(incomeByCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  function formatAmount(amount: number) {
    return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 0 }).format(amount)
  }

  const today = new Date()
  const currentHour = today.getHours()
  const isNightTime = currentHour < 6 || currentHour >= 18
  const thaiDate = today.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })
  const thaiTime = today.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <FiLoader className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading...</span>
      </div>
    )
  }

  function renderCategoryBar(categories: [string, number][], total: number) {
    if (categories.length === 0 || total === 0) {
      return <div className="h-[58px]" />
    }
    return (
      <div className="h-[58px]">
        <div className="flex h-4 w-full overflow-hidden rounded-md bg-gray-100">
          {categories.map(([cat, amt], idx) => {
            const pct = (amt / total) * 100
            return (
              <div
                key={cat}
                className="flex h-full items-center justify-center text-[9px] font-medium text-white"
                style={{
                  width: `${pct}%`,
                  backgroundColor: getCategoryColor(cat, idx),
                  borderRadius: idx === 0 ? '6px 0 0 6px' : idx === categories.length - 1 ? '0 6px 6px 0' : '0',
                }}
              >
                {pct >= 12 ? `${Math.round(pct)}%` : ''}
              </div>
            )
          })}
        </div>
        <div className="mt-2.5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
          {categories.map(([cat], idx) => {
            return (
              <div key={cat} className="flex max-w-[96px] items-center gap-1.5">
                <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: getCategoryColor(cat, idx) }} />
                <span className="truncate text-[8px] font-medium uppercase text-slate-500">
                  {cat}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  function renderWeatherPanel() {
    return (
      <div
        className={`relative h-full w-full overflow-hidden rounded-l-[16px] ${isNightTime ? 'bg-[linear-gradient(180deg,#18395f_0%,#254a73_55%,#335b88_100%)]' : 'bg-[linear-gradient(180deg,#eaf9fb_0%,#d7f2f6_55%,#c5edf1_100%)]'}`}
      >
        {isNightTime ? (
          <>
            <div className="absolute left-[18px] top-[16px] h-1 w-1 rounded-full bg-white/85" />
            <div className="absolute left-[28px] top-[22px] h-1.5 w-1.5 rounded-full bg-white/75" />
            <div className="absolute left-[38px] top-[14px] h-1 w-1 rounded-full bg-white/80" />
            <div className="absolute right-[9px] top-[6px] z-40 h-7 w-7 rounded-full bg-transparent shadow-[-5px_4px_0_0_#fbf1bf]" />
            <div className="absolute right-[44px] top-[18px] h-1 w-1 rounded-full bg-white/80" />
          </>
        ) : (
          <>
            <div className="absolute right-[16px] top-[12px] z-40 h-9 w-9 rounded-full bg-[#f3be2d]" />
          </>
        )}

        <div className={`absolute bottom-[18px] left-[30px] z-10 h-10 w-10 rounded-full ${isNightTime ? 'bg-[#9ec8d3]/70' : 'bg-[#bfe8ed]/80'}`} />
        <div className={`absolute bottom-[22px] left-[48px] z-10 h-12 w-12 rounded-full ${isNightTime ? 'bg-[#9ec8d3]/70' : 'bg-[#bfe8ed]/80'}`} />
        <div className={`absolute bottom-[18px] left-[72px] z-10 h-9 w-9 rounded-full ${isNightTime ? 'bg-[#9ec8d3]/70' : 'bg-[#bfe8ed]/80'}`} />
        <div className={`absolute bottom-[10px] left-[32px] z-10 h-8 w-[58px] rounded-full ${isNightTime ? 'bg-[#7fc5d2]/75' : 'bg-[#78c6d4]/78'}`} />

        <div className={`absolute bottom-[18px] left-[2px] z-20 h-10 w-10 rounded-full ${isNightTime ? 'bg-[#8bc9d4]' : 'bg-[#7dc8d6]'}`} />
        <div className={`absolute bottom-[22px] left-[18px] z-20 h-12 w-12 rounded-full ${isNightTime ? 'bg-[#8bc9d4]' : 'bg-[#7dc8d6]'}`} />
        <div className={`absolute bottom-[18px] left-[44px] z-20 h-9 w-9 rounded-full ${isNightTime ? 'bg-[#8bc9d4]' : 'bg-[#7dc8d6]'}`} />
        <div className={`absolute bottom-[9px] left-[5px] z-20 h-8 w-[60px] rounded-full ${isNightTime ? 'bg-[#76c0cf]' : 'bg-[#67baca]'}`} />

        <div className="absolute bottom-[20px] left-[2px] z-50 h-6 w-6 rounded-full bg-white/95" />
        <div className="absolute bottom-[18px] left-[15px] z-50 h-7 w-7 rounded-full bg-white/95" />
        <div className="absolute bottom-[20px] left-[34px] z-50 h-6 w-6 rounded-full bg-white/95" />
        <div className="absolute bottom-[15px] left-[3px] z-50 h-4 w-[43px] rounded-full bg-white/95" />
      </div>
    )
  }

  function renderOverviewCard({
    title,
    amount,
    itemCount,
    pendingCount,
    categories,
    total,
    onClick,
    showDetail = true,
    showBreakdown = true,
    isExpense = false,
  }: {
    title: string
    amount: number
    itemCount: number
    pendingCount: number
    categories: [string, number][]
    total: number
    onClick: () => void
    showDetail?: boolean
    showBreakdown?: boolean
    isExpense?: boolean
  }) {
    return (
      <button onClick={onClick} className="group w-full text-left">
        <div className={`flex flex-col rounded-[12px] border border-slate-100 bg-white px-5 py-4 shadow-[0_8px_20px_rgba(15,23,42,0.035)] transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-[0_12px_24px_rgba(15,23,42,0.055)] ${showBreakdown ? 'h-[296px]' : 'h-[210px]'}`}>
          <div className="mb-3 flex h-5 items-start gap-3 shrink-0">
            <div className="flex items-center gap-2 text-[13px] text-slate-500">
              {pendingCount > 0 ? (
                <>
                  {isExpense ? <FiBell className="h-4 w-4 text-slate-700" /> : <FiClock className="h-4 w-4 text-slate-700" />}
                  <span className="font-medium">{pendingCount} รายการที่ยังไม่ยืนยัน</span>
                </>
              ) : (
                <>
                  {isExpense ? <FiTrendingDown className="h-4 w-4 text-red-500" /> : <FiTrendingUp className="h-4 w-4 text-emerald-600" />}
                  <span className="font-medium">{itemCount} รายการ</span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-1 flex-col">
            <div className={`flex shrink-0 flex-col items-center justify-center text-center ${showBreakdown ? 'min-h-[120px]' : 'min-h-[108px]'}`}>
              <p className="bg-gradient-to-b from-emerald-200 to-emerald-500 bg-clip-text text-[24px] font-black text-transparent">
                {title}
              </p>
              <p className="mt-2.5 text-[42px] font-black leading-none tracking-tight text-slate-600">
                {formatAmount(amount)}
              </p>
              <p className="mt-3 text-[13px] font-medium tracking-[0.08em] text-slate-600">THB</p>
            </div>

            {showBreakdown ? (
              <div className="mt-2 shrink-0">
                {renderCategoryBar(categories, total)}
              </div>
            ) : (
              <div className="h-1 shrink-0" />
            )}

            {showDetail && (
              <div className="mt-auto border-t border-slate-200 pt-1.5 text-center shrink-0">
                <span className="inline-flex items-center gap-2 text-[13px] font-medium text-slate-500">
                  รายละเอียด
                  <FiChevronRight className="h-4 w-4 rotate-90 text-slate-300" />
                </span>
              </div>
            )}
          </div>
        </div>
      </button>
    )
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="overflow-hidden rounded-[12px] border border-slate-100 bg-white p-0 shadow-[0_8px_18px_rgba(15,23,42,0.03)]">
        <div className="grid h-[92px] grid-cols-[1fr_96px]">
          <div className="flex h-full flex-col justify-center gap-1.5 px-5 py-3">
            <h1 className="text-[24px] font-bold leading-none text-slate-800">
              Cash<span className="text-emerald-500">chill</span>
            </h1>
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold leading-tight text-slate-500">Last Update : {thaiDate} {thaiTime}</p>
              <Button
                onClick={onSyncEmail}
                disabled={syncLoading}
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 rounded-[10px] border border-emerald-100 text-emerald-700 hover:bg-emerald-50"
              >
                {syncLoading ? <FiLoader className="h-3.5 w-3.5 animate-spin" /> : <FiMail className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
          <div className="bg-[#f5fbfc] p-2">
            {renderWeatherPanel()}
          </div>
        </div>
      </div>

      {syncStatus && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-800">
          {syncStatus}
        </div>
      )}

      {renderOverviewCard({
        title: 'รายรับ',
        amount: totalIncome,
        itemCount: incomeCount,
        pendingCount: pendingIncomeCount,
        categories: incomeCategories,
        total: totalIncome,
        onClick: onGoToIncome,
      })}

      {renderOverviewCard({
        title: 'รายจ่าย',
        amount: totalExpense,
        itemCount: expenseCount,
        pendingCount: pendingExpenseCount,
        categories: expenseCategories,
        total: totalExpense,
        onClick: onGoToExpense,
        showBreakdown: false,
        showDetail: false,
        isExpense: true,
      })}

      {/* Email Pending Section — always visible at the bottom */}
      {(() => {
        const isGmailConnected = gmailStatus?.connected === true
        const pendingItems = safeTransactions.filter((t) => t?.needs_review && t?.source === 'email')

        // State 1: Has pending items → show original list design (prioritize showing data over connection prompt)
        if (pendingItems.length > 0) {
          return (
            <div className="rounded-[14px] border border-slate-100 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.045)]">
              <div className="mb-4 flex items-center gap-2">
                <FiClock className="h-4 w-4 text-amber-500" />
                <p className="text-base font-bold text-slate-800">รอยืนยันจาก Email</p>
              </div>
              <div className="space-y-3">
                {pendingItems.slice(0, 5).map((tx, idx) => {
                  const isIncome = tx?.type === 'income'
                  return (
                    <div
                      key={tx?._id ?? idx}
                      className="flex items-center gap-3 rounded-xl border border-slate-100 p-3"
                      onClick={isIncome ? onGoToIncome : onGoToExpense}
                      role="button"
                    >
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isIncome ? 'bg-emerald-100' : 'bg-red-100'}`}>
                        {isIncome ? <FiTrendingUp className="h-4 w-4 text-emerald-600" /> : <FiTrendingDown className="h-4 w-4 text-red-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">{tx?.merchant || tx?.category || '-'}</p>
                        <p className="text-xs text-slate-400">{tx?.category}</p>
                      </div>
                      <span className={`shrink-0 text-sm font-bold ${isIncome ? 'text-emerald-600' : 'text-red-500'}`}>
                        {isIncome ? '+' : '-'}{formatAmount(tx?.amount ?? 0)}
                      </span>
                    </div>
                  )
                })}
              </div>
              <div className="mt-4 flex gap-2">
                {pendingExpenseCount > 0 && (
                  <button
                    onClick={onGoToExpense}
                    className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-50 text-sm font-semibold text-red-500 transition-colors hover:bg-red-100"
                  >
                    รายจ่าย ({pendingExpenseCount}) <FiChevronRight className="h-3.5 w-3.5" />
                  </button>
                )}
                {pendingIncomeCount > 0 && (
                  <button
                    onClick={onGoToIncome}
                    className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold text-white transition-colors"
                    style={{ background: 'hsl(160 85% 35%)' }}
                  >
                    รายรับ ({pendingIncomeCount}) <FiChevronRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          )
        }

        // State 2: Gmail NOT connected → show connect prompt
        if (!isGmailConnected) {
          return (
            <div className="rounded-[14px] border border-slate-100 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.045)]">
              <div className="mb-4 flex items-center gap-2">
                <FiClock className="h-4 w-4 text-amber-500" />
                <p className="text-base font-bold text-slate-800">รอยืนยันจาก Gmail</p>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-100 p-4">
                <button
                  onClick={onConnectGmail}
                  className="rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg hover:scale-105 active:scale-95"
                  style={{ background: '#E24939' }}
                >
                  เข้าสู่ระบบ
                </button>
                <div className="flex justify-center shrink-0 pr-4">
                  <img src="/logos/gmail.png" alt="Gmail" className="h-[72px] w-auto object-contain" />
                </div>
              </div>
            </div>
          )
        }

        // State 3: Gmail connected but no pending items
        return (
          <div className="rounded-[14px] border border-slate-100 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.045)]">
            <div className="flex items-center gap-2">
              <FiClock className="h-4 w-4 text-amber-500" />
              <p className="text-base font-bold text-slate-800">รอยืนยันจาก Email</p>
            </div>
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
                <FiMail className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-600">ไม่มีรายการรอยืนยัน</p>
                <p className="text-xs text-slate-400">รายการใหม่จะปรากฏหลังจาก sync อีเมล</p>
              </div>
              <Button
                onClick={onSyncEmail}
                disabled={syncLoading}
                variant="ghost"
                size="sm"
                className="h-8 rounded-lg border border-emerald-100 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
              >
                {syncLoading ? <FiLoader className="h-3.5 w-3.5 animate-spin" /> : 'Sync'}
              </Button>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
