// File: app/api/teacher/studentGrades/route.ts
//
// GET  /api/teacher/studentGrades?class_id=X&section_id=Y&teacher_id=Z
//   Returns students enrolled in the current academic year for that class+section,
//   the subjects this teacher teaches there, all active exams with their components,
//   and existing marks as a lookup map.
//
// POST /api/teacher/studentGrades
//   Upserts a single student_component_marks row.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const classId   = searchParams.get('class_id')
    const sectionId = searchParams.get('section_id')
    const teacherId = searchParams.get('teacher_id')

    if (!classId || !sectionId || !teacherId) {
      return NextResponse.json(
        { error: 'class_id, section_id, and teacher_id are required' },
        { status: 400 }
      )
    }

    // 1. Current academic year ------------------------------------------------
    const { data: currentYear, error: yearError } = await supabase
      .from('academic_years')
      .select('id, name')
      .eq('is_current', true)
      .single()

    if (yearError || !currentYear) {
      return NextResponse.json({ error: 'No current academic year found' }, { status: 404 })
    }

    // 2. Enrolled students ----------------------------------------------------
    //    student_enrollments links student → class + section + academic_year
    const { data: enrollments, error: enrollError } = await supabase
      .from('student_enrollments')
      .select(`
        id,
        roll_number,
        student_id,
        students ( id, full_name, gr_no )
      `)
      .eq('class_id', classId)
      .eq('section_id', sectionId)
      .eq('academic_year_id', currentYear.id)
      .eq('status', 'active')
      .order('roll_number')

    if (enrollError) throw enrollError

    // 3. Subjects this teacher teaches in this class+section ------------------
    const { data: assignments, error: assignError } = await supabase
      .from('teacher_assignments')
      .select('subject_id, subjects ( id, name )')
      .eq('teacher_id', teacherId)
      .eq('class_id', classId)
      .eq('section_id', sectionId)

    if (assignError) throw assignError

    const subjects = (assignments ?? []).map((a: any) => ({
      id:   a.subjects.id,
      name: a.subjects.name,
    }))

    // 4. Active exams + their components for this academic year ---------------
    const { data: exams, error: examError } = await supabase
      .from('exams')
      .select(`
        id, name, exam_type, term,
        exam_components ( id, name, max_marks, sort_order )
      `)
      .eq('academic_year_id', currentYear.id)
      .eq('is_active', true)
      .order('starts_on')

    if (examError) throw examError

    // 5. Existing marks -------------------------------------------------------
    const studentIds = (enrollments ?? []).map((e: any) => e.student_id)
    const subjectIds = subjects.map((s: any) => s.id)

    let existingMarks: any[] = []
    if (studentIds.length > 0 && subjectIds.length > 0) {
      const { data: marks, error: marksError } = await supabase
        .from('student_component_marks')
        .select('student_id, subject_id, exam_component_id, obtained_marks, is_absent')
        .in('student_id', studentIds)
        .in('subject_id', subjectIds)

      if (marksError) throw marksError
      existingMarks = marks ?? []
    }

    // Build lookup: marks_lookup[studentId][subjectId][componentId]
    const marks_lookup: Record<string, Record<string, Record<string, {
      obtained_marks: number | null
      is_absent: boolean
    }>>> = {}

    for (const m of existingMarks) {
      if (!marks_lookup[m.student_id])               marks_lookup[m.student_id] = {}
      if (!marks_lookup[m.student_id][m.subject_id]) marks_lookup[m.student_id][m.subject_id] = {}
      marks_lookup[m.student_id][m.subject_id][m.exam_component_id] = {
        obtained_marks: m.obtained_marks,
        is_absent:      m.is_absent,
      }
    }

    const students = (enrollments ?? []).map((e: any) => ({
      enrollment_id: e.id,
      student_id:    e.student_id,
      roll_number:   e.roll_number,
      full_name:     e.students?.full_name ?? '',
      gr_no:         e.students?.gr_no ?? '',
    }))

    return NextResponse.json({
      data: {
        academic_year: currentYear,
        students,
        subjects,
        exams,
        marks_lookup,
      },
    })

  } catch (err) {
    console.error('[GET /api/teacher/studentGrades]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// POST — upsert one mark cell
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { student_id, subject_id, exam_component_id, obtained_marks, is_absent } = body

    if (!student_id || !subject_id || !exam_component_id) {
      return NextResponse.json(
        { error: 'student_id, subject_id, and exam_component_id are required' },
        { status: 400 }
      )
    }

    // Validate obtained_marks doesn't exceed max_marks for this component
    if (!is_absent && obtained_marks !== null && obtained_marks !== undefined) {
      const { data: component } = await supabase
        .from('exam_components')
        .select('max_marks')
        .eq('id', exam_component_id)
        .single()

      if (component && Number(obtained_marks) > Number(component.max_marks)) {
        return NextResponse.json(
          { error: `Marks cannot exceed maximum of ${component.max_marks}` },
          { status: 400 }
        )
      }
    }

    const { error } = await supabase
      .from('student_component_marks')
      .upsert(
        {
          student_id,
          subject_id,
          exam_component_id,
          obtained_marks: is_absent ? null : (obtained_marks ?? null),
          is_absent:      is_absent ?? false,
        },
        { onConflict: 'student_id,subject_id,exam_component_id' }
      )

    if (error) throw error

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('[POST /api/teacher/studentGrades]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}