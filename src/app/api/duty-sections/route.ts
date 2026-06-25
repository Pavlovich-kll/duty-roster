import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET() {
  const [sectionsRes, itemsRes] = await Promise.all([
    fetch(`${SUPABASE_URL}/rest/v1/duty_sections?select=*&order=sort_order.asc`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      next: { revalidate: 60, tags: ['duty-data'] },
    }),
    fetch(`${SUPABASE_URL}/rest/v1/duty_items?select=*&order=sort_order.asc`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      next: { revalidate: 60, tags: ['duty-data'] },
    }),
  ])

  const sections = await sectionsRes.json()
  const items = await itemsRes.json()

  const itemsBySection = new Map<number, typeof items>()
  for (const item of items ?? []) {
    if (!itemsBySection.has(item.section_id)) itemsBySection.set(item.section_id, [])
    itemsBySection.get(item.section_id)!.push(item)
  }

  const result = (sections ?? []).map((s: any) => ({ ...s, items: itemsBySection.get(s.id) ?? [] }))
  return NextResponse.json(result)
}
