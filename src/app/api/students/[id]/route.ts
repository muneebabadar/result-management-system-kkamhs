// /src/app/api/students/[id]/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function getCurrentYearId(): Promise<number | null> {
  const { data } = await supabase
    .from('academic_years')
    .select('id')
    .eq('is_current', true)
    .single()
  return data?.id ?? null
}

/* ─── GET — single student with current enrollment ─── */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const yearId = await getCurrentYearId()

  const { data, error } = await supabase
    .from('students')
    .select(`
      id,
      full_name,
      gr_no,
      contact_number,
      gender,
      dob,
      father_name,
      mother_name,
      address,
      email,
      admission_date,
      status,
      student_enrollments(
        id,
        roll_number,
        class_id,
        section_id,
        class_section_id,
        academic_year_id,
        classes(id, name),
        sections(id, name)
      )
    `)
    .eq('id', params.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })

  // Keep only the current-year enrollment
  const student: any = { ...data }
  if (yearId && Array.isArray(student.student_enrollments)) {
    student.student_enrollments = student.student_enrollments.filter(
      (e: any) => e.academic_year_id === yearId
    )
  }

  return NextResponse.json({ success: true, data: student }, { status: 200 })
}

/* ─── PUT — update personal info + enrollment ─── */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()

    // Update personal info on students table
    const { error: studentError } = await supabase
      .from('students')
      .update({
        full_name:      body.full_name,
        contact_number: body.contact_number ?? null,
      })
      .eq('id', params.id)

    if (studentError) return NextResponse.json({ error: studentError.message }, { status: 500 })

    // Update enrollment (class / section / roll_number)
    if (body.class_id && body.section_id) {
      const yearId = await getCurrentYearId()
      if (!yearId) return NextResponse.json({ error: 'No active academic year found' }, { status: 400 })

      const { data: cs } = await supabase
        .from('class_sections')
        .select('id')
        .eq('class_id', body.class_id)
        .eq('section_id', body.section_id)
        .single()

      const { error: enrollError } = await supabase
        .from('student_enrollments')
        .update({
          class_id:         body.class_id,
          section_id:       body.section_id,
          class_section_id: cs?.id ?? null,
          roll_number:      body.roll_number ?? null,
        })
        .eq('student_id', params.id)
        .eq('academic_year_id', yearId)

      if (enrollError) return NextResponse.json({ error: enrollError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Student updated successfully' }, { status: 200 })

  } catch (err) {
    console.error('PUT /api/students/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/* ─── DELETE ─── */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', params.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, message: 'Student deleted successfully' }, { status: 200 })

  } catch (err) {
    console.error('DELETE /api/students/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}