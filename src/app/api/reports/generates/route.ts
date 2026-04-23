// import { NextResponse } from 'next/server'
// import { createClient } from '@supabase/supabase-js'

// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!,
//   { auth: { autoRefreshToken: false, persistSession: false } }
// )

// type ReportType = 'individual' | 'class-wise' | 'annual'

// async function getCurrentYear() {
//   const { data, error } = await supabase
//     .from('academic_years')
//     .select('id, name, starts_on, ends_on')
//     .eq('is_current', true)
//     .single()
//   if (error) return null
//   return data
// }

// function gradeBucket(grade?: string | null) {
//   if (!grade) return 'N/A'
//   const g = grade.toUpperCase()
//   if (g.startsWith('A')) return 'A'
//   if (g.startsWith('B')) return 'B'
//   if (g.startsWith('C')) return 'C'
//   if (g.startsWith('D')) return 'D'
//   if (g.startsWith('F')) return 'F'
//   return 'N/A'
// }

// export async function POST(request: Request) {
//   try {
//     const body = await request.json()

//     const reportType = body?.reportType as ReportType
//     const classSectionId = body?.classSectionId ? Number(body.classSectionId) : null
//     const studentId = body?.studentId ? Number(body.studentId) : null
//     const startDate = body?.startDate as string | undefined
//     const endDate = body?.endDate as string | undefined

//     if (!reportType) return NextResponse.json({ error: 'reportType is required' }, { status: 400 })

//     const current = await getCurrentYear()
//     if (!current) return NextResponse.json({ error: 'No current academic year found.' }, { status: 400 })

//     const distInit: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0, 'N/A': 0 }

//     // Helper: cohort label
//     const cohortLabel = async (csId: number) => {
//       const { data, error } = await supabase
//         .from('class_sections')
//         .select('id, classes(name), sections(name)')
//         .eq('id', csId)
//         .single()
//       if (error) return '—'
//       return `${data?.classes?.name ?? ''}${data?.sections?.name ?? ''}`
//     }

//     // Build base enrollment query (current year)
//     const enrollmentQuery = () => {
//       let q = supabase
//         .from('student_enrollments')
//         .select(`id, created_at, student_id, roll_number, class_section_id, students(id, full_name)`)
//         .eq('academic_year_id', current.id)
//         .eq('status', 'active')

//       // Date filter: based on enrollment created_at (best available)
//       if (startDate) q = q.gte('created_at', new Date(startDate).toISOString())
//       if (endDate) q = q.lte('created_at', new Date(endDate).toISOString())

//       return q
//     }

//     // ===========================
//     // INDIVIDUAL
//     // ===========================
//     if (reportType === 'individual') {
//       if (!studentId) return NextResponse.json({ error: 'studentId is required' }, { status: 400 })

//       const { data: enr, error: enrErr } = await enrollmentQuery()
//         .eq('student_id', studentId)
//         .maybeSingle()

//       if (enrErr) return NextResponse.json({ error: enrErr.message }, { status: 500 })
//       if (!enr) return NextResponse.json({ error: 'No enrollment found for this student in current year.' }, { status: 404 })

//       const csId = enr.class_section_id
//       const label = csId ? await cohortLabel(csId) : '—'

//       // overall outcome
//       const { data: out, error: outErr } = await supabase
//         .from('student_year_outcomes')
//         .select('overall_percentage, overall_grade, overall_result')
//         .eq('academic_year_id', current.id)
//         .eq('student_id', studentId)
//         .maybeSingle()

//       if (outErr) return NextResponse.json({ error: outErr.message }, { status: 500 })

//       // class rank (by overall_percentage)
//       let rank: number | null = null
//       let classSize: number | null = null
//       if (csId) {
//         const { data: cohortOut } = await supabase
//           .from('student_year_outcomes')
//           .select('student_id, overall_percentage')
//           .eq('academic_year_id', current.id)
//           .eq('class_section_id', csId)

//         const sorted = (cohortOut || [])
//           .filter((x: any) => x.overall_percentage != null)
//           .sort((a: any, b: any) => Number(b.overall_percentage) - Number(a.overall_percentage))

//         rank = sorted.findIndex((x: any) => x.student_id === studentId) + 1
//         if (rank === 0) rank = null
//         classSize = (cohortOut || []).length
//       }

