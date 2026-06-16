'use client'

import { createClient } from '@/lib/supabase-client'
import type { Profile } from '@/lib/types'

export default function Navbar({ profile }: { profile: Profile | null }) {
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <header className="border-b bg-white shadow-sm">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <a href="/dashboard" className="text-lg font-semibold">
          График дежурств
        </a>
        <div className="flex items-center gap-4">
          {profile && (
            <span className="text-sm text-gray-600">{profile.name}</span>
          )}
          {profile?.is_admin && (
            <a
              href="/admin"
              className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm hover:bg-gray-200"
            >
              Управление
            </a>
          )}
          {profile ? (
            <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-700">Выйти</button>
          ) : (
            <a href="/login" className="text-sm text-blue-600 hover:text-blue-800">Войти</a>
          )}
        </div>
      </div>
    </header>
  )
}
