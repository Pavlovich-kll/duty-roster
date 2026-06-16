'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { setShift, removeShiftAction } from '@/app/actions'
import type { Profile, ShiftWithProfile } from '@/lib/types'

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]

export default function AdminPanel({
  year: initialYear,
  month: initialMonth,
  profiles,
}: {
  year: number
  month: number
  profiles: Pick<Profile, 'id' | 'name'>[]
}) {
  const [year, setYear] = useState(initialYear)
  const [month, setMonth] = useState(initialMonth)
  const [shifts, setShifts] = useState<ShiftWithProfile[]>([])
  const [editingDate, setEditingDate] = useState<string | null>(null)
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

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }

  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  const daysInMonth = getDaysInMonth(year, month)

  const shiftMap = new Map<string, ShiftWithProfile>()
  shifts.forEach(s => shiftMap.set(s.date, s))

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

      <div className="space-y-2">
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const shift = shiftMap.get(dateStr)
          const isEditing = editingDate === dateStr

          return (
            <div
              key={dateStr}
              className="flex items-center gap-3 rounded-lg border bg-white px-4 py-2"
            >
              <span className="w-8 text-sm font-medium text-gray-600">{day}</span>

              {shift && !isEditing ? (
                <>
                  <span className="flex-1 text-sm">{shift.profiles.name}</span>
                  <button
                    onClick={() => setEditingDate(dateStr)}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Изменить
                  </button>
                  <form action={removeShiftAction}>
                    <input type="hidden" name="id" value={shift.id} />
                    <button
                      type="submit"
                      className="rounded p-1 text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <form
                    action={async (formData: FormData) => {
                      await setShift(null, formData)
                      setEditingDate(null)
                      fetchShifts(year, month)
                    }}
                    className="flex flex-1 items-center gap-2"
                  >
                    <input type="hidden" name="date" value={dateStr} />
                    <select
                      name="user_id"
                      defaultValue={shift?.user_id ?? ''}
                      className="flex-1 rounded border px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    >
                      <option value="" disabled>
                        Выберите разработчика
                      </option>
                      {profiles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
                    >
                      {shift ? 'Обновить' : 'Назначить'}
                    </button>
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => setEditingDate(null)}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        Отмена
                      </button>
                    )}
                  </form>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
