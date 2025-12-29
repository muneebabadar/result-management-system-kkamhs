import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { autoRefreshToken: false, persistSession: false },
  }
)

async function safeCount(table: string, opts?: { filter?: (q: any) => any }): Promise<number> {
  try {
    let q = supabase.from(table).select('*', { count: 'exact', head: true })
    if (opts?.filter) q = opts.filter(q)
    const { count, error } = await q
    if (error) return 0
    return count ?? 0
  } catch {
    return 0
  }
}

async function safeNotifications(limit = 5) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('id, title, description, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) return []
    return data || []
  } catch {
    return []
  }
}

async function safeCurrentYearEnrolledStudentsCount(): Promise<number> {
  try {
    const { data: year, error: yearErr } = await supabase
      .from('academic_years')
      .select('id')
      .eq('is_current', true)
      .single()

    if (yearErr || !year?.id) return 0

    // Count enrollments in current year. If you only want active enrollments, add .eq('status','active')
    const { count, error } = await supabase
      .from('student_enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('academic_year_id', year.id)
      .eq('status', 'active')

    if (error) return 0
    return count ?? 0
  } catch {
    return 0
  }
}

export async function GET() {
  try {
    const [totalStudents, totalClasses, totalTeachers, notifications] = await Promise.all([
      safeCurrentYearEnrolledStudentsCount(),
      safeCount('classes'),
      safeCount('users', { filter: (q) => q.eq('role', 'Teacher').eq('status', true) }),
      safeNotifications(5),
    ])

    return NextResponse.json(
      { success: true, data: { totalStudents, totalClasses, totalTeachers, notifications } },
      { status: 200 }
    )
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
