'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'

async function assertAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: profile } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) throw new Error('Только администраторы могут выполнять это действие')
  return user
}

// ── Developers ────────────────────────────────────────

export async function getDevelopers() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('developers')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
  return data ?? []
}

export async function addDeveloper(formData: FormData) {
  const supabase = await createClient()
  await assertAdmin(supabase)

  const name = formData.get('name') as string
  if (!name) return { error: 'Введите имя' }

  const { error } = await supabase.from('developers').insert({ name })
  if (error) return { error: error.message }

  revalidatePath('/admin')
  return { success: true }
}

export async function updateDeveloper(formData: FormData) {
  const supabase = await createClient()
  await assertAdmin(supabase)

  const id = formData.get('id') as string
  const name = formData.get('name') as string
  const sortOrder = parseInt(formData.get('sort_order') as string) || 0
  const telegram = formData.get('telegram') as string
  const mattermost = formData.get('mattermost') as string
  const phone = formData.get('phone') as string

  const { error } = await supabase
    .from('developers')
    .update({ name, sort_order: sortOrder, telegram, mattermost, phone })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { success: true }
}

export async function deleteDeveloper(formData: FormData) {
  const supabase = await createClient()
  await assertAdmin(supabase)

  const id = formData.get('id') as string
  if (!id) return { error: 'Missing id' }

  const { error } = await supabase.from('developers').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { success: true }
}

// ── Shifts ────────────────────────────────────────────

export async function getShifts(year: number, month: number) {
  const supabase = await createClient()
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(year, month, 0)
  const end = `${year}-${String(month).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`

  const { data } = await supabase
    .from('duty_shifts')
    .select('id, developer_id, date, developers(name)')
    .gte('date', start).lte('date', end)
    .order('date', { ascending: true })

  return data ?? []
}

export async function setShift(formData: FormData) {
  const supabase = await createClient()
  await assertAdmin(supabase)

  const developerId = formData.get('developer_id') as string
  const date = formData.get('date') as string
  if (!developerId || !date) return { error: 'Заполните все поля' }

  const { error } = await supabase
    .from('duty_shifts')
    .upsert({ developer_id: developerId, date }, { onConflict: 'date' })

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  revalidatePath('/admin')
  return { success: true }
}

export async function removeShift(formData: FormData) {
  const supabase = await createClient()
  await assertAdmin(supabase)

  const id = formData.get('id') as string
  if (!id) return { error: 'Missing id' }

  const { error } = await supabase.from('duty_shifts').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  revalidatePath('/admin')
  return { success: true }
}

export async function clearShiftsForMonth(year: number, month: number) {
  const supabase = await createClient()
  await assertAdmin(supabase)

  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(year, month, 0)
  const end = `${year}-${String(month).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`

  const { error } = await supabase
    .from('duty_shifts')
    .delete()
    .gte('date', start).lte('date', end)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
  revalidatePath('/admin')
}

export async function autoAssignShifts(year: number, month: number) {
  const supabase = await createClient()
  await assertAdmin(supabase)

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDateObj = new Date(year, month, 0)
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(endDateObj.getDate()).padStart(2, '0')}`

  const { data: developers } = await supabase
    .from('developers')
    .select('id, name')
    .order('sort_order', { ascending: true })

  if (!developers || developers.length === 0) return { error: 'Нет разработчиков' }

  const { data: vacations } = await supabase
    .from('vacations')
    .select('*')
    .lte('start_date', endDate)
    .gte('end_date', startDate)

  const vacationMap = new Map<string, Set<string>>()
  for (const v of vacations ?? []) {
    const start = new Date(v.start_date)
    const end = new Date(v.end_date)
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const ds = d.toISOString().slice(0, 10)
      if (!vacationMap.has(v.developer_id)) vacationMap.set(v.developer_id, new Set())
      vacationMap.get(v.developer_id)!.add(ds)
    }
  }

  const { data: existingShifts } = await supabase
    .from('duty_shifts')
    .select('date')
    .gte('date', startDate).lte('date', endDate)

  const existingDates = new Set(existingShifts?.map(s => s.date) ?? [])

  const { data: lastShift } = await supabase
    .from('duty_shifts')
    .select('developer_id')
    .lt('date', startDate)
    .order('date', { ascending: false })
    .limit(1)

  let startIndex = 0
  if (lastShift && lastShift.length > 0) {
    const lastIdx = developers.findIndex(d => d.id === lastShift[0].developer_id)
    if (lastIdx >= 0) startIndex = (lastIdx + 1) % developers.length
  }

  const workingDays: string[] = []
  for (let day = 1; day <= endDateObj.getDate(); day++) {
    const date = new Date(year, month - 1, day)
    if (date.getDay() !== 0 && date.getDay() !== 6) {
      workingDays.push(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`)
    }
  }

  const assignments: { developer_id: string; date: string }[] = []
  let currentIndex = startIndex

  for (const dateStr of workingDays) {
    if (existingDates.has(dateStr)) continue
    for (let i = 0; i < developers.length; i++) {
      const idx = (currentIndex + i) % developers.length
      const d = developers[idx]
      if (!vacationMap.has(d.id) || !vacationMap.get(d.id)!.has(dateStr)) {
        assignments.push({ developer_id: d.id, date: dateStr })
        currentIndex = (idx + 1) % developers.length
        break
      }
    }
  }

  if (assignments.length > 0) {
    const { error } = await supabase
      .from('duty_shifts')
      .upsert(assignments, { onConflict: 'date', ignoreDuplicates: false })
    if (error) return { error: error.message }
  }

  revalidatePath('/dashboard')
  revalidatePath('/admin')
  return { count: assignments.length }
}

// ── Vacations ─────────────────────────────────────────

export async function getVacations(year: number, month: number) {
  const supabase = await createClient()
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(year, month, 0)
  const end = `${year}-${String(month).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`

  const { data } = await supabase
    .from('vacations')
    .select('id, developer_id, start_date, end_date, developers(name)')
    .lte('start_date', end).gte('end_date', start)
    .order('start_date', { ascending: true })

  return data ?? []
}

export async function addVacation(formData: FormData) {
  const supabase = await createClient()
  await assertAdmin(supabase)

  const developerId = formData.get('developer_id') as string
  const startDate = formData.get('start_date') as string
  const endDate = formData.get('end_date') as string

  if (!developerId || !startDate || !endDate) return { error: 'Заполните все поля' }
  if (endDate < startDate) return { error: 'Дата конца раньше даты начала' }

  const { error } = await supabase
    .from('vacations')
    .insert({ developer_id: developerId, start_date: startDate, end_date: endDate })

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  revalidatePath('/admin')
  return { success: true }
}

export async function deleteVacation(formData: FormData) {
  const supabase = await createClient()
  await assertAdmin(supabase)

  const id = formData.get('id') as string
  if (!id) return { error: 'Missing id' }

  const { error } = await supabase.from('vacations').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  revalidatePath('/admin')
  return { success: true }
}