//       return NextResponse.json(
//         {
//           success: true,
//           data: {
//             reportType,
//             academicYear: current,
//             student: { id: studentId, name: enr.students?.full_name ?? 'Unknown' },
//             classLabel: label,
//             enrollment: { roll_number: enr.roll_number ?? null },
//             summary: {
//               averageScore: out?.overall_percentage ?? null,
//               overallGrade: out?.overall_grade ?? null,
//               overallResult: out?.overall_result ?? null,
//               classRank: rank,
//               classSize,
//             },
//           },
//         },
//         { status: 200 }
//       )
//     }

//     // ===========================
//     // CLASS-WISE
//     // ===========================
//     if (reportType === 'class-wise') {
//       if (!classSectionId) return NextResponse.json({ error: 'classSectionId is required' }, { status: 400 })
//       const label = await cohortLabel(classSectionId)

//       const { data: enrolls, error: eErr } = await enrollmentQuery()
//         .eq('class_section_id', classSectionId)
//         .order('student_id', { ascending: true })

//       if (eErr) return NextResponse.json({ error: eErr.message }, { status: 500 })

//       const ids = (enrolls || []).map((e: any) => e.student_id)
//       const { data: outs, error: oErr } = await supabase
//         .from('student_year_outcomes')
//         .select('student_id, overall_percentage, overall_grade, overall_result')
//         .eq('academic_year_id', current.id)
//         .in('student_id', ids.length ? ids : [0])

//       if (oErr) return NextResponse.json({ error: oErr.message }, { status: 500 })

//       const outMap = new Map<number, any>((outs || []).map((o: any) => [o.student_id, o]))

//       const rows = (enrolls || []).map((e: any) => {
//         const o = outMap.get(e.student_id)
//         return {
//           studentId: e.student_id,
//           name: e.students?.full_name ?? 'Unknown',
//           roll_number: e.roll_number ?? '',
//           overall_percentage: o?.overall_percentage ?? null,
//           overall_grade: o?.overall_grade ?? null,
//           overall_result: o?.overall_result ?? null,
//         }
//       })

//       // stats
//       const total = rows.length
//       const avg =
//         total === 0
//           ? null
//           : Math.round(
//               (rows.reduce((s: number, r: any) => s + Number(r.overall_percentage || 0), 0) / total) * 100
//             ) / 100

//       const dist = { ...distInit }
//       for (const r of rows) dist[gradeBucket(r.overall_grade)]++

//       return NextResponse.json(
//         {
//           success: true,
//           data: {
//             reportType,
//             academicYear: current,
//             classLabel: label,
//             summary: { totalStudents: total, averageScore: avg },
//             gradeDistribution: dist,
//             rows,
//           },
//         },
//         { status: 200 }
//       )
//     }

//     // ===========================
//     // ANNUAL
//     // ===========================
//     if (reportType === 'annual') {
//       const { data: outs, error: oErr } = await supabase
//         .from('student_year_outcomes')
//         .select('overall_percentage, overall_grade')
//         .eq('academic_year_id', current.id)

//       if (oErr) return NextResponse.json({ error: oErr.message }, { status: 500 })

//       const total = (outs || []).length
//       const avg =
//         total === 0
//           ? null
//           : Math.round(((outs || []).reduce((s: number, r: any) => s + Number(r.overall_percentage || 0), 0) / total) * 100) /
//             100

//       const dist = { ...distInit }
//       for (const r of outs || []) dist[gradeBucket((r as any).overall_grade)]++

//       return NextResponse.json(
//         {
//           success: true,
//           data: {
//             reportType,
//             academicYear: current,
//             summary: { totalStudents: total, averageScore: avg },
//             gradeDistribution: dist,
//           },
//         },
//         { status: 200 }
//       )
//     }

//     return NextResponse.json({ error: 'Invalid reportType' }, { status: 400 })
//   } catch {
//     return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
//   }
// }

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchStudentContext } from '../_lib/students'
import { pct, resolveGrade } from '../_lib/grades'

type ReportType = 'individual' | 'class-wise' | 'annual'
type TemplateType = 'preliminary' | 'annual_average' | 'rubric' | 'annual_summary'

