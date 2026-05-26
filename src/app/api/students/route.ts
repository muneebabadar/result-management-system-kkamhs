// /src/app/api/students/route.ts
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

/* ─── GET — list all students with their current enrollment ─── */
export async function GET() {
  const yearId = await getCurrentYearId()

  let query = supabase
    .from('students')
    .select(`
      id,
      full_name,
      gr_no,
      contact_number,
      status,
      student_enrollments!inner(
        roll_number,
        class_id,
        section_id,
        class_section_id,
        academic_year_id,
        classes(id, name),
        sections(id, name)
      )
    `)
    .eq('student_enrollments.status', 'active')
    .order('full_name')

  if (yearId) {
    query = query.eq('student_enrollments.academic_year_id', yearId)
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [], { status: 200 })
}

/* ─── POST — create student + enrollment in one call ─── */
export async function POST(req: Request) {
  try {
    const body = await req.json()

    if (!body.full_name) {
      return NextResponse.json({ error: 'Student name is required' }, { status: 400 })
    }
    if (!body.class_id || !body.section_id) {
      return NextResponse.json({ error: 'Class and section are required' }, { status: 400 })
    }

    // 1. Insert student — personal info only (no class_id / section_id / roll_number)
    const { data: student, error: studentError } = await supabase
      .from('students')
      .insert({
        full_name:      body.full_name,
        gr_no:          body.gr_no          ?? null,
        dob:            body.dob            ?? null,
        gender:         body.gender         ?? null,
        father_name:    body.father_name    ?? null,
        mother_name:    body.mother_name    ?? null,
        address:        body.address        ?? null,
        contact_number: body.contact_number ?? null,
        email:          body.email          ?? null,
        admission_date: body.admission_date ?? null,
        status:         true,
      })
      .select('id')
      .single()

    if (studentError) return NextResponse.json({ error: studentError.message }, { status: 500 })

    // 2. Get current year
    const yearId = await getCurrentYearId()
    if (!yearId) return NextResponse.json({ error: 'No active academic year found' }, { status: 400 })

    // 3. Resolve class_section_id
    const { data: cs } = await supabase
      .from('class_sections')
      .select('id')
      .eq('class_id', body.class_id)
      .eq('section_id', body.section_id)
      .single()

    // 4. Insert enrollment
    const { error: enrollError } = await supabase
      .from('student_enrollments')
      .insert({
        student_id:       student.id,
        academic_year_id: yearId,
        class_id:         body.class_id,
        section_id:       body.section_id,
        class_section_id: cs?.id ?? null,
        roll_number:      body.roll_number ?? null,
        status:           'active',
      })

    if (enrollError) {
      // Clean up the student row so there are no orphans
      await supabase.from('students').delete().eq('id', student.id)
      return NextResponse.json({ error: enrollError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: student.id }, { status: 201 })

  } catch (err) {
    console.error('POST /api/students error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}