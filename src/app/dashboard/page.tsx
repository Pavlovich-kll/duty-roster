import { createClient } from '@/lib/supabase-server'
import CalendarView from '@/components/CalendarView'
import Navbar from '@/components/Navbar'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single()

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  return (
    <>
      <Navbar profile={profile} />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <CalendarView year={year} month={month} isAdmin={profile?.is_admin ?? false} />
      </main>
    </>
  )
}