type GeneratePayload = {
  reportType: ReportType
  template: TemplateType
  academicYearId?: number
  classSectionId?: number
  studentId?: number
  examId?: number
  startDate?: string
  endDate?: string
}

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

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status })
}

function validatePayload(body: GeneratePayload) {
  if (!body.reportType) throw new Error('reportType required')
  if (!body.template) throw new Error('template required')

  if (body.template === 'rubric' && !body.classSectionId) {
    throw new Error('classSectionId required for rubric')
  }

  if (
    (body.template === 'preliminary' || body.template === 'annual_average') &&
    !body.studentId
  ) {
    throw new Error('studentId required')
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as GeneratePayload
    const { reportType, template } = body

    validatePayload(body)

    if (!reportType) return bad('reportType is required')
    if (!template) return bad('template is required')

    const current = await getCurrentYear()
    if (!current && !body.academicYearId) return bad('No current academic year found and no academicYearId provided.')

    const academicYearId = body.academicYearId ?? current!.id

    if (template === 'annual_summary' || reportType === 'annual') {
      const [{ data: outcomes, error: outcomesError }, { data: classSections, error: classSectionsError }] =
        await Promise.all([
          supabase
            .from('student_year_outcomes')
            .select('student_id, class_section_id, overall_percentage, overall_grade, overall_result')
            .eq('academic_year_id', academicYearId),
          supabase
            .from('class_sections')
            .select('id, classes(name), sections(name)'),
        ])

      if (outcomesError) return bad(outcomesError.message, 500)
      if (classSectionsError) return bad(classSectionsError.message, 500)

      const gradeDistribution: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0, 'N/A': 0 }
      const bucketFor = (grade?: string | null) => {
        const value = String(grade ?? '').toUpperCase()
        if (value.startsWith('A')) return 'A'
        if (value.startsWith('B')) return 'B'
        if (value.startsWith('C')) return 'C'
        if (value.startsWith('D')) return 'D'
        if (value.startsWith('F')) return 'F'
        return 'N/A'
      }

      const rows = (outcomes ?? []).map((row: any) => {
        const percentage = row.overall_percentage === null ? null : Number(row.overall_percentage)
        const grade = row.overall_grade ?? null
        const result = row.overall_result ?? null
        gradeDistribution[bucketFor(grade)] += 1

        return {
          student_id: row.student_id,
          class_section_id: row.class_section_id,
          overall_percentage: percentage,
          overall_grade: grade,
          overall_result: result,
        }
      })

      const totalStudents = rows.length
      const averageScore =
        totalStudents > 0
          ? Math.round(
              (rows.reduce((sum: number, row: any) => sum + Number(row.overall_percentage ?? 0), 0) / totalStudents) * 100
            ) / 100
          : null

      const passCount = rows.filter((row) => String(row.overall_result ?? '').toLowerCase() === 'pass').length
      const failCount = rows.filter((row) => String(row.overall_result ?? '').toLowerCase() === 'fail').length

      const classSectionMap = new Map<number, string>(
        (classSections ?? []).map((row: any) => [row.id, `${row.classes?.name ?? ''} - ${row.sections?.name ?? ''}`])
      )

      const grouped = new Map<number, typeof rows>()
      for (const row of rows) {
        if (!row.class_section_id) continue
        const existing = grouped.get(row.class_section_id) ?? []
        existing.push(row)
        grouped.set(row.class_section_id, existing)
      }

      const cohorts = Array.from(grouped.entries())
        .map(([classSectionId, entries]) => {
          const cohortPassCount = entries.filter(
            (entry) => String(entry.overall_result ?? '').toLowerCase() === 'pass'
          ).length
          const cohortFailCount = entries.filter(
            (entry) => String(entry.overall_result ?? '').toLowerCase() === 'fail'
          ).length

          return {
            classSectionId,
            label: classSectionMap.get(classSectionId) ?? `Class Section ${classSectionId}`,
            totalStudents: entries.length,
            averageScore:
              entries.length > 0
                ? Math.round(
                    (entries.reduce((sum, entry) => sum + Number(entry.overall_percentage ?? 0), 0) / entries.length) * 100
                  ) / 100
                : null,
            passCount: cohortPassCount,
            failCount: cohortFailCount,
          }
        })
        .sort((a, b) => a.label.localeCompare(b.label))

      return NextResponse.json(
        {
          success: true,
          data: {
            template: 'annual_summary',
            reportType: 'annual',
            academicYear: current ?? { id: academicYearId },
            summary: { totalStudents, averageScore, passCount, failCount },
            gradeDistribution,
            cohorts,
          },
        },
        { status: 200 }
      )
    }

    // 1) Resolve exam
    let examId = body.examId
    if (!examId) {
      const { data: ex, error: exErr } = await supabase
        .from('exams')
        .select('id, name')
        .eq('academic_year_id', academicYearId)
        .eq('is_active', true)
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (exErr) return bad(exErr.message, 500)
      if (!ex?.id) return bad('No active exam found. Create an exam first.')
      examId = ex.id
    }

    const { data: exam, error: eErr } = await supabase
      .from('exams')
      .select('id, name, exam_type')
      .eq('id', examId)
      .single()

    if (eErr) return bad(eErr.message, 500)

    // ---------------------------
    // RUBRIC TEMPLATE (cohort-based)
    // ---------------------------
    if (template === 'rubric') {
      if (!body.classSectionId) return bad('classSectionId is required for rubric template')

      const csId = body.classSectionId

      const { data: cohort, error: cErr } = await supabase
        .from('class_sections')
        .select('id, classes(name), sections(name)')
        .eq('id', csId)
        .single()

      if (cErr) return bad(cErr.message, 500)

      const cohortLabel = `${(cohort as any)?.classes?.name ?? ''}${(cohort as any)?.sections?.name ?? ''}`

      const { data: enrollments, error: enErr } = await supabase
        .from('student_enrollments')
        .select('student_id')
        .eq('academic_year_id', academicYearId)
        .eq('class_section_id', csId)
        .eq('status', 'active')

      if (enErr) return bad(enErr.message, 500)

      const studentIds = (enrollments ?? []).map((x: any) => x.student_id).filter(Boolean) as number[]
      if (studentIds.length === 0) return bad('No active students in this cohort.')

      const { data: rubric, error: rErr } = await supabase
        .from('rubric_skills')
        .select('id, group_name, skill_text')
        .order('group_name', { ascending: true })
        .order('sort_order', { ascending: true })

      if (rErr) return bad(rErr.message, 500)

      const { data: grades, error: gErr } = await supabase
        .from('student_rubric_grades')
        .select('student_id, rubric_skill_id, grade')
        .eq('exam_id', exam.id)
        .in('student_id', studentIds)

      if (gErr) return bad(gErr.message, 500)

      const byStudent = new Map<number, Record<string, string>>()
      for (const sid of studentIds) byStudent.set(sid, {})
      for (const row of grades ?? []) {
        const m = byStudent.get(row.student_id) ?? {}
        m[String(row.rubric_skill_id)] = row.grade
        byStudent.set(row.student_id, m)
      }

      const students = await Promise.all(studentIds.map((sid) => fetchStudentContext(sid, academicYearId)))

      return NextResponse.json(
        {
          success: true,
          data: {
            template: 'rubric',
            examName: exam.name,
            cohortLabel,
            rubric: rubric ?? [],
            students: students.map((s) => ({ student: s, grades: byStudent.get(s.id) ?? {} })),
          },
        },
        { status: 200 }
      )
    }

    // ---------------------------
    // PRELIM / ANNUAL AVERAGE (student-based)
    // ---------------------------
    if (!body.studentId) return bad('studentId is required for this template/reportType.')

    const student = await fetchStudentContext(body.studentId, academicYearId)

    // Subjects (global list; later you can filter by class)
    const { data: subjects, error: sErr } = await supabase
      .from('subjects')
      .select('id, name')
      .order('name', { ascending: true })

    if (sErr) return bad(sErr.message, 500)
    if (!subjects?.length) return bad('No subjects found.')

    // Components for exam
    const { data: comps, error: cErr } = await supabase
      .from('exam_components')
      .select('id, name, max_marks, sort_order')
      .eq('exam_id', exam.id)
      .order('sort_order', { ascending: true })

    if (cErr) return bad(cErr.message, 500)
    if (!comps?.length) return bad('No exam components found for this exam. Add components first.')

    const compIds = comps.map((c: any) => c.id)

    const { data: marks, error: mErr } = await supabase
      .from('student_component_marks')
      .select('subject_id, exam_component_id, obtained_marks, is_absent')
      .eq('student_id', student.id)
      .in('exam_component_id', compIds)

    if (mErr) return bad(mErr.message, 500)

    const key = (subjectId: number, compId: number) => `${subjectId}:${compId}`
    const marksMap = new Map<string, { obtained: number | null; absent: boolean }>()
    for (const row of marks ?? []) {
      marksMap.set(key(row.subject_id, row.exam_component_id), {
        obtained: row.obtained_marks === null ? null : Number(row.obtained_marks),
        absent: !!row.is_absent,
      })
    }

    const { data: attendance } = await supabase
      .from('student_exam_attendance')
      .select('total_days, days_present, days_absent')
      .eq('student_id', student.id)
      .eq('exam_id', exam.id)
      .maybeSingle()

    const { data: behaviour } = await supabase
      .from('student_exam_behaviour')
      .select('cleanliness, discipline, punctuality, regularity')
      .eq('student_id', student.id)
      .eq('exam_id', exam.id)
      .maybeSingle()

    // PRELIMINARY: first component only
    if (template === 'preliminary') {
      const primary = comps[0]
      const rows = await Promise.all(
        subjects.map(async (sub: any) => {
          const mk = marksMap.get(key(sub.id, primary.id))
          const obtained = mk?.absent ? null : mk?.obtained ?? null
          const max = Number(primary.max_marks)
          const percentage = obtained === null ? null : pct(obtained, max)
          const grade = await resolveGrade(academicYearId, percentage)
          return { subject: sub.name, max, obtained, pct: percentage, grade }
        })
      )

      const maxTotal = rows.reduce((a, r) => a + r.max, 0)
      const obtainedTotal = rows.reduce((a, r) => a + (r.obtained ?? 0), 0)
      const overallPct = maxTotal > 0 ? pct(obtainedTotal, maxTotal) : null
      const overallGrade = await resolveGrade(academicYearId, overallPct)

      return NextResponse.json(
        {
          success: true,
          data: {
            template: 'preliminary',
            examName: exam.name,
            student,
            rows,
            behaviour: behaviour ?? undefined,
            attendance: attendance ?? undefined,
            totals: { maxTotal, obtainedTotal, pct: overallPct, grade: overallGrade },
          },
        },
        { status: 200 }
      )
    }

    // ANNUAL AVERAGE: blocks with all components
    const blocks = await Promise.all(
      subjects.map(async (sub: any) => {
        const components = comps.map((c: any) => {
          const mk = marksMap.get(key(sub.id, c.id))
          return {
            label: c.name,
            max: Number(c.max_marks),
            obtained: mk?.absent ? null : mk?.obtained ?? null,
            is_absent: mk?.absent ?? false,
          }
        })

        const maxTotal = components.reduce((a, x) => a + x.max, 0)
        const obtainedTotal = components.reduce((a, x) => a + (x.obtained ?? 0), 0)
        const percentage = maxTotal > 0 ? pct(obtainedTotal, maxTotal) : null
        const grade = await resolveGrade(academicYearId, percentage)

        return { subject: sub.name, components, pct: percentage, grade }
      })
    )

    const overallMax = blocks.reduce((a, b) => a + b.components.reduce((x: number, c: any) => x + c.max, 0), 0)
    const overallObt = blocks.reduce((a, b) => a + b.components.reduce((x: number, c: any) => x + (c.obtained ?? 0), 0), 0)
    const overallPct = overallMax > 0 ? pct(overallObt, overallMax) : null
    const overallGrade = await resolveGrade(academicYearId, overallPct)

    return NextResponse.json(
      {
        success: true,
        data: {
          template: 'annual_average',
          examName: exam.name,
          student,
          blocks,
          behaviour: behaviour ?? undefined,
          attendance: attendance ?? undefined,
          overall: { pct: overallPct, grade: overallGrade },
        },
      },
      { status: 200 }
    )
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Internal server error' }, { status: 500 })
  }
}
