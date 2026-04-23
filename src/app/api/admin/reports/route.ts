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
    const classSectionRaw = searchParams.get('classSectionId') ?? searchParams.get('classId')
    const examIdRaw = searchParams.get('examId')

    if (!classSectionRaw) {
      return NextResponse.json({ error: 'classSectionId is required' }, { status: 400 })
    }

    const classSectionId = Number(classSectionRaw)
    if (!Number.isFinite(classSectionId)) {
      return NextResponse.json({ error: 'classSectionId must be a valid number' }, { status: 400 })
    }

    const current = await getCurrentYear()
    if (!current) {
      return NextResponse.json({ error: 'No current academic year found.' }, { status: 400 })
    }

    let examId = examIdRaw ? Number(examIdRaw) : null
    if (examIdRaw && !Number.isFinite(examId)) {
      return NextResponse.json({ error: 'examId must be a valid number' }, { status: 400 })
    }

    if (!examId) {
      const { data: activeExam, error: activeExamError } = await supabase
        .from('exams')
        .select('id, name, exam_type, starts_on, ends_on')
        .eq('academic_year_id', current.id)
        .eq('is_active', true)
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (activeExamError) {
        return NextResponse.json({ error: activeExamError.message }, { status: 500 })
      }

      if (!activeExam?.id) {
        return NextResponse.json({ error: 'No active exam found for the current academic year.' }, { status: 404 })
      }

      examId = activeExam.id
    }

    const [{ data: cohort, error: cohortError }, { data: exam, error: examError }] = await Promise.all([
      supabase
        .from('class_sections')
        .select('id, classes(name), sections(name)')
        .eq('id', classSectionId)
        .single(),
      supabase
        .from('exams')
        .select('id, name, exam_type, starts_on, ends_on')
        .eq('id', examId)
        .single(),
    ])

    if (cohortError) return NextResponse.json({ error: cohortError.message }, { status: 500 })
    if (examError) return NextResponse.json({ error: examError.message }, { status: 500 })

    const { data: enrollments, error: enrollmentError } = await supabase
      .from('student_enrollments')
      .select('student_id, roll_number, students(full_name)')
      .eq('academic_year_id', current.id)
      .eq('class_section_id', classSectionId)
      .eq('status', 'active')
      .order('roll_number', { ascending: true })

    if (enrollmentError) {
      return NextResponse.json({ error: enrollmentError.message }, { status: 500 })
    }

    const studentIds = (enrollments ?? []).map((row: any) => row.student_id).filter(Boolean) as number[]

    const { data: components, error: componentError } = await supabase
      .from('exam_components')
      .select('id, name, max_marks, sort_order')
      .eq('exam_id', examId)
      .order('sort_order', { ascending: true })

    if (componentError) {
      return NextResponse.json({ error: componentError.message }, { status: 500 })
    }

    const { data: subjects, error: subjectError } = await supabase
      .from('subjects')
      .select('id, name')
      .order('name', { ascending: true })

    if (subjectError) {
      return NextResponse.json({ error: subjectError.message }, { status: 500 })
    }

    const componentIds = (components ?? []).map((component: any) => component.id) as number[]

    let marks: any[] = []
    if (studentIds.length > 0 && componentIds.length > 0) {
      const { data: markRows, error: marksError } = await supabase
        .from('student_component_marks')
        .select('student_id, subject_id, exam_component_id, obtained_marks, is_absent')
        .in('student_id', studentIds)
        .in('exam_component_id', componentIds)

      if (marksError) {
        return NextResponse.json({ error: marksError.message }, { status: 500 })
      }

      marks = markRows ?? []
    }

    const subjectMap = new Map<number, string>((subjects ?? []).map((subject: any) => [subject.id, subject.name]))
    const componentMap = new Map<number, { name: string; max_marks: number }>(
      (components ?? []).map((component: any) => [
        component.id,
        { name: component.name, max_marks: Number(component.max_marks) },
      ])
    )

    const marksByStudent = new Map<number, any[]>()
    for (const mark of marks) {
      const component = componentMap.get(mark.exam_component_id)
      const item = {
        subject_id: mark.subject_id,
        subject_name: subjectMap.get(mark.subject_id) ?? 'Unknown',
        exam_component_id: mark.exam_component_id,
        component_name: component?.name ?? 'Unknown',
        max_marks: component?.max_marks ?? null,
        obtained_marks: mark.obtained_marks === null ? null : Number(mark.obtained_marks),
        is_absent: !!mark.is_absent,
      }

      const existing = marksByStudent.get(mark.student_id) ?? []
      existing.push(item)
      marksByStudent.set(mark.student_id, existing)
    }

    const students = (enrollments ?? []).map((row: any) => ({
      student_id: row.student_id,
      full_name: row.students?.full_name ?? 'Unknown',
      roll_number: row.roll_number ?? null,
      marks: marksByStudent.get(row.student_id) ?? [],
    }))

    return NextResponse.json({
      success: true,
      data: {
        academicYear: current,
        exam,
        cohort: {
          id: classSectionId,
          label: `${(cohort as any)?.classes?.name ?? ''} - ${(cohort as any)?.sections?.name ?? ''}`,
        },
        components: (components ?? []).map((component: any) => ({
          id: component.id,
          name: component.name,
          max_marks: Number(component.max_marks),
          sort_order: component.sort_order,
        })),
        subjects: subjects ?? [],
        students,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Internal server error' }, { status: 500 })
  }
}
