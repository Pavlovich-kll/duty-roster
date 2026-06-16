'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'

export async function getShifts(year: number, month: number) {
  const supabase = await createClient()
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(year, month, 0)
  const end = `${year}-${String(month).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`

  const { data } = await supabase
    .from('duty_shifts')
    .select('id, user_id, date, profiles(name)')
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: true })

  return data ?? []
}

export async function getProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return data
}

export async function getProfiles() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, name')
    .order('name', { ascending: true })

  return data ?? []
}

async function setShiftInternal(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) return { error: 'Только администраторы могут изменять дежурства' }

  const userId = formData.get('user_id') as string
  const date = formData.get('date') as string

  if (!userId || !date) return { error: 'Заполните все поля' }

  const { error } = await supabase
    .from('duty_shifts')
    .upsert({ user_id: userId, date }, { onConflict: 'date' })

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  revalidatePath('/admin')
  return { success: true }
}

export async function setShift(prevState: { error?: string; success?: boolean } | null, formData: FormData) {
  return setShiftInternal(formData)
}

export async function setShiftAction(formData: FormData) {
  await setShiftInternal(formData)
}

async function removeShiftInternal(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) return { error: 'Только администраторы могут удалять дежурства' }

  const id = formData.get('id') as string
  if (!id) return { error: 'Missing id' }

  const { error } = await supabase.from('duty_shifts').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  revalidatePath('/admin')
  return { success: true }
}

export async function removeShift(prevState: { error?: string; success?: boolean } | null, formData: FormData) {
  return removeShiftInternal(formData)
}

export async function removeShiftAction(formData: FormData) {
  await removeShiftInternal(formData)
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/')
}
