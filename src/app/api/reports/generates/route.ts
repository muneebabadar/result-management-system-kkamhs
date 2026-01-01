import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

type ReportType = 'individual' | 'class-wise' | 'annual'

async function getCurrentYear() {
  const { data, error } = await supabase
    .from('academic_years')
    .select('id, name, starts_on, ends_on')
    .eq('is_current', true)
    .single()
  if (error) return null
  return data
}

function gradeBucket(grade?: string | null) {
  if (!grade) return 'N/A'
  const g = grade.toUpperCase()
  if (g.startsWith('A')) return 'A'
  if (g.startsWith('B')) return 'B'
  if (g.startsWith('C')) return 'C'
  if (g.startsWith('D')) return 'D'
  if (g.startsWith('F')) return 'F'
  return 'N/A'
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const reportType = body?.reportType as ReportType
    const classSectionId = body?.classSectionId ? Number(body.classSectionId) : null
    const studentId = body?.studentId ? Number(body.studentId) : null
    const startDate = body?.startDate as string | undefined
    const endDate = body?.endDate as string | undefined

    if (!reportType) return NextResponse.json({ error: 'reportType is required' }, { status: 400 })

    const current = await getCurrentYear()
    if (!current) return NextResponse.json({ error: 'No current academic year found.' }, { status: 400 })

    const distInit: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0, 'N/A': 0 }

    // Helper: cohort label
    const cohortLabel = async (csId: number) => {
      const { data, error } = await supabase
        .from('class_sections')
        .select('id, classes(name), sections(name)')
        .eq('id', csId)
        .single()
      if (error) return '—'
      return `${data?.classes?.name ?? ''}${data?.sections?.name ?? ''}`
    }

    // Build base enrollment query (current year)
    const enrollmentQuery = () => {
      let q = supabase
        .from('student_enrollments')
        .select(`id, created_at, student_id, roll_number, class_section_id, students(id, full_name)`)
        .eq('academic_year_id', current.id)
        .eq('status', 'active')

      // Date filter: based on enrollment created_at (best available)
      if (startDate) q = q.gte('created_at', new Date(startDate).toISOString())
      if (endDate) q = q.lte('created_at', new Date(endDate).toISOString())

      return q
    }

    // ===========================
    // INDIVIDUAL
    // ===========================
    if (reportType === 'individual') {
      if (!studentId) return NextResponse.json({ error: 'studentId is required' }, { status: 400 })

      const { data: enr, error: enrErr } = await enrollmentQuery()
        .eq('student_id', studentId)
        .maybeSingle()

      if (enrErr) return NextResponse.json({ error: enrErr.message }, { status: 500 })
      if (!enr) return NextResponse.json({ error: 'No enrollment found for this student in current year.' }, { status: 404 })

      const csId = enr.class_section_id
      const label = csId ? await cohortLabel(csId) : '—'

      // overall outcome
      const { data: out, error: outErr } = await supabase
        .from('student_year_outcomes')
        .select('overall_percentage, overall_grade, overall_result')
        .eq('academic_year_id', current.id)
        .eq('student_id', studentId)
        .maybeSingle()

      if (outErr) return NextResponse.json({ error: outErr.message }, { status: 500 })

      // class rank (by overall_percentage)
      let rank: number | null = null
      let classSize: number | null = null
      if (csId) {
        const { data: cohortOut } = await supabase
          .from('student_year_outcomes')
          .select('student_id, overall_percentage')
          .eq('academic_year_id', current.id)
          .eq('class_section_id', csId)

        const sorted = (cohortOut || [])
          .filter((x: any) => x.overall_percentage != null)
          .sort((a: any, b: any) => Number(b.overall_percentage) - Number(a.overall_percentage))

        rank = sorted.findIndex((x: any) => x.student_id === studentId) + 1
        if (rank === 0) rank = null
        classSize = (cohortOut || []).length
      }

      return NextResponse.json(
        {
          success: true,
          data: {
            reportType,
            academicYear: current,
            student: { id: studentId, name: enr.students?.full_name ?? 'Unknown' },
            classLabel: label,
            enrollment: { roll_number: enr.roll_number ?? null },
            summary: {
              averageScore: out?.overall_percentage ?? null,
              overallGrade: out?.overall_grade ?? null,
              overallResult: out?.overall_result ?? null,
              classRank: rank,
              classSize,
            },
          },
        },
        { status: 200 }
      )
    }

    // ===========================
    // CLASS-WISE
    // ===========================
    if (reportType === 'class-wise') {
      if (!classSectionId) return NextResponse.json({ error: 'classSectionId is required' }, { status: 400 })
      const label = await cohortLabel(classSectionId)

      const { data: enrolls, error: eErr } = await enrollmentQuery()
        .eq('class_section_id', classSectionId)
        .order('student_id', { ascending: true })

      if (eErr) return NextResponse.json({ error: eErr.message }, { status: 500 })

      const ids = (enrolls || []).map((e: any) => e.student_id)
      const { data: outs, error: oErr } = await supabase
        .from('student_year_outcomes')
        .select('student_id, overall_percentage, overall_grade, overall_result')
        .eq('academic_year_id', current.id)
        .in('student_id', ids.length ? ids : [0])

      if (oErr) return NextResponse.json({ error: oErr.message }, { status: 500 })

      const outMap = new Map<number, any>((outs || []).map((o: any) => [o.student_id, o]))

      const rows = (enrolls || []).map((e: any) => {
        const o = outMap.get(e.student_id)
        return {
          studentId: e.student_id,
          name: e.students?.full_name ?? 'Unknown',
          roll_number: e.roll_number ?? '',
          overall_percentage: o?.overall_percentage ?? null,
          overall_grade: o?.overall_grade ?? null,
          overall_result: o?.overall_result ?? null,
        }
      })

      // stats
      const total = rows.length
      const avg =
        total === 0
          ? null
          : Math.round(
              (rows.reduce((s: number, r: any) => s + Number(r.overall_percentage || 0), 0) / total) * 100
            ) / 100

      const dist = { ...distInit }
      for (const r of rows) dist[gradeBucket(r.overall_grade)]++

      return NextResponse.json(
        {
          success: true,
          data: {
            reportType,
            academicYear: current,
            classLabel: label,
            summary: { totalStudents: total, averageScore: avg },
            gradeDistribution: dist,
            rows,
          },
        },
        { status: 200 }
      )
    }

    // ===========================
    // ANNUAL
    // ===========================
    if (reportType === 'annual') {
      const { data: outs, error: oErr } = await supabase
        .from('student_year_outcomes')
        .select('overall_percentage, overall_grade')
        .eq('academic_year_id', current.id)

      if (oErr) return NextResponse.json({ error: oErr.message }, { status: 500 })

      const total = (outs || []).length
      const avg =
        total === 0
          ? null
          : Math.round(((outs || []).reduce((s: number, r: any) => s + Number(r.overall_percentage || 0), 0) / total) * 100) /
            100

      const dist = { ...distInit }
      for (const r of outs || []) dist[gradeBucket((r as any).overall_grade)]++

      return NextResponse.json(
        {
          success: true,
          data: {
            reportType,
            academicYear: current,
            summary: { totalStudents: total, averageScore: avg },
            gradeDistribution: dist,
          },
        },
        { status: 200 }
      )
    }

    return NextResponse.json({ error: 'Invalid reportType' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
