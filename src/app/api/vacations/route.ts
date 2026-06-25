import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const year = searchParams.get('year')
  const month = searchParams.get('month')
  if (!year || !month) return NextResponse.json([])

  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(Number(year), Number(month), 0)
  const end = `${year}-${String(month).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`

  const url = `${SUPABASE_URL}/rest/v1/vacations?select=id,developer_id,start_date,end_date,developers(name,team)&start_date=lte.${end}&end_date=gte.${start}&order=start_date.asc`

  const res = await fetch(url, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    next: { revalidate: 30, tags: ['vacations'] },
  })

  const data = await res.json()
  return NextResponse.json(data)
}
