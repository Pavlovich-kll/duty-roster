import CalendarView from '@/components/CalendarView'
import DutyEditor from '@/components/DutyEditor'
import Navbar from '@/components/Navbar'

export default function DashboardPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <CalendarView isAdmin={false} />

        <hr className="my-10 border-gray-200" />

        <DutyEditor />
      </main>
    </>
  )
}
