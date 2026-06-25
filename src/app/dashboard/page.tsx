import CalendarView from '@/components/CalendarView'
import DutyEditor from '@/components/DutyEditor'
import Navbar from '@/components/Navbar'

export default function DashboardPage() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <CalendarView year={year} month={month} isAdmin={false} />

        <hr className="my-10 border-gray-200" />

        <DutyEditor />
      </main>
    </>
  )
}
