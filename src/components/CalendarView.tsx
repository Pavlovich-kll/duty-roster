'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import type { ShiftWithProfile } from '@/lib/types'

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
  const [shifts, setShifts] = useState<ShiftWithProfile[]>([])
  const supabase = createClient()

  const fetchShifts = useCallback(async (y: number, m: number) => {
    const start = `${y}-${String(m).padStart(2, '0')}-01`
    const endDate = new Date(y, m, 0)
    const end = `${y}-${String(m).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`

    const { data } = await supabase
      .from('duty_shifts')
      .select('id, user_id, date, profiles(name)')
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: true })

    setShifts((data ?? []) as unknown as ShiftWithProfile[])
  }, [supabase])

  useEffect(() => {
    fetchShifts(year, month)
  }, [year, month, fetchShifts])

  useEffect(() => {
    const channel = supabase
      .channel('shifts-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'duty_shifts' }, () => {
        fetchShifts(year, month)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [year, month, supabase, fetchShifts])

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
  shifts.forEach(s => {
    shiftMap.set(s.date, s.profiles.name)
  })

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button onClick={prevMonth} className="rounded-lg p-2 hover:bg-gray-200">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="text-xl font-semibold">
          {MONTHS[month - 1]} {year}
        </h2>
        <button onClick={nextMonth} className="rounded-lg p-2 hover:bg-gray-200">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-px rounded-xl border bg-gray-200 overflow-hidden">
        {DAYS.map(d => (
          <div key={d} className="bg-gray-100 px-2 py-2 text-center text-xs font-semibold text-gray-600">
            {d}
          </div>
        ))}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="bg-white min-h-[80px]" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const assigned = shiftMap.get(dateStr)
          const isToday =
            today.getFullYear() === year &&
            today.getMonth() + 1 === month &&
            today.getDate() === day

          return (
            <div
              key={dateStr}
              className={`bg-white px-2 py-1.5 min-h-[80px] ${
                isToday ? 'ring-2 ring-blue-400 ring-inset' : ''
              }`}
            >
              <span className={`text-xs font-medium ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                {day}
              </span>
              {assigned && (
                <div className="mt-1 rounded bg-blue-100 px-1 py-0.5 text-xs text-blue-800 truncate">
                  {assigned}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {isAdmin && (
        <div className="mt-4 text-center">
          <a
            href="/admin"
            className="inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Управлять дежурствами
          </a>
        </div>
      )}
    </div>
  )
}
