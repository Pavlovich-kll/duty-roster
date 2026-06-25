'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase-client'
import type { Profile } from '@/lib/types'
import type { SupabaseClient } from '@supabase/supabase-js'

export default function Navbar() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = useRef<SupabaseClient | null>(null)
  const mounted = useRef(true)

  useEffect(() => {
    supabase.current = createClient()
    return () => { mounted.current = false }
  }, [])

  useEffect(() => {
    const c = supabase.current
    if (!c) { if (mounted.current) setLoading(false); return }

    const timeout = setTimeout(() => {
      if (mounted.current) setLoading(false)
    }, 3000)

    c.auth.getSession()
      .then(async ({ data: { session } }) => {
        if (!session) { if (mounted.current) setLoading(false); return }
        const { data } = await c
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        if (mounted.current) {
          setProfile(data ?? null)
          setLoading(false)
          clearTimeout(timeout)
        }
      })
      .catch(() => { if (mounted.current) setLoading(false) })

    const { data: { subscription } } = c.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session && mounted.current) {
        c.from('profiles').select('*').eq('id', session.user.id).single()
          .then(({ data }) => { if (mounted.current) setProfile(data ?? null) })
      }
      if (event === 'SIGNED_OUT' && mounted.current) {
        setProfile(null)
      }
    })

    return () => { subscription.unsubscribe(); clearTimeout(timeout) }
  }, [])

  const handleLogout = async () => {
    await supabase.current?.auth.signOut()
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
          {loading ? (
            <span className="text-sm text-gray-400">...</span>
          ) : profile ? (
            <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-700">Выйти</button>
          ) : (
            <a href="/login" className="text-sm text-blue-600 hover:text-blue-800">Войти</a>
          )}
        </div>
      </div>
    </header>
  )
}
