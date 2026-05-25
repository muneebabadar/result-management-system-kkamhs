// /src/app/api/reports/options/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET() {
  try {
    // Current academic year
    const { data: year } = await supabase
      .from('academic_years')
      .select('id, name')
      .eq('is_current', true)
      .single()

    if (!year) return NextResponse.json({ error: 'No active academic year' }, { status: 400 })

    // Class sections — include level from classes so the frontend
    // knows which exam term selector to render
    const { data: sections } = await supabase
      .from('class_sections')
      .select('id, class_id, section_id, classes(name, level), sections(name)')
      .order('class_id')

    const cohortOptions = (sections ?? []).map((cs: any) => ({
      id:           cs.id as number,
      label:        `${cs.classes?.name ?? ''} - ${cs.sections?.name ?? ''}`,
      class_name:   cs.classes?.name   as string,
      section_name: cs.sections?.name  as string,
      level:        cs.classes?.level  as 'primary' | 'secondary' | 'high_school',
    }))

    // Students per class section for the individual selector
    const { data: enrollments } = await supabase
      .from('student_enrollments')
      .select('student_id, class_section_id, roll_number, students(full_name)')
      .eq('academic_year_id', year.id)
      .eq('status', 'active')
      .order('roll_number')

    const studentOptions = (enrollments ?? []).map((e: any) => ({
      id:               e.student_id       as number,
      class_section_id: e.class_section_id as number,
      label:            `${e.roll_number ? e.roll_number + ' — ' : ''}${e.students?.full_name ?? ''}`,
    }))

    return NextResponse.json({
      success:        true,
      academicYear:   year,
      cohortOptions,
      studentOptions,
    })
  } catch (err: any) {
    console.error('Report options error:', err)
    return NextResponse.json({ error: err?.message ?? 'Internal server error' }, { status: 500 })
  }
}