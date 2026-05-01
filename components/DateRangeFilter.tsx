'use client'

import React, { useState } from 'react'
import { FiCalendar, FiChevronDown, FiX } from 'react-icons/fi'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'

export type DatePreset = 'today' | 'week' | 'month' | 'all' | 'custom'

export interface DateRange {
  from: Date | undefined
  to: Date | undefined
}

interface DateRangeFilterProps {
  dateRange: DateRange
  preset: DatePreset
  onPresetChange: (preset: DatePreset) => void
  onDateRangeChange: (range: DateRange) => void
  accentColor?: string
}

function getPresetRange(preset: DatePreset): DateRange {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (preset) {
    case 'today':
      return { from: today, to: today }
    case 'week': {
      const dayOfWeek = today.getDay()
      const monday = new Date(today)
      monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7))
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      return { from: monday, to: sunday }
    }
    case 'month': {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      return { from: firstDay, to: lastDay }
    }
    case 'all':
      return { from: undefined, to: undefined }
    default:
      return { from: undefined, to: undefined }
  }
}

const PRESETS: { key: DatePreset; label: string }[] = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'today', label: 'วันนี้' },
  { key: 'week', label: 'สัปดาห์นี้' },
  { key: 'month', label: 'เดือนนี้' },
]

export function filterByDateRange<T extends { date: string }>(
  items: T[],
  range: DateRange
): T[] {
  if (!range.from && !range.to) return items
  return items.filter((item) => {
    if (!item.date) return true
    const d = new Date(item.date)
    const itemDate = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    if (range.from && itemDate < range.from) return false
    if (range.to) {
      const toEnd = new Date(range.to)
      toEnd.setHours(23, 59, 59, 999)
      if (d > toEnd) return false
    }
    return true
  })
}

export function useDateRangeFilter() {
  const [preset, setPreset] = useState<DatePreset>('all')
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined })

  function handlePresetChange(p: DatePreset) {
    setPreset(p)
    if (p !== 'custom') {
      setDateRange(getPresetRange(p))
    }
  }

  function handleDateRangeChange(range: DateRange) {
    setDateRange(range)
    setPreset('custom')
  }

  return { preset, dateRange, handlePresetChange, handleDateRangeChange }
}

export default function DateRangeFilter({
  dateRange,
  preset,
  onPresetChange,
  onDateRangeChange,
  accentColor = 'hsl(160 85% 35%)',
}: DateRangeFilterProps) {
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [selectingField, setSelectingField] = useState<'from' | 'to'>('from')

  function formatShort(date: Date | undefined) {
    if (!date) return '---'
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
  }

  function handleDayClick(day: Date) {
    if (selectingField === 'from') {
      onDateRangeChange({ from: day, to: dateRange.to && day <= dateRange.to ? dateRange.to : undefined })
      setSelectingField('to')
    } else {
      if (dateRange.from && day < dateRange.from) {
        onDateRangeChange({ from: day, to: undefined })
        setSelectingField('to')
      } else {
        onDateRangeChange({ from: dateRange.from, to: day })
        setCalendarOpen(false)
        setSelectingField('from')
      }
    }
  }

  function handleClearCustom() {
    onPresetChange('all')
    setCalendarOpen(false)
    setSelectingField('from')
  }

  return (
    <div className="space-y-2">
      {/* Preset Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => onPresetChange(p.key)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              preset === p.key
                ? 'text-white shadow-sm'
                : 'bg-white/70 text-gray-500 hover:bg-white'
            }`}
            style={preset === p.key ? { background: accentColor } : undefined}
          >
            {p.label}
          </button>
        ))}

        {/* Custom Date Picker Trigger */}
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <button
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1 ${
                preset === 'custom'
                  ? 'text-white shadow-sm'
                  : 'bg-white/70 text-gray-500 hover:bg-white'
              }`}
              style={preset === 'custom' ? { background: accentColor } : undefined}
            >
              <FiCalendar className="h-3 w-3" />
              {preset === 'custom' && dateRange.from
                ? `${formatShort(dateRange.from)} - ${formatShort(dateRange.to)}`
                : 'กำหนดเอง'}
              <FiChevronDown className="h-3 w-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 rounded-2xl" align="end" sideOffset={8}>
            <div className="p-3 space-y-3">
              {/* From / To labels */}
              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={() => setSelectingField('from')}
                  className={`flex-1 text-center py-2 rounded-xl border transition-all ${
                    selectingField === 'from' ? 'border-emerald-400 bg-emerald-50 font-semibold text-emerald-700' : 'border-gray-200 text-gray-500'
                  }`}
                >
                  <span className="block text-[10px] text-gray-400 mb-0.5">เริ่มต้น</span>
                  {formatShort(dateRange.from)}
                </button>
                <span className="text-gray-300">-</span>
                <button
                  onClick={() => setSelectingField('to')}
                  className={`flex-1 text-center py-2 rounded-xl border transition-all ${
                    selectingField === 'to' ? 'border-emerald-400 bg-emerald-50 font-semibold text-emerald-700' : 'border-gray-200 text-gray-500'
                  }`}
                >
                  <span className="block text-[10px] text-gray-400 mb-0.5">สิ้นสุด</span>
                  {formatShort(dateRange.to)}
                </button>
              </div>

              <Calendar
                mode="single"
                selected={selectingField === 'from' ? dateRange.from : dateRange.to}
                onSelect={(day) => day && handleDayClick(day)}
                modifiers={{
                  range_start: dateRange.from ? [dateRange.from] : [],
                  range_end: dateRange.to ? [dateRange.to] : [],
                  range_middle:
                    dateRange.from && dateRange.to
                      ? [{ after: dateRange.from, before: dateRange.to }]
                      : [],
                }}
              />

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 rounded-xl text-xs gap-1 h-8"
                  onClick={handleClearCustom}
                >
                  <FiX className="h-3 w-3" /> ล้าง
                </Button>
                <Button
                  size="sm"
                  className="flex-1 rounded-xl text-xs h-8 text-white"
                  style={{ background: accentColor }}
                  onClick={() => setCalendarOpen(false)}
                  disabled={!dateRange.from}
                >
                  ตกลง
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active filter label */}
      {preset !== 'all' && (
        <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
          <FiCalendar className="h-3 w-3" />
          {preset === 'today' && 'แสดงเฉพาะวันนี้'}
          {preset === 'week' && 'แสดงเฉพาะสัปดาห์นี้'}
          {preset === 'month' && 'แสดงเฉพาะเดือนนี้'}
          {preset === 'custom' && dateRange.from && (
            <>กำหนดเอง: {formatShort(dateRange.from)} - {formatShort(dateRange.to)}</>
          )}
          <button onClick={() => onPresetChange('all')} className="ml-1 p-0.5 rounded hover:bg-gray-100">
            <FiX className="h-2.5 w-2.5" />
          </button>
        </div>
      )}
    </div>
  )
}
