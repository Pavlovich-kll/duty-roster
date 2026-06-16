import { createClient } from '@/lib/supabase-server'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let profile = null
  if (user) {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    profile = data
  }

  return (
    <>
      <Navbar profile={profile} />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">График дежурств разработчиков</h1>
          <p className="mt-2 text-gray-500">Обязанности дежурного разработчика B2C</p>
        </div>

        <div className="space-y-6">
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <span className="text-xl">📊</span> Мониторинг
            </h2>
            <ul className="space-y-2 pl-8">
              <li className="list-disc text-sm text-gray-700">Регулярно проверять дашборды в Grafana</li>
              <li className="list-disc text-sm text-gray-700">Отслеживать алерты и аномалии на графиках</li>
            </ul>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <span className="text-xl">💬</span> Чаты Mattermost
            </h2>
            <ul className="space-y-2 pl-8">
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
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <span className="text-xl">🙋</span> Реакция на обращения
            </h2>
            <ul className="space-y-2 pl-8">
              <li className="list-disc text-sm text-gray-700">При упоминании команды разработки — оперативно реагировать и стараться помочь</li>
              <li className="list-disc text-sm text-gray-700">Если проблема выходит за рамки компетенции — перенаправить к ответственному за конкретный микросервис или баг</li>
              <li className="list-disc text-sm text-gray-700">Не оставлять обращения без ответа</li>
            </ul>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <span className="text-xl">🔄</span> Передача дежурства
            </h2>
            <ul className="space-y-2 pl-8">
              <li className="list-disc text-sm text-gray-700">В конце смены передать дежурство следующему дежурному</li>
              <li className="list-disc text-sm text-gray-700">Написать краткий итог дня: что происходило, какие алерты были, что решили, что осталось в работе</li>
            </ul>
          </section>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/dashboard"
            className="inline-block rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Перейти к календарю дежурств
          </Link>
        </div>
      </main>
    </>
  )
}
