'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { FiBarChart2, FiAlertTriangle, FiTrendingUp, FiLoader, FiZap, FiTarget } from 'react-icons/fi'

interface InsightData {
  summary?: {
    total_income?: number
    total_expense?: number
    net_savings?: number
    savings_rate?: string
    period?: string
  }
  category_breakdown?: Array<{
    category?: string
    amount?: number
    percentage?: string
    transaction_count?: number
  }>
  budget_alerts?: Array<{
    category?: string
    spent?: number
    budget?: number
    percentage_used?: string
    status?: string
  }>
  trends?: Array<{
    observation?: string
    detail?: string
  }>
  tips?: Array<{
    title?: string
    description?: string
  }>
  overall_assessment?: string
}

interface Transaction {
  _id?: string
  type: string
  amount: number
  category: string
  date: string
}

interface ReportsProps {
  transactions: Transaction[]
  insights: InsightData | null
  onGenerateInsights: () => void
  insightsLoading: boolean
  insightsError: string
}

const PIE_COLORS = [
  'hsl(160 85% 35%)', 'hsl(45 95% 50%)', 'hsl(200 80% 50%)',
  'hsl(280 70% 55%)', 'hsl(340 75% 55%)', 'hsl(20 90% 55%)',
  'hsl(100 60% 45%)', 'hsl(230 70% 55%)',
]

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### ')) return <h4 key={i} className="font-semibold text-sm mt-3 mb-1">{line.slice(4)}</h4>
        if (line.startsWith('## ')) return <h3 key={i} className="font-semibold text-base mt-3 mb-1">{line.slice(3)}</h3>
        if (line.startsWith('# ')) return <h2 key={i} className="font-bold text-lg mt-4 mb-2">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 list-disc text-sm">{line.slice(2)}</li>
        if (/^\d+\.\s/.test(line)) return <li key={i} className="ml-4 list-decimal text-sm">{line.replace(/^\d+\.\s/, '')}</li>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i} className="text-sm">{line}</p>
      })}
    </div>
  )
}

