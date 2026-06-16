'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Trash2, Plus, Users, CalendarDays, Palmtree } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { setShift, removeShift, autoAssignShifts, clearShiftsForMonth, addVacation, deleteVacation, addDeveloper, updateDeveloper, deleteDeveloper } from '@/app/actions'
import type { Developer, ShiftWithDeveloper, VacationWithDeveloper, Team } from '@/lib/types'
import { TEAMS } from '@/lib/types'

const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]

type Tab = 'shifts' | 'vacations' | 'developers'

export default function AdminPanel({
  year: initialYear,
  month: initialMonth,
  initialDevelopers,
}: {
  year: number
  month: number
  initialDevelopers: Developer[]
}) {
  const [tab, setTab] = useState<Tab>('shifts')
  const [year, setYear] = useState(initialYear)
  const [month, setMonth] = useState(initialMonth)
  const [shifts, setShifts] = useState<ShiftWithDeveloper[]>([])
  const [vacations, setVacations] = useState<VacationWithDeveloper[]>([])
  const [developers, setDevelopers] = useState(initialDevelopers)
  const [editingDate, setEditingDate] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [autoAssignLoading, setAutoAssignLoading] = useState(false)
  const [editingDev, setEditingDev] = useState<string | null>(null)
  const [newDevName, setNewDevName] = useState('')
  const [newDevTeam, setNewDevTeam] = useState<Team>('java')
  const [teamFilter, setTeamFilter] = useState<string>('all')
  const [newVacation, setNewVacation] = useState({ developer_id: '', start_date: '', end_date: '' })
  const supabase = createClient()

  const showMsg = (text: string, ok: boolean) => {
    setMsg({ text, ok })
    setTimeout(() => setMsg(null), 3000)
  }

  // ── Fetch ──
  const fetchShifts = useCallback(async (y: number, m: number) => {
    const start = `${y}-${String(m).padStart(2, '0')}-01`
    const endDate = new Date(y, m, 0)
    const end = `${y}-${String(m).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`
    const { data } = await supabase
      .from('duty_shifts')
      .select('id, developer_id, date, developers(name)')
      .gte('date', start).lte('date', end)
      .order('date', { ascending: true })
    setShifts((data ?? []) as any)
  }, [supabase])

  const fetchVacations = useCallback(async (y: number, m: number) => {
    const start = `${y}-${String(m).padStart(2, '0')}-01`
    const endDate = new Date(y, m, 0)
    const end = `${y}-${String(m).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`
    const { data } = await supabase
      .from('vacations')
      .select('id, developer_id, start_date, end_date, developers(name)')
      .lte('start_date', end).gte('end_date', start)
      .order('start_date', { ascending: true })
    setVacations((data ?? []) as any)
  }, [supabase])

  useEffect(() => { fetchShifts(year, month) }, [year, month, fetchShifts])
  useEffect(() => { fetchVacations(year, month) }, [year, month, fetchVacations])

  useEffect(() => {
    const channel = supabase.channel('admin-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'duty_shifts' }, () => fetchShifts(year, month))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vacations' }, () => fetchVacations(year, month))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'developers' }, async () => {
        const { data } = await supabase.from('developers').select('*').order('sort_order').order('name')
        setDevelopers(data ?? [])
        fetchShifts(year, month)
        fetchVacations(year, month)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [year, month, supabase, fetchShifts, fetchVacations])

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  // ── Handlers ──
  const handleAutoAssign = async () => {
    setAutoAssignLoading(true)
    const res = await autoAssignShifts(year, month)
    if ('error' in res) showMsg(res.error || 'Ошибка', false)
    else { fetchShifts(year, month); showMsg(`Назначено ${res.count} дежурств`, true) }
    setAutoAssignLoading(false)
  }

  const handleClearMonth = async () => {
    if (!confirm('Очистить все дежурства за этот месяц?')) return
    await clearShiftsForMonth(year, month)
    fetchShifts(year, month)
    showMsg('Месяц очищен', true)
  }

  const handleSetShift = async (formData: FormData) => {
    const res = await setShift(formData)
    if (res.error) showMsg(res.error, false)
    else { setEditingDate(null); fetchShifts(year, month); showMsg('Сохранено', true) }
  }

  const handleRemoveShift = async (formData: FormData) => {
    const res = await removeShift(formData)
    if (res.error) showMsg(res.error, false)
    else { fetchShifts(year, month); showMsg('Удалено', true) }
  }

  const refreshDevs = useCallback(async () => {
    const { data } = await supabase.from('developers').select('*').order('sort_order').order('name')
    setDevelopers(data ?? [])
  }, [supabase])

  const handleAddDev = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDevName.trim()) return
    const fd = new FormData()
    fd.set('name', newDevName.trim())
    fd.set('team', newDevTeam)
    const res = await addDeveloper(fd)
    if (res.error) showMsg(res.error, false)
    else { setNewDevName(''); refreshDevs(); showMsg('Добавлен', true) }
  }

  const handleUpdateDev = async (e: React.FormEvent) => {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    const res = await updateDeveloper(fd)
    if (res.error) showMsg(res.error, false)
    else { setEditingDev(null); refreshDevs(); showMsg('Сохранено', true) }
  }

  const handleDeleteDev = async (id: string) => {
    if (!confirm('Удалить разработчика?')) return
    const fd = new FormData()
    fd.set('id', id)
    const res = await deleteDeveloper(fd)
    if (res.error) showMsg(res.error, false)
    else { refreshDevs(); showMsg('Удалён', true) }
  }

  const handleAddVacation = async (e: React.FormEvent) => {
    e.preventDefault()
    const fd = new FormData()
    fd.set('developer_id', newVacation.developer_id)
    fd.set('start_date', newVacation.start_date)
    fd.set('end_date', newVacation.end_date)
    const res = await addVacation(fd)
    if (res.error) showMsg(res.error, false)
    else {
      setNewVacation({ developer_id: '', start_date: '', end_date: '' })
      fetchVacations(year, month)
      showMsg('Отпуск добавлен', true)
    }
  }

  const handleDeleteVacation = async (formData: FormData) => {
    const res = await deleteVacation(formData)
    if (res.error) showMsg(res.error, false)
    else { fetchVacations(year, month); showMsg('Отпуск удалён', true) }
  }

  // ── Shift map ──
  const daysInMonth = new Date(year, month, 0).getDate()
  const shiftMap = new Map<string, ShiftWithDeveloper>()
  shifts.forEach(s => shiftMap.set(s.date, s))

  const filteredDevs = teamFilter === 'all' ? developers : developers.filter(d => d.team === teamFilter)

  // ── Tabs ──
  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'shifts', label: 'Дежурства', icon: CalendarDays },
    { key: 'vacations', label: 'Отпуска', icon: Palmtree },
    { key: 'developers', label: 'Разработчики', icon: Users },
  ]

  return (
    <div>
      <div className="mb-6 flex gap-1 rounded-lg bg-gray-100 p-1">
        {tabs.map(t => {
          const Icon = t.icon
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              <Icon className="h-4 w-4" /> {t.label}
            </button>
          )
        })}
      </div>

      {msg && (
        <div className={`mb-4 rounded-lg px-4 py-2 text-sm ${msg.ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {msg.text}
        </div>
      )}

      {tab === 'shifts' && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <button onClick={prevMonth} className="rounded-lg p-2 hover:bg-gray-200"><ChevronLeft className="h-5 w-5" /></button>
            <h2 className="text-lg font-semibold">{MONTHS[month - 1]} {year}</h2>
            <button onClick={nextMonth} className="rounded-lg p-2 hover:bg-gray-200"><ChevronRight className="h-5 w-5" /></button>
          </div>
          <div className="mb-4 flex gap-2">
            <button onClick={handleAutoAssign} disabled={autoAssignLoading}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
              {autoAssignLoading ? 'Назначение...' : 'Авто-назначение'}
            </button>
            <button onClick={handleClearMonth}
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
              Очистить месяц
            </button>
          </div>
          <div className="mb-3 flex flex-wrap gap-1.5">
            <button onClick={() => setTeamFilter('all')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${teamFilter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Все</button>
            {TEAMS.map(t => (
              <button key={t} onClick={() => setTeamFilter(t)}
                className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${teamFilter === t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{t}</button>
            ))}
          </div>
          <div className="space-y-1.5">
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const shift = shiftMap.get(dateStr)
              const isEditing = editingDate === dateStr
              const dateObj = new Date(year, month - 1, day)
              const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6

              return (
                <div key={dateStr} className={`flex items-center gap-3 rounded-lg border bg-white px-4 py-2 ${isWeekend ? 'opacity-40' : ''}`}>
                  <span className={`w-8 text-sm font-medium ${isWeekend ? 'text-gray-400' : 'text-gray-600'}`}>{day}</span>
                  {shift && !isEditing ? (
                    <>
                      <span className="flex-1 text-sm">{shift.developers.name}</span>
                      {!isWeekend && (
                        <>
                          <button onClick={() => setEditingDate(dateStr)} className="text-xs text-blue-600 hover:text-blue-800">Изменить</button>
                          <form action={handleRemoveShift}>
                            <input type="hidden" name="id" value={shift.id} />
                            <button type="submit" className="rounded p-1 text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                          </form>
                        </>
                      )}
                    </>
                  ) : !isWeekend ? (
                    <form action={handleSetShift} className="flex flex-1 items-center gap-2">
                      <input type="hidden" name="date" value={dateStr} />
                      <select name="developer_id" defaultValue={shift?.developer_id ?? ''}
                        className="flex-1 rounded border px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500" autoFocus>
                        <option value="" disabled>Выберите разработчика</option>
                        {filteredDevs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                      <button type="submit" className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700">{shift ? 'Обновить' : 'Назначить'}</button>
                      {isEditing && <button type="button" onClick={() => setEditingDate(null)} className="text-xs text-gray-500 hover:text-gray-700">Отмена</button>}
                    </form>
                  ) : (
                    <span className="flex-1 text-xs text-gray-400">Выходной</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {tab === 'vacations' && (
        <div>
          <div className="mb-6 rounded-lg border bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold">Добавить отпуск</h3>
            <div className="mb-3 flex flex-wrap gap-1.5">
              <button onClick={() => setTeamFilter('all')}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${teamFilter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Все</button>
              {TEAMS.map(t => (
                <button key={t} onClick={() => setTeamFilter(t)}
                  className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${teamFilter === t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{t}</button>
              ))}
            </div>
            <form onSubmit={handleAddVacation} className="flex flex-wrap items-end gap-3">
              <div className="min-w-[200px] flex-1">
                <label className="mb-1 block text-xs text-gray-500">Разработчик</label>
                <select value={newVacation.developer_id} onChange={e => setNewVacation(v => ({ ...v, developer_id: e.target.value }))} required
                  className="w-full rounded border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Выберите</option>
                  {filteredDevs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500">Начало</label>
                <input type="date" required value={newVacation.start_date}
                  onChange={e => setNewVacation(v => ({ ...v, start_date: e.target.value }))}
                  className="rounded border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500">Конец</label>
                <input type="date" required value={newVacation.end_date}
                  onChange={e => setNewVacation(v => ({ ...v, end_date: e.target.value }))}
                  className="rounded border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <button type="submit" className="flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                <Plus className="h-4 w-4" /> Добавить
              </button>
            </form>
          </div>
          <div className="flex items-center justify-between mb-3">
            <button onClick={prevMonth} className="rounded-lg p-2 hover:bg-gray-200"><ChevronLeft className="h-5 w-5" /></button>
            <h2 className="text-lg font-semibold">{MONTHS[month - 1]} {year}</h2>
            <button onClick={nextMonth} className="rounded-lg p-2 hover:bg-gray-200"><ChevronRight className="h-5 w-5" /></button>
          </div>
          {vacations.length === 0 ? (
            <p className="text-sm text-gray-500">Нет отпусков в этом месяце</p>
          ) : (
            <div className="space-y-2">
              {vacations.map(v => (
                <div key={v.id} className="flex items-center gap-3 rounded-lg border bg-white px-4 py-3">
                  <Palmtree className="h-4 w-4 text-amber-500" />
                  <span className="flex-1 text-sm font-medium">{v.developers.name}</span>
                  <span className="text-sm text-gray-600">
                    {new Date(v.start_date).toLocaleDateString('ru-RU')} — {new Date(v.end_date).toLocaleDateString('ru-RU')}
                  </span>
                  <form action={handleDeleteVacation}>
                    <input type="hidden" name="id" value={v.id} />
                    <button type="submit" className="rounded p-1 text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'developers' && (
        <div>
          <form onSubmit={handleAddDev} className="mb-6 flex gap-2">
            <input value={newDevName} onChange={e => setNewDevName(e.target.value)}
              placeholder="Имя разработчика"
              className="flex-1 rounded-lg border px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            <select value={newDevTeam} onChange={e => setNewDevTeam(e.target.value as Team)}
              className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500">
              {TEAMS.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
            </select>
            <button type="submit" className="flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              <Plus className="h-4 w-4" /> Добавить
            </button>
          </form>

          <div className="space-y-2">
            {developers.map((d, idx) => (
              <div key={d.id} className="rounded-lg border bg-white px-4 py-3">
                {editingDev === d.id ? (
                  <form onSubmit={handleUpdateDev} className="space-y-3">
                    <input type="hidden" name="id" value={d.id} />
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs text-gray-500">Имя</label>
                        <input name="name" defaultValue={d.name} required
                          className="w-full rounded border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-gray-500">Команда</label>
                        <select name="team" defaultValue={d.team}
                          className="w-full rounded border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                          {TEAMS.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-gray-500">Порядок</label>
                        <input name="sort_order" type="number" defaultValue={d.sort_order}
                          className="w-full rounded border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-gray-500">Telegram</label>
                        <input name="telegram" defaultValue={d.telegram ?? ''} placeholder="@username"
                          className="w-full rounded border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-gray-500">Mattermost</label>
                        <input name="mattermost" defaultValue={d.mattermost ?? ''} placeholder="@username"
                          className="w-full rounded border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-gray-500">Телефон</label>
                        <input name="phone" defaultValue={d.phone ?? ''} placeholder="+7..."
                          className="w-full rounded border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" className="rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700">Сохранить</button>
                      <button type="button" onClick={() => setEditingDev(null)} className="rounded border px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50">Отмена</button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-600">{d.sort_order}</span>
                    <span className="inline-flex items-center gap-2 flex-1 text-sm font-medium">
                      {d.name}
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-gray-500">{d.team}</span>
                    </span>
                    <div className="flex gap-3 text-xs text-gray-400">
                      {d.telegram && <span>Tg: {d.telegram}</span>}
                      {d.mattermost && <span>Mm: {d.mattermost}</span>}
                      {d.phone && <span>{d.phone}</span>}
                    </div>
                    <button onClick={() => setEditingDev(d.id)} className="text-xs text-blue-600 hover:text-blue-800">Ред.</button>
                    <button onClick={() => handleDeleteDev(d.id)} className="text-xs text-red-500 hover:text-red-700">Удал.</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
