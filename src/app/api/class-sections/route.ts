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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('search') || '').trim().toLowerCase()
    const classId = searchParams.get('classId') || ''
    const sectionId = searchParams.get('sectionId') || ''

    // 1) base rows: class_sections + joined class/section/teacher
    const { data: rows, error: rowsErr } = await supabase
      .from('class_sections')
      .select(
        `
        id,
        class_id,
        section_id,
        class_teacher_id,
        created_at,
        classes ( id, name ),
        sections ( id, name ),
        class_teacher:users ( id, name )
      `
      )
      .order('id', { ascending: true })

    if (rowsErr) {
      return NextResponse.json({ error: rowsErr.message }, { status: 500 })
    }

    const currentYearId = await getCurrentAcademicYearId()

    // 2) student counts for current year (status=active)
    // We'll fetch enrollments and aggregate in JS for simplicity and reliability.
    let countsMap = new Map<string, number>()
    if (currentYearId) {
      const { data: enrollments, error: enrErr } = await supabase
        .from('student_enrollments')
        .select('class_id, section_id')
        .eq('academic_year_id', currentYearId)
        .eq('status', 'active')

      if (!enrErr && enrollments) {
        for (const e of enrollments as any[]) {
          const key = `${e.class_id ?? 'null'}-${e.section_id ?? 'null'}`
          countsMap.set(key, (countsMap.get(key) || 0) + 1)
        }
      }
    }

    // 3) transform + filter
    const transformed = (rows || []).map((r: any) => {
      const className = r.classes?.name ?? ''
      const sectionName = r.sections?.name ?? ''
      const teacherName = r.class_teacher?.name ?? ''

      const key = `${r.class_id ?? 'null'}-${r.section_id ?? 'null'}`
      const studentCount = countsMap.get(key) || 0

      return {
        id: r.id,
        classId: r.class_id,
        sectionId: r.section_id,
        className,
        section: sectionName,
        teacherId: r.class_teacher_id,
        teacher: teacherName || '—',
        students: studentCount,
      }
    })

    const filtered = transformed.filter((row) => {
      const matchesSearch = q ? row.teacher.toLowerCase().includes(q) : true
      const matchesClass = classId ? String(row.classId) === classId : true
      const matchesSection = sectionId ? String(row.sectionId) === sectionId : true
      return matchesSearch && matchesClass && matchesSection
    })

    return NextResponse.json({ success: true, data: filtered }, { status: 200 })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { classId, sectionId } = body

    if (!classId || !sectionId) {
      return NextResponse.json({ error: 'classId and sectionId are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('class_sections')
      .insert([{ class_id: classId, section_id: sectionId }])
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
