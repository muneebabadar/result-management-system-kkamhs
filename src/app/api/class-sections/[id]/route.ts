import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function getCurrentAcademicYearId(): Promise<number | null> {
  const { data, error } = await supabase
    .from('academic_years')
    .select('id')
    .eq('is_current', true)
    .single()

  if (error || !data?.id) return null
  return data.id
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const { data, error } = await supabase
      .from('class_sections')
      .select('id, class_id, section_id, class_teacher_id')
      .eq('id', params.id)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, data }, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { classId, sectionId } = body

    if (!classId || !sectionId) {
      return NextResponse.json({ error: 'classId and sectionId are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('class_sections')
      .update({ class_id: classId, section_id: sectionId })
      .eq('id', params.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, data }, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    // Block deletion if there are enrolled students in current year for this class/section
    const { data: cs, error: csErr } = await supabase
      .from('class_sections')
      .select('class_id, section_id')
      .eq('id', params.id)
      .single()

    if (csErr) return NextResponse.json({ error: csErr.message }, { status: 500 })

    const currentYearId = await getCurrentAcademicYearId()

    if (currentYearId) {
      const { count } = await supabase
        .from('student_enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('academic_year_id', currentYearId)
        .eq('class_id', cs.class_id)
        .eq('section_id', cs.section_id)
        .eq('status', 'active')

      if ((count ?? 0) > 0) {
        return NextResponse.json(
          { error: 'Cannot delete: students are enrolled in this class/section (current year).' },
          { status: 409 }
        )
      }
    }

    const { error } = await supabase.from('class_sections').delete().eq('id', params.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
