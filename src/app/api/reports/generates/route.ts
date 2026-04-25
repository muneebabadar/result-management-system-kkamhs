import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchStudentContext } from '../_lib/students'
import { pct } from '../_lib/grades'

// ─── Types ────────────────────────────────────────────────────
type ReportType = 'individual' | 'class-wise' | 'annual'

type GeneratePayload = {
  reportType: ReportType
  classSectionId?: number
  studentId?: number
  examId?: number
  academicYearId?: number
}

// ─── Supabase ─────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// ─── Helpers ──────────────────────────────────────────────────
function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status })
}

async function getCurrentYear() {
  const { data } = await supabase
    .from('academic_years')
    .select('id, name')
    .eq('is_current', true)
    .single()
  return data
}

/** Classes 1–6 = primary (rubric). 7+ = secondary (subject marks). */
function isPrimaryClass(className: string): boolean {
  const n = parseInt((className ?? '').match(/\d+/)?.[0] ?? '99')
  return n >= 1 && n <= 6
}

/** Fetch grade scales once and return a local resolver — avoids N DB calls. */
async function buildGradeResolver(academicYearId: number) {
  const { data: scales } = await supabase
    .from('grade_scales')
    .select('min_pct, max_pct, grade')
    .eq('academic_year_id', academicYearId)
    .order('min_pct', { ascending: false })

  return function resolveGrade(percentage: number | null): string | null {
    if (percentage === null) return null
    const scale = (scales ?? []).find(
      (s: any) => percentage >= Number(s.min_pct) && percentage <= Number(s.max_pct)
    )
    return scale?.grade ?? null
  }
}

function pctOf(obtained: number, max: number): number | null {
  if (max === 0) return null
  return Math.round((obtained / max) * 100 * 100) / 100
}

