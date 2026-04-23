import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function getCurrentYear() {
  const { data, error } = await supabase
    .from('academic_years')
    .select('id, name, starts_on, ends_on')
    .eq('is_current', true)
    .single()

  if (error) return null
  return data
}

export async function GET() {
  try {
    const current = await getCurrentYear()
    if (!current) {
      return NextResponse.json({ error: 'No current academic year found.' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('exams')
      .select('id, name, exam_type, starts_on, ends_on, is_active')
      .eq('academic_year_id', current.id)
      .eq('is_active', true)
      .order('id', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, data: { currentYear: current, exams: data ?? [] } }, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
