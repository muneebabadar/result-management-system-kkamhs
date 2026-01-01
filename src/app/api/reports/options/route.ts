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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const classSectionId = searchParams.get('classSectionId')
    const current = await getCurrentYear()

    if (!current) {
      return NextResponse.json({ error: 'No current academic year found.' }, { status: 400 })
    }

    // Cohorts with active enrollments this year
    const { data: enrolls, error: eErr } = await supabase
      .from('student_enrollments')
      .select('class_section_id')
      .eq('academic_year_id', current.id)
      .eq('status', 'active')

    if (eErr) return NextResponse.json({ error: eErr.message }, { status: 500 })

    const cohortIds = Array.from(
      new Set((enrolls || []).map((e: any) => e.class_section_id).filter(Boolean))
    ) as number[]

    const { data: cohorts, error: cErr } = await supabase
      .from('class_sections')
      .select(`id, classes(name), sections(name)`)
      .in('id', cohortIds.length ? cohortIds : [0])
      .order('id', { ascending: true })

    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 })

    const cohortOptions = (cohorts || []).map((c: any) => ({
      id: c.id,
      label: `${c.classes?.name ?? ''}${c.sections?.name ?? ''}`,
    }))

    // Student options (optional filter by cohort)
    let studentOptions: { id: number; full_name: string }[] = []
    if (classSectionId) {
      const csId = Number(classSectionId)
      const { data: st, error: sErr } = await supabase
        .from('student_enrollments')
        .select(`student_id, students(full_name)`)
        .eq('academic_year_id', current.id)
        .eq('class_section_id', csId)
        .eq('status', 'active')
        .order('student_id', { ascending: true })

      if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 })

      studentOptions = (st || []).map((r: any) => ({
        id: r.student_id,
        full_name: r.students?.full_name ?? 'Unknown',
      }))
    }

    return NextResponse.json(
      { success: true, data: { currentYear: current, cohorts: cohortOptions, students: studentOptions } },
      { status: 200 }
    )
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
