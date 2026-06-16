import { createClient } from '@/lib/supabase-server'
import AdminPanel from '@/components/AdminPanel'
import Navbar from '@/components/Navbar'
import { redirect } from 'next/navigation'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) redirect('/dashboard')

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  return (
    <>
      <Navbar profile={profile} />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold">Управление</h1>
        <AdminPanel year={year} month={month} />
      </main>
    </>
  )
}
