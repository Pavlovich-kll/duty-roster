'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import type { ShiftWithDeveloper, VacationWithDeveloper } from '@/lib/types'

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month - 1, 1).getDay()
}

const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]

const DAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

export default function CalendarView({
  year: initialYear,
  month: initialMonth,
  isAdmin,
}: {
  year: number
  month: number
  isAdmin: boolean
}) {
  const [year, setYear] = useState(initialYear)
  const [month, setMonth] = useState(initialMonth)
  const [shifts, setShifts] = useState<ShiftWithDeveloper[]>([])
  const [vacations, setVacations] = useState<VacationWithDeveloper[]>([])
  const supabase = createClient()

  const fetchData = useCallback(async (y: number, m: number) => {
    const start = `${y}-${String(m).padStart(2, '0')}-01`
    const endDate = new Date(y, m, 0)
    const end = `${y}-${String(m).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`

    const [shiftsRes, vacsRes] = await Promise.all([
      supabase
        .from('duty_shifts')
        .select('id, developer_id, date, developers(name)')
        .gte('date', start).lte('date', end)
        .order('date', { ascending: true }),
      supabase
        .from('vacations')
        .select('id, developer_id, start_date, end_date, developers(name)')
        .lte('start_date', end).gte('end_date', start)
        .order('start_date', { ascending: true }),
    ])

    setShifts((shiftsRes.data ?? []) as any)
    setVacations((vacsRes.data ?? []) as any)
  }, [supabase])

  useEffect(() => { fetchData(year, month) }, [year, month, fetchData])

  useEffect(() => {
    const channel = supabase.channel('calendar-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'duty_shifts' }, () => fetchData(year, month))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vacations' }, () => fetchData(year, month))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [year, month, supabase, fetchData])

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const today = new Date()

  const shiftMap = new Map<string, string>()
  shifts.forEach(s => shiftMap.set(s.date, s.developers.name))

  const vacationByDate = new Map<string, string[]>()
  vacations.forEach(v => {
    const start = new Date(v.start_date)
    const end = new Date(v.end_date)
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const ds = d.toISOString().slice(0, 10)
      if (!vacationByDate.has(ds)) vacationByDate.set(ds, [])
      vacationByDate.get(ds)!.push(v.developers.name)
    }
  })

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button onClick={prevMonth} className="rounded-lg p-2 hover:bg-gray-200">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="text-xl font-semibold">{MONTHS[month - 1]} {year}</h2>
        <button onClick={nextMonth} className="rounded-lg p-2 hover:bg-gray-200">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-px rounded-xl border bg-gray-200 overflow-hidden">
        {DAYS.map(d => (
          <div key={d} className="bg-gray-100 px-2 py-2 text-center text-xs font-semibold text-gray-600">{d}</div>
        ))}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`e-${i}`} className="bg-white min-h-[90px]" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const assigned = shiftMap.get(dateStr)
          const onVacation = vacationByDate.get(dateStr)
          const dateObj = new Date(year, month - 1, day)
          const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6
          const isToday = today.getFullYear() === year && today.getMonth() + 1 === month && today.getDate() === day

          return (
            <div key={dateStr} className={`bg-white px-1.5 py-1 min-h-[90px] ${isToday ? 'ring-2 ring-blue-400 ring-inset' : ''} ${isWeekend ? 'bg-gray-50' : ''}`}>
              <span className={`text-xs font-medium ${isToday ? 'text-blue-600' : isWeekend ? 'text-gray-400' : 'text-gray-700'}`}>
                {day}
              </span>
              {assigned && (
                <div className="mt-0.5 rounded bg-blue-100 px-1 py-0.5 text-[11px] text-blue-800 leading-tight truncate">{assigned}</div>
              )}
              {onVacation?.map(name => (
                <div key={name} className="mt-0.5 rounded bg-amber-100 px-1 py-0.5 text-[11px] text-amber-800 leading-tight truncate">{name}</div>
              ))}
            </div>
          )
        })}
      </div>

      <div className="mt-3 flex gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-blue-100" /> дежурство</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-amber-100" /> отпуск</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-gray-50 border" /> выходной</span>
      </div>

      {isAdmin && (
        <div className="mt-4 text-center">
          <a href="/admin" className="inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Управление
          </a>
        </div>
      )}
    </div>
  )
}