// ─── Route handler ────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as GeneratePayload
    const { reportType } = body

    if (!reportType) return bad('reportType is required')

    const current = await getCurrentYear()
    if (!current && !body.academicYearId) return bad('No current academic year found.')
    const academicYearId = body.academicYearId ?? current!.id

    // ══════════════════════════════════════════════════════════
    // ANNUAL SUMMARY
    // ══════════════════════════════════════════════════════════
    if (reportType === 'annual') {
      const [{ data: outcomes, error: outErr }, { data: classSections, error: csErr }] =
        await Promise.all([
          supabase
            .from('student_year_outcomes')
            .select('student_id, class_section_id, overall_percentage, overall_grade, overall_result')
            .eq('academic_year_id', academicYearId),
          supabase
            .from('class_sections')
            .select('id, classes(name), sections(name)'),
        ])

      if (outErr) return bad(outErr.message, 500)
      if (csErr)  return bad(csErr.message, 500)

      const bucket = (g?: string | null) => {
        const v = String(g ?? '').toUpperCase()
        if (v.startsWith('A')) return 'A'
        if (v.startsWith('B')) return 'B'
        if (v.startsWith('C')) return 'C'
        if (v.startsWith('D')) return 'D'
        if (v.startsWith('F')) return 'F'
        return 'N/A'
      }

      const gradeDistribution: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0, 'N/A': 0 }
      const rows = (outcomes ?? []).map((r: any) => {
        gradeDistribution[bucket(r.overall_grade)] += 1
        return r
      })

      const total    = rows.length
      const sumPct   = rows.reduce((s: number, r: any) => s + Number(r.overall_percentage ?? 0), 0)
      const avgScore = total > 0 ? Math.round((sumPct / total) * 100) / 100 : null
      const passCount = rows.filter((r: any) => String(r.overall_result ?? '').toLowerCase() === 'pass').length
      const failCount = rows.filter((r: any) => String(r.overall_result ?? '').toLowerCase() === 'fail').length

      const csMap = new Map<number, string>(
        (classSections ?? []).map((r: any) => [r.id, `${r.classes?.name ?? ''} - ${r.sections?.name ?? ''}`])
      )
      const grouped = new Map<number, any[]>()
      for (const r of rows) {
        if (!r.class_section_id) continue
        const arr = grouped.get(r.class_section_id) ?? []
        arr.push(r)
        grouped.set(r.class_section_id, arr)
      }
      const cohorts = Array.from(grouped.entries()).map(([csId, entries]) => ({
        label: csMap.get(csId) ?? `Section ${csId}`,
        totalStudents: entries.length,
        averageScore: entries.length > 0
          ? Math.round((entries.reduce((s, e) => s + Number(e.overall_percentage ?? 0), 0) / entries.length) * 100) / 100
          : null,
        passCount: entries.filter(e => String(e.overall_result ?? '').toLowerCase() === 'pass').length,
        failCount: entries.filter(e => String(e.overall_result ?? '').toLowerCase() === 'fail').length,
      })).sort((a, b) => a.label.localeCompare(b.label))

      return NextResponse.json({ success: true, data: {
        template: 'annual_summary',
        reportType: 'annual',
        academicYear: current ?? { id: academicYearId },
        summary: { totalStudents: total, averageScore: avgScore, passCount, failCount },
        gradeDistribution,
        cohorts,
      }})
    }

    // ── Resolve exam ──────────────────────────────────────────
    let examId = body.examId
    if (!examId) {
      const { data: ex } = await supabase
        .from('exams')
        .select('id, name')
        .eq('academic_year_id', academicYearId)
        .eq('is_active', true)
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!ex?.id) return bad('No active exam found. Run the seed SQL first.')
      examId = ex.id
    }
    const { data: exam, error: examErr } = await supabase
      .from('exams').select('id, name').eq('id', examId).single()
    if (examErr) return bad(examErr.message, 500)

    // ── Resolve grade scale ───────────────────────────────────
    const resolveGrade = await buildGradeResolver(academicYearId)

    // ══════════════════════════════════════════════════════════
    // CLASS-WISE
    // ══════════════════════════════════════════════════════════
    if (reportType === 'class-wise') {
      if (!body.classSectionId) return bad('classSectionId is required for class-wise reports')
      const csId = body.classSectionId

      // Fetch class section info
      const { data: cohort, error: cErr } = await supabase
        .from('class_sections')
        .select('id, classes(name, id), sections(name)')
        .eq('id', csId)
        .single()
      if (cErr) return bad(cErr.message, 500)

      const className   = (cohort as any)?.classes?.name ?? ''
      const sectionName = (cohort as any)?.sections?.name ?? ''
      const cohortLabel = `${className} ${sectionName}`.trim()
      const primary     = isPrimaryClass(className)

      // Fetch enrollments
      const { data: enrollments, error: enErr } = await supabase
        .from('student_enrollments')
        .select('student_id, roll_number, students(full_name)')
        .eq('academic_year_id', academicYearId)
        .eq('class_section_id', csId)
        .eq('status', 'active')
        .order('roll_number', { ascending: true })
      if (enErr) return bad(enErr.message, 500)

      const studentIds = (enrollments ?? []).map((e: any) => e.student_id).filter(Boolean) as number[]
      if (studentIds.length === 0) return bad('No active students found in this class.')

      // ── PRIMARY: Rubric register ──────────────────────────
      if (primary) {
        const { data: rubric, error: rErr } = await supabase
          .from('rubric_skills')
          .select('id, group_name, skill_text')
          .order('group_name', { ascending: true })
          .order('sort_order', { ascending: true })
        if (rErr) return bad(rErr.message, 500)

        const { data: grades, error: gErr } = await supabase
          .from('student_rubric_grades')
          .select('student_id, rubric_skill_id, grade')
          .eq('exam_id', examId)
          .in('student_id', studentIds)
        if (gErr) return bad(gErr.message, 500)

        const byStudent = new Map<number, Record<string, string>>()
        for (const sid of studentIds) byStudent.set(sid, {})
        for (const row of grades ?? []) {
          const m = byStudent.get(row.student_id) ?? {}
          m[String(row.rubric_skill_id)] = row.grade
          byStudent.set(row.student_id, m)
        }

        const students = (enrollments ?? []).map((e: any) => ({
          student: {
            id: e.student_id,
            full_name: e.students?.full_name ?? 'Unknown',
            roll_number: e.roll_number ?? '',
          },
          grades: byStudent.get(e.student_id) ?? {},
        }))

        return NextResponse.json({ success: true, data: {
          template: 'rubric_register',
          examName: exam.name,
          cohortLabel,
          className,
          sectionName,
          rubric: rubric ?? [],
          students,
        }})
      }

      // ── SECONDARY: Class results list ────────────────────
      // Fetch pre-computed year outcomes for all students in this class.
      const { data: outcomes, error: outErr2 } = await supabase
        .from('student_year_outcomes')
        .select('student_id, overall_percentage, overall_grade, overall_result')
        .eq('academic_year_id', academicYearId)
        .in('student_id', studentIds)
      if (outErr2) return bad(outErr2.message, 500)

      const outcomeMap = new Map<number, any>(
        (outcomes ?? []).map((o: any) => [o.student_id, o])
      )

      const studentRows = (enrollments ?? []).map((e: any, i: number) => {
        const out = outcomeMap.get(e.student_id)
        return {
          no:           i + 1,
          rollNumber:   e.roll_number ?? '',
          name:         e.students?.full_name ?? 'Unknown',
          overallPct:   out?.overall_percentage != null ? Number(out.overall_percentage) : null,
          overallGrade: out?.overall_grade ?? null,
          overallResult: out?.overall_result ?? null,
        }
      })

      return NextResponse.json({ success: true, data: {
        template:     'class_results',
        examName:     exam.name,
        cohortLabel,
        className,
        sectionName,
        academicYear: current ?? { id: academicYearId, name: '' },
        students:     studentRows,
      }})
    }

    // ══════════════════════════════════════════════════════════
    // INDIVIDUAL
    // ══════════════════════════════════════════════════════════
    if (reportType === 'individual') {
      if (!body.studentId) return bad('studentId is required')

      // Detect class level
      const { data: enrollment } = await supabase
        .from('student_enrollments')
        .select('class_section_id, class_sections(classes(name))')
        .eq('student_id', body.studentId)
        .eq('academic_year_id', academicYearId)
        .maybeSingle()

      const className = (enrollment as any)?.class_sections?.classes?.name ?? ''
      if (isPrimaryClass(className)) {
        return bad('Individual subject reports are not generated for primary classes. Use the class-wise rubric report instead.', 400)
      }

      const student = await fetchStudentContext(body.studentId, academicYearId)

      const [{ data: subjects, error: sErr }, { data: comps, error: compErr }] = await Promise.all([
        supabase.from('subjects').select('id, name').order('name', { ascending: true }),
        supabase.from('exam_components')
          .select('id, name, max_marks, sort_order')
          .eq('exam_id', examId)
          .order('sort_order', { ascending: true }),
      ])
      if (sErr)    return bad(sErr.message, 500)
      if (compErr) return bad(compErr.message, 500)
      if (!subjects?.length) return bad('No subjects found.')
      if (!comps?.length)    return bad('No exam components found. Run the seed SQL first.')

      const compIds = comps.map((c: any) => c.id)
      const { data: marks, error: mErr } = await supabase
        .from('student_component_marks')
        .select('subject_id, exam_component_id, obtained_marks, is_absent')
        .eq('student_id', student.id)
        .in('exam_component_id', compIds)
      if (mErr) return bad(mErr.message, 500)

      const mkKey = (subId: number, compId: number) => `${subId}:${compId}`
      const marksMap = new Map<string, { obtained: number | null; absent: boolean }>()
      for (const row of marks ?? []) {
        marksMap.set(mkKey(row.subject_id, row.exam_component_id), {
          obtained: row.obtained_marks === null ? null : Number(row.obtained_marks),
          absent: !!row.is_absent,
        })
      }

      const [{ data: attendance }, { data: behaviour }] = await Promise.all([
        supabase.from('student_exam_attendance')
          .select('total_days, days_present, days_absent')
          .eq('student_id', student.id).eq('exam_id', examId).maybeSingle(),
        supabase.from('student_exam_behaviour')
          .select('cleanliness, discipline, punctuality, regularity')
          .eq('student_id', student.id).eq('exam_id', examId).maybeSingle(),
      ])

      const blocks = (subjects ?? []).map((sub: any) => {
        const components = (comps ?? []).map((c: any) => {
          const mk = marksMap.get(mkKey(sub.id, c.id))
          return {
            label:     c.name,
            max:       Number(c.max_marks),
            obtained:  mk?.absent ? null : (mk?.obtained ?? null),
            is_absent: mk?.absent ?? false,
          }
        })
        const maxTotal = components.reduce((a, x) => a + x.max, 0)
        const obtTotal = components.reduce((a, x) => a + (x.obtained ?? 0), 0)
        const percentage = pctOf(obtTotal, maxTotal)
        return { subject: sub.name, components, pct: percentage, grade: resolveGrade(percentage) }
      })

      const overallMax = blocks.reduce((a, b) => a + b.components.reduce((x, c) => x + c.max, 0), 0)
      const overallObt = blocks.reduce((a, b) => a + b.components.reduce((x, c) => x + (c.obtained ?? 0), 0), 0)
      const overallPct   = pctOf(overallObt, overallMax)
      const overallGrade = resolveGrade(overallPct)

      return NextResponse.json({ success: true, data: {
        template: 'annual_average',
        examName: exam.name,
        student,
        blocks,
        attendance: attendance ?? undefined,
        behaviour:  behaviour ?? undefined,
        overall: { pct: overallPct, grade: overallGrade },
      }})
    }

    return bad('Invalid reportType')
  } catch (err: any) {
    console.error('[generate error]', err)
    return NextResponse.json({ error: err?.message ?? 'Internal server error' }, { status: 500 })
  }
}