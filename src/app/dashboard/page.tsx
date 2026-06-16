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

        <hr className="my-10 border-gray-200" />

        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-gray-900">Обязанности дежурного разработчика B2C</h2>
        </div>

        <div className="space-y-5">
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <span className="text-xl">📊</span> Мониторинг
            </h3>
            <ul className="space-y-1.5 pl-8">
              <li className="list-disc text-sm text-gray-700">Регулярно проверять дашборды в Grafana</li>
              <li className="list-disc text-sm text-gray-700">Отслеживать алерты и аномалии на графиках</li>
            </ul>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <span className="text-xl">💬</span> Чаты Mattermost
            </h3>
            <ul className="space-y-1.5 pl-8">
              <li className="list-disc text-sm text-gray-700">Следить за сообщениями в каналах:</li>
              <ul className="mt-1 space-y-1 pl-6">
                <li className="list-disc text-sm text-gray-500">B2C Prod Alerts</li>
                <li className="list-disc text-sm text-gray-500">B2C Other Alerts</li>
                <li className="list-disc text-sm text-gray-500">B2C Траблшутинг</li>
                <li className="list-disc text-sm text-gray-500">b2c java</li>
              </ul>
            </ul>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <span className="text-xl">🙋</span> Реакция на обращения
            </h3>
            <ul className="space-y-1.5 pl-8">
              <li className="list-disc text-sm text-gray-700">При упоминании команды разработки — оперативно реагировать и стараться помочь</li>
              <li className="list-disc text-sm text-gray-700">Если проблема выходит за рамки компетенции — перенаправить к ответственному за конкретный микросервис или баг</li>
              <li className="list-disc text-sm text-gray-700">Не оставлять обращения без ответа</li>
            </ul>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <span className="text-xl">🔄</span> Передача дежурства
            </h3>
            <ul className="space-y-1.5 pl-8">
              <li className="list-disc text-sm text-gray-700">В конце смены передать дежурство следующему дежурному</li>
              <li className="list-disc text-sm text-gray-700">Написать краткий итог дня: что происходило, какие алерты были, что решили, что осталось в работе</li>
            </ul>
          </section>
        </div>
      </main>
    </>
  )
}
