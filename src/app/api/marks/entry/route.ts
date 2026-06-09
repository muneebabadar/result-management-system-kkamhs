// /src/app/api/marks/entry/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// ─── GET /api/marks/entry?examId=X&classSectionId=Y ──────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const examId         = Number(searchParams.get('examId'))
  const classSectionId = Number(searchParams.get('classSectionId'))

  if (!examId || !classSectionId) {
    return NextResponse.json(
      { error: 'examId and classSectionId are required' },
      { status: 400 }
    )
  }

  try {
    // 1. Exam + components
    const { data: exam, error: examErr } = await supabase
      .from('exams')
      .select('id, name, exam_type, term, exam_components(id, name, max_marks, sort_order)')
      .eq('id', examId)
      .single()

    if (examErr) return NextResponse.json({ error: examErr.message }, { status: 500 })

    const components = ((exam as any).exam_components ?? []).sort(
      (a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
    )

    // 2. Class id from class section
    const { data: cs, error: csErr } = await supabase
      .from('class_sections')
      .select('id, class_id, classes(id, name)')
      .eq('id', classSectionId)
      .single()

    if (csErr) return NextResponse.json({ error: csErr.message }, { status: 500 })

    const classId = (cs as any).class_id as number

    // 3. Subject criteria for this class
    const { data: subjectConfig, error: scErr } = await supabase
      .from('class_subject_config')
      .select('id, subject_id, max_marks, sort_order, subjects(id, name)')
      .eq('class_id', classId)
      .order('sort_order')

    if (scErr) return NextResponse.json({ error: scErr.message }, { status: 500 })

    const subjects = (subjectConfig ?? []).map((sc: any) => ({
      id:         sc.subject_id as number,
      name:       sc.subjects?.name as string,
      max_marks:  sc.max_marks as number,
      sort_order: sc.sort_order as number,
    }))

    // 4. Active students in this class section
    const { data: currentYear, error: yearErr } = await supabase
      .from('academic_years')
      .select('id')
      .eq('is_current', true)
      .limit(1)
      .single()

    if (yearErr || !currentYear) {
      return NextResponse.json({ error: 'No active academic year' }, { status: 400 })
    }

    const { data: enrollments, error: enrErr } = await supabase
      .from('student_enrollments')
      .select('student_id, roll_number, students(id, full_name)')
      .eq('class_section_id', classSectionId)
      .eq('academic_year_id', (currentYear as any).id)
      .eq('status', 'active')
      .order('roll_number')

    if (enrErr) return NextResponse.json({ error: enrErr.message }, { status: 500 })

    const students = (enrollments ?? []).map((e: any) => ({
      id:          e.student_id as number,
      full_name:   e.students?.full_name as string,
      roll_number: (e.roll_number ?? null) as string | null,
    }))

    // 5. Existing marks for pre-filling the grid
    const studentIds   = students.map(s => s.id)
    const componentIds = components.map((c: any) => c.id)
    let existingMarks: any[] = []

    if (studentIds.length && componentIds.length) {
      const { data: marks, error: marksErr } = await supabase
        .from('student_component_marks')
        .select('student_id, subject_id, exam_component_id, obtained_marks, is_absent')
        .in('student_id', studentIds)
        .in('exam_component_id', componentIds)

      if (marksErr) return NextResponse.json({ error: marksErr.message }, { status: 500 })
      existingMarks = marks ?? []
    }

    return NextResponse.json({
      success: true,
      data: {
        exam: {
          id:   (exam as any).id,
          name: (exam as any).name,
          type: (exam as any).exam_type,
          term: (exam as any).term,
        },
        class: {
          id:              classId,
          name:            (cs as any).classes?.name as string,
          class_section_id: classSectionId,
        },
        components,
        subjects,
        students,
        existingMarks,
      },
    })
  } catch (err: any) {
    console.error('[marks/entry GET]', err)
    return NextResponse.json({ error: err?.message ?? 'Internal server error' }, { status: 500 })
  }
}

// ─── POST /api/marks/entry ────────────────────────────────────────────────────

interface MarkPayload {
  studentId:       number
  subjectId:       number
  examComponentId: number
  obtainedMarks:   number | null
  isAbsent:        boolean
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { marks } = body as { marks: MarkPayload[] }

    if (!Array.isArray(marks) || marks.length === 0) {
      return NextResponse.json({ error: 'No marks provided' }, { status: 400 })
    }

    const rows = marks.map(m => ({
      student_id:        m.studentId,
      subject_id:        m.subjectId,
      exam_component_id: m.examComponentId,
      obtained_marks:    m.isAbsent ? null : m.obtainedMarks,
      is_absent:         m.isAbsent,
    }))

    // Requires the unique constraint: student_id, subject_id, exam_component_id
    const { error } = await supabase
      .from('student_component_marks')
      .upsert(rows, {
        onConflict:       'student_id,subject_id,exam_component_id',
        ignoreDuplicates: false,
      })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[marks/entry POST]', err)
    return NextResponse.json({ error: err?.message ?? 'Internal server error' }, { status: 500 })
  }
}