export default function ReportsSection({ transactions, insights, onGenerateInsights, insightsLoading, insightsError }: ReportsProps) {
  const safeTx = Array.isArray(transactions) ? transactions : []

  const expenses = safeTx.filter((t) => t?.type === 'expense')
  const catMap: Record<string, number> = {}
  expenses.forEach((t) => {
    const cat = t?.category ?? 'Other'
    catMap[cat] = (catMap[cat] ?? 0) + (t?.amount ?? 0)
  })
  const catEntries = Object.entries(catMap).sort((a, b) => b[1] - a[1])
  const totalExpense = catEntries.reduce((sum, [, v]) => sum + v, 0)

  function formatAmount(amount: number) {
    return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 0 }).format(amount)
  }

  const breakdowns = Array.isArray(insights?.category_breakdown) ? insights.category_breakdown : []
  const alerts = Array.isArray(insights?.budget_alerts) ? insights.budget_alerts : []
  const trends = Array.isArray(insights?.trends) ? insights.trends : []
  const tips = Array.isArray(insights?.tips) ? insights.tips : []

  return (
    <div className="space-y-5 pb-24">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Reports</h2>
        <Button onClick={onGenerateInsights} disabled={insightsLoading} className="gap-2" style={{ background: 'hsl(160 85% 35%)' }}>
          {insightsLoading ? <FiLoader className="h-4 w-4 animate-spin" /> : <FiZap className="h-4 w-4" />}
          {insightsLoading ? 'Analyzing...' : 'Generate Insights'}
        </Button>
      </div>

      {insightsError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{insightsError}</div>
      )}

      {catEntries.length > 0 && (
        <Card className="border-none shadow-md" style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(16px)' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FiBarChart2 className="h-4 w-4" /> Spending by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <svg viewBox="0 0 100 100" className="w-28 h-28 shrink-0">
                {(() => {
                  let cumAngle = 0
                  return catEntries.map(([cat, amt], idx) => {
                    const pct = totalExpense > 0 ? amt / totalExpense : 0
                    const angle = pct * 360
                    const startAngle = cumAngle
                    cumAngle += angle
                    const x1 = 50 + 40 * Math.cos((Math.PI / 180) * (startAngle - 90))
                    const y1 = 50 + 40 * Math.sin((Math.PI / 180) * (startAngle - 90))
                    const x2 = 50 + 40 * Math.cos((Math.PI / 180) * (startAngle + angle - 90))
                    const y2 = 50 + 40 * Math.sin((Math.PI / 180) * (startAngle + angle - 90))
                    const largeArc = angle > 180 ? 1 : 0
                    if (pct <= 0) return null
                    return (
                      <path
                        key={cat}
                        d={`M50,50 L${x1},${y1} A40,40 0 ${largeArc},1 ${x2},${y2} Z`}
                        fill={PIE_COLORS[idx % PIE_COLORS.length]}
                        stroke="white"
                        strokeWidth="1"
                      />
                    )
                  })
                })()}
              </svg>
              <div className="space-y-1.5 flex-1">
                {catEntries.slice(0, 6).map(([cat, amt], idx) => (
                  <div key={cat} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }} />
                    <span className="truncate flex-1">{cat}</span>
                    <span className="font-medium">{formatAmount(amt)}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {insightsLoading && (
        <Card className="border-none shadow-md" style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(16px)' }}>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      )}

      {insights && !insightsLoading && (
        <ScrollArea className="max-h-[calc(100vh-350px)]">
          <div className="space-y-4">
            {insights?.summary && (
              <Card className="border-none shadow-md" style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(16px)' }}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Financial Summary</CardTitle>
                  {insights.summary.period && <p className="text-xs text-muted-foreground">{insights.summary.period}</p>}
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-green-50 p-3">
                      <p className="text-[11px] text-muted-foreground">Income</p>
                      <p className="text-lg font-bold text-green-600">{formatAmount(insights.summary.total_income ?? 0)}</p>
                    </div>
                    <div className="rounded-lg bg-red-50 p-3">
                      <p className="text-[11px] text-muted-foreground">Expenses</p>
                      <p className="text-lg font-bold text-red-500">{formatAmount(insights.summary.total_expense ?? 0)}</p>
                    </div>
                    <div className="rounded-lg bg-blue-50 p-3">
                      <p className="text-[11px] text-muted-foreground">Net Savings</p>
                      <p className="text-lg font-bold text-blue-600">{formatAmount(insights.summary.net_savings ?? 0)}</p>
                    </div>
                    <div className="rounded-lg p-3" style={{ background: 'hsl(160 35% 94%)' }}>
                      <p className="text-[11px] text-muted-foreground">Savings Rate</p>
                      <p className="text-lg font-bold" style={{ color: 'hsl(160 85% 35%)' }}>{insights.summary.savings_rate ?? 'N/A'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {breakdowns.length > 0 && (
              <Card className="border-none shadow-md" style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(16px)' }}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Category Breakdown (AI)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {breakdowns.map((b, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5 border-b last:border-b-0">
                      <div>
                        <p className="text-sm font-medium">{b?.category ?? 'Unknown'}</p>
                        <p className="text-[11px] text-muted-foreground">{b?.transaction_count ?? 0} transactions - {b?.percentage ?? '0%'}</p>
                      </div>
                      <span className="text-sm font-semibold">{formatAmount(b?.amount ?? 0)}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {alerts.length > 0 && (
              <Card className="border-none shadow-md" style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(16px)' }}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <FiAlertTriangle className="h-4 w-4 text-amber-500" /> Budget Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {alerts.map((a, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5 border-b last:border-b-0">
                      <div>
                        <p className="text-sm font-medium">{a?.category ?? 'Unknown'}</p>
                        <p className="text-[11px] text-muted-foreground">{formatAmount(a?.spent ?? 0)} / {formatAmount(a?.budget ?? 0)} THB ({a?.percentage_used ?? '0%'})</p>
                      </div>
                      <Badge variant={a?.status === 'over' || a?.status === 'exceeded' ? 'destructive' : 'outline'} className="text-[10px]">
                        {a?.status ?? 'unknown'}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {trends.length > 0 && (
              <Card className="border-none shadow-md" style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(16px)' }}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <FiTrendingUp className="h-4 w-4" /> Trends
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {trends.map((t, i) => (
                    <div key={i}>
                      <p className="text-sm font-medium">{t?.observation ?? ''}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t?.detail ?? ''}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {tips.length > 0 && (
              <Card className="border-none shadow-md" style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(16px)' }}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <FiTarget className="h-4 w-4" /> Savings Tips
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {tips.map((t, i) => (
                    <div key={i} className="rounded-lg p-3" style={{ background: 'hsl(160 35% 96%)' }}>
                      <p className="text-sm font-semibold">{t?.title ?? ''}</p>
                      <p className="text-xs text-muted-foreground mt-1">{t?.description ?? ''}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {insights?.overall_assessment && (
              <Card className="border-none shadow-md" style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(16px)' }}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Overall Assessment</CardTitle>
                </CardHeader>
                <CardContent>
                  {renderMarkdown(insights.overall_assessment)}
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      )}

      {!insights && !insightsLoading && safeTx.length === 0 && (
        <Card className="border-none shadow-md" style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(16px)' }}>
          <CardContent className="py-12 text-center">
            <FiBarChart2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-sm text-muted-foreground">No data to analyze</p>
            <p className="text-xs text-muted-foreground mt-1">Add transactions to generate reports</p>
          </CardContent>
        </Card>
      )}

      {!insights && !insightsLoading && safeTx.length > 0 && (
        <Card className="border-none shadow-md" style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(16px)' }}>
          <CardContent className="py-8 text-center">
            <FiZap className="h-8 w-8 mx-auto mb-3" style={{ color: 'hsl(160 85% 35%)' }} />
            <p className="text-sm font-medium">Ready to analyze your finances</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">Click "Generate Insights" to get AI-powered analysis</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
