// /src/app/api/reports/generate/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// ─── Types ───────────────────────────────────────────────────────────────────

type Level    = 'primary' | 'secondary' | 'high_school'
type Term     = 'q1' | 'q2' | 'sem1' | 'sem2' | 'preliminary' | 'annual' | 'term1' | 'term2'
type Audience = 'student' | 'patron'
type Scope    = 'individual' | 'class'

interface ReportRequest {
  scope:          Scope
  audience:       Audience
  classSectionId: number
  studentId?:     number
  examTerm:       Term
  academicYearId?: number
}

interface GradeScale {
  min_pct:      number
  max_pct:      number
  grade:        string
  result_label: string | null
}

// ─── Shared Utilities ────────────────────────────────────────────────────────

function calcPct(obtained: number, max: number): number | null {
  if (!max) return null
  return Math.round((obtained / max) * 10000) / 100
}

function calcGrade(p: number | null, scales: GradeScale[]): string {
  if (p === null) return '—'
  const s = scales.find(s => p >= Number(s.min_pct) && p <= Number(s.max_pct))
  return s?.grade ?? '—'
}

async function getYear(yearId?: number) {
  const q = supabase.from('academic_years').select('id, name, starts_on, ends_on')
  const { data } = yearId
    ? await q.eq('id', yearId).single()
    : await q.eq('is_current', true).single()
  return data
}

async function getScales(yearId: number): Promise<GradeScale[]> {
  const { data } = await supabase
    .from('grade_scales')
    .select('min_pct, max_pct, grade, result_label')
    .eq('academic_year_id', yearId)
    .order('min_pct', { ascending: false })
  return (data ?? []) as GradeScale[]
}

async function getCohort(id: number) {
  const { data } = await supabase
    .from('class_sections')
    .select('id, class_id, section_id, classes(name, level), sections(name)')
    .eq('id', id)
    .single()
  if (!data) return null
  return {
    id,
    class_id:    (data as any).class_id    as number,
    section_id:  (data as any).section_id  as number,
    class_name:  (data as any).classes?.name  as string,
    section_name:(data as any).sections?.name as string,
    level:       (data as any).classes?.level as Level,
  }
}

async function getSubjectsForSection(classId: number, sectionId: number) {
  const { data } = await supabase
    .from('teacher_assignments')
    .select('subject_id, subjects(name)')
    .eq('class_id', classId)
    .eq('section_id', sectionId)
  const seen = new Set<number>()
  return (data ?? [])
    .filter((a: any) => { if (seen.has(a.subject_id)) return false; seen.add(a.subject_id); return true })
    .map((a: any) => ({ id: a.subject_id as number, name: a.subjects?.name as string }))
}

async function getStudentEnrollment(studentId: number, yearId: number, classSectionId: number) {
  const { data } = await supabase
    .from('student_enrollments')
    .select('roll_number, students(id, full_name, father_name, gr_no)')
    .eq('student_id', studentId)
    .eq('academic_year_id', yearId)
    .eq('class_section_id', classSectionId)
    .eq('status', 'active')
    .maybeSingle()
  if (!data) return null
  return {
    student_id:  studentId,
    full_name:   (data as any).students?.full_name   ?? '',
    father_name: (data as any).students?.father_name ?? '',
    gr_no:       (data as any).students?.gr_no       ?? '',
    roll_number: data.roll_number ?? '',
  }
}

async function getAllEnrolledStudents(yearId: number, classSectionId: number) {
  const { data } = await supabase
    .from('student_enrollments')
    .select('student_id, roll_number, students(id, full_name, father_name, gr_no)')
    .eq('academic_year_id', yearId)
    .eq('class_section_id', classSectionId)
    .eq('status', 'active')
    .order('roll_number')
  return (data ?? []).map((row: any) => ({
    student_id:  row.student_id    as number,
    full_name:   row.students?.full_name   ?? '',
    father_name: row.students?.father_name ?? '',
    gr_no:       row.students?.gr_no       ?? '',
    roll_number: row.roll_number ?? '',
  }))
}

function studentInfo(student: any, cohort: any) {
  return {
    gr_no:        student.gr_no,
    full_name:    student.full_name,
    father_name:  student.father_name,
    class_name:   cohort.class_name,
    section_name: cohort.section_name,
    roll_number:  student.roll_number,
  }
}

// ─── High School Report ───────────────────────────────────────────────────────

async function generateHighSchool(
  req: ReportRequest, year: any, scales: GradeScale[], cohort: any, student: any
) {
  const { data: exam } = await supabase
    .from('exams').select('id, name')
    .eq('academic_year_id', year.id)
    .eq('term', req.examTerm)
    .eq('is_active', true)
    .maybeSingle()
  if (!exam) return { error: `No exam found for term '${req.examTerm}'` }

  const subjects = await getSubjectsForSection(cohort.class_id, cohort.section_id)
  const subjectIds = subjects.map(s => s.id)

  const [{ data: configs }, { data: components }] = await Promise.all([
    supabase
      .from('class_subject_config')
      .select('subject_id, max_marks, sort_order')
      .eq('class_id', cohort.class_id)
      .in('subject_id', subjectIds.length ? subjectIds : [0])
      .order('sort_order'),
    supabase
      .from('exam_components')
      .select('id')
      .eq('exam_id', exam.id),
  ])

  const compIds = (components ?? []).map((c: any) => c.id as number)
  const { data: marksRows } = await supabase
    .from('student_component_marks')
    .select('subject_id, obtained_marks, is_absent')
    .eq('student_id', student.student_id)
    .in('exam_component_id', compIds.length ? compIds : [0])

  const marksMap  = new Map<number, any>((marksRows ?? []).map((m: any) => [m.subject_id, m]))
  const configMap = new Map<number, any>((configs   ?? []).map((c: any) => [c.subject_id, c]))
  const nameMap   = new Map<number, string>(subjects.map(s => [s.id, s.name]))

  const orderedIds = [...subjectIds].sort((a, b) =>
    (configMap.get(a)?.sort_order ?? 99) - (configMap.get(b)?.sort_order ?? 99)
  )

  const rows = orderedIds.map(sid => {
    const cfg      = configMap.get(sid)
    const maxMarks = Number(cfg?.max_marks ?? 0)
    const mark     = marksMap.get(sid)
    const isAbsent = mark?.is_absent ?? false
    const obtained = isAbsent ? null : (mark?.obtained_marks !== undefined ? Number(mark.obtained_marks) : null)
    const p        = obtained !== null ? calcPct(obtained, maxMarks) : null
    return {
      subject:       nameMap.get(sid) ?? 'Unknown',
      max_marks:     maxMarks,
      obtained_marks:obtained,
      is_absent:     isAbsent,
      percentage:    p,
      grade:         calcGrade(p, scales),
    }
  })

  const subjMax      = rows.reduce((s, r) => s + r.max_marks, 0)
  const subjObtained = rows.reduce((s, r) => s + (r.obtained_marks ?? 0), 0)

  // Behaviour (student report only)
  let behaviour: any[] | null = null
  const { data: beh } = await supabase
    .from('student_exam_behaviour')
    .select('cleanliness, discipline, punctuality, regularity')
    .eq('student_id', student.student_id)
    .eq('exam_id', exam.id)
    .maybeSingle()

  if (beh) {
    behaviour = (['cleanliness','discipline','punctuality','regularity'] as const).map(key => {
      const val = beh[key] !== null ? Number(beh[key]) : null
      const p   = val !== null ? calcPct(val, 25) : null
      return { title: key.charAt(0).toUpperCase() + key.slice(1), max: 25, obtained: val, percentage: p, grade: calcGrade(p, scales) }
    })
  }

  const behMax      = behaviour ? 100 : 0
  const behObtained = behaviour ? behaviour.reduce((s, b) => s + (b.obtained ?? 0), 0) : 0
  const grandMax     = subjMax + behMax
  const grandObtained= subjObtained + behObtained
  const grandPct     = grandMax > 0 ? calcPct(grandObtained, grandMax) : null

  const { data: att } = await supabase
    .from('student_exam_attendance')
    .select('total_days, days_present')
    .eq('student_id', student.student_id)
    .eq('exam_id', exam.id)
    .maybeSingle()

  return {
    template:    req.audience === 'patron' ? 'high_school_patron' : 'high_school_term',
    audience:    req.audience,
    academicYear:year.name,
    examName:    exam.name,
    examTerm:    req.examTerm,
    student:     studentInfo(student, cohort),
    rows,
    behaviour:   req.audience === 'student' ? behaviour : null,
    grand_total: { max: grandMax, obtained: grandObtained, percentage: grandPct, grade: calcGrade(grandPct, scales) },
    attendance:  att ?? null,
    remarks:     req.audience === 'patron' ? '' : null,
  }
}

// ─── Secondary Quarterly ─────────────────────────────────────────────────────

async function generateSecondaryQuarterly(
  req: ReportRequest, year: any, scales: GradeScale[], cohort: any, student: any
) {
  const { data: exam } = await supabase
    .from('exams').select('id, name')
    .eq('academic_year_id', year.id)
    .eq('term', req.examTerm)
    .eq('is_active', true)
    .maybeSingle()
  if (!exam) return { error: `No quarterly exam found for term '${req.examTerm}'` }

  const { data: components } = await supabase
    .from('exam_components').select('id, max_marks').eq('exam_id', exam.id)

  const compIds  = (components ?? []).map((c: any) => c.id as number)
  const maxMarks = Number(components?.[0]?.max_marks ?? 25)
  const subjects = await getSubjectsForSection(cohort.class_id, cohort.section_id)

  const { data: marksRows } = await supabase
    .from('student_component_marks')
    .select('subject_id, obtained_marks, is_absent')
    .eq('student_id', student.student_id)
    .in('exam_component_id', compIds.length ? compIds : [0])

  const marksMap = new Map<number, any>((marksRows ?? []).map((m: any) => [m.subject_id, m]))

  const rows = subjects.map(subj => {
    const mark     = marksMap.get(subj.id)
    const isAbsent = mark?.is_absent ?? false
    const obtained = isAbsent ? null : (mark?.obtained_marks !== undefined ? Number(mark.obtained_marks) : null)
    const p        = obtained !== null ? calcPct(obtained, maxMarks) : null
    return { subject: subj.name, max_marks: maxMarks, obtained_marks: obtained, is_absent: isAbsent, percentage: p, grade: calcGrade(p, scales) }
  })

  const totalMax      = rows.reduce((s, r) => s + r.max_marks, 0)
  const totalObtained = rows.reduce((s, r) => s + (r.obtained_marks ?? 0), 0)
  const totalPct      = totalMax > 0 ? calcPct(totalObtained, totalMax) : null

  return {
    template:    req.audience === 'patron' ? 'secondary_quarterly_patron' : 'secondary_quarterly',
    audience:    req.audience,
    academicYear:year.name,
    examName:    exam.name,
    examTerm:    req.examTerm,
    student:     studentInfo(student, cohort),
    rows,
    grand_total: { max: totalMax, obtained: totalObtained, percentage: totalPct, grade: calcGrade(totalPct, scales) },
  }
}

// ─── Secondary Term (sem1 or sem2) ──────────────────────────────────────────

async function generateSecondaryTerm(
  req: ReportRequest, year: any, scales: GradeScale[], cohort: any, student: any
) {
  const isSem1     = req.examTerm === 'sem1'
  const termLabel  = isSem1 ? '1st' : '2nd'
  const qTerm      = isSem1 ? 'q1' : 'q2'

  const [{ data: semExam }, { data: qExam }] = await Promise.all([
    supabase.from('exams').select('id, name').eq('academic_year_id', year.id).eq('term', req.examTerm).eq('is_active', true).maybeSingle(),
    supabase.from('exams').select('id').eq('academic_year_id', year.id).eq('term', qTerm).eq('is_active', true).maybeSingle(),
  ])
  if (!semExam) return { error: `No semester exam found for term '${req.examTerm}'` }

  const semExamId = semExam.id
  const allExamIds = [semExamId, ...(qExam ? [qExam.id] : [])]

  const { data: allComps } = await supabase
    .from('exam_components')
    .select('id, exam_id, name, max_marks, sort_order')
    .in('exam_id', allExamIds)
    .order('sort_order')

  const semComps  = (allComps ?? []).filter((c: any) => c.exam_id === semExamId)
  const qComps    = qExam ? (allComps ?? []).filter((c: any) => c.exam_id === qExam.id) : []
  const allCompIds= (allComps ?? []).map((c: any) => c.id as number)

  const { data: allMarks } = await supabase
    .from('student_component_marks')
    .select('subject_id, exam_component_id, obtained_marks, is_absent')
    .eq('student_id', student.student_id)
    .in('exam_component_id', allCompIds.length ? allCompIds : [0])

  const marksByKey = new Map<string, any>()
  for (const m of (allMarks ?? [])) marksByKey.set(`${m.exam_component_id}-${m.subject_id}`, m)

  const subjects  = await getSubjectsForSection(cohort.class_id, cohort.section_id)
  const hasQ      = qExam !== null && qComps.length > 0
  const qMaxMarks = Number(qComps[0]?.max_marks ?? 25)
  const semMax    = semComps.reduce((s: number, c: any) => s + Number(c.max_marks), 0)
  const termMax   = semMax + (hasQ ? qMaxMarks : 0)

  const rows = subjects.map(subj => {
    const components: any[] = []
    let semTotal = 0

    for (const comp of semComps) {
      const m        = marksByKey.get(`${comp.id}-${subj.id}`)
      const isAbsent = m?.is_absent ?? false
      const obtained = isAbsent ? null : (m?.obtained_marks !== undefined ? Number(m.obtained_marks) : null)
      semTotal += obtained ?? 0
      components.push({ label: `${termLabel} Semester ${comp.name}`, max: Number(comp.max_marks), obtained, is_absent: isAbsent, is_computed: false })
    }

    components.push({ label: 'Total Marks and Grade', max: semMax, obtained: semTotal, is_computed: true })

    let qObtained: number | null = null
    if (hasQ) {
      const m    = marksByKey.get(`${qComps[0].id}-${subj.id}`)
      qObtained  = m?.is_absent ? null : (m?.obtained_marks !== undefined ? Number(m.obtained_marks) : null)
      components.push({ label: `${termLabel} Quarter Marks`, max: qMaxMarks, obtained: qObtained, is_computed: false })
    }

    const termTotal = semTotal + (qObtained ?? 0)
    components.push({ label: `${termLabel} Term Marks`, max: termMax, obtained: termTotal, is_computed: true })

    const p = calcPct(termTotal, termMax)
    return { subject: subj.name, components, percentage: p, grade: calcGrade(p, scales) }
  })

  const { data: beh } = await supabase
    .from('student_exam_behaviour')
    .select('cleanliness, discipline, punctuality, regularity')
    .eq('student_id', student.student_id)
    .eq('exam_id', semExamId)
    .maybeSingle()

  const behaviour = ['Cleanliness','Discipline','Punctuality','Regularity'].map((title, i) => {
    const keys = ['cleanliness','discipline','punctuality','regularity'] as const
    const val  = beh ? (beh[keys[i]] !== null ? Number(beh[keys[i]]) : null) : null
    const p    = val !== null ? calcPct(val, 25) : null
    return { title, label: `${termLabel} Term`, max: 25, obtained: val, percentage: p, grade: calcGrade(p, scales) }
  })

  const { data: att } = await supabase
    .from('student_exam_attendance')
    .select('total_days, days_present')
    .eq('student_id', student.student_id)
    .eq('exam_id', semExamId)
    .maybeSingle()

  const totalSubjMax      = rows.length * termMax
  const totalSubjObtained = rows.reduce((s, r) => s + (r.components[r.components.length - 1].obtained ?? 0), 0)
  const behObtained       = behaviour.reduce((s, b) => s + (b.obtained ?? 0), 0)
  const totalMax          = totalSubjMax + 100
  const totalObtained     = totalSubjObtained + behObtained
  const overallPct        = calcPct(totalObtained, totalMax)

  return {
    template:         req.audience === 'patron' ? 'secondary_term_patron' : 'secondary_term',
    audience:         req.audience,
    academicYear:     year.name,
    examName:         `Progress Report (${termLabel} Semester) ${year.name}`,
    examTerm:         req.examTerm,
    student:          studentInfo(student, cohort),
    rows,
    behaviour,
    attendance:       att ?? null,
    total_max_marks:  totalMax,
    total_obtained:   totalObtained,
    overall_percentage:overallPct,
    overall_grade:    calcGrade(overallPct, scales),
  }
}

// ─── Secondary Annual ────────────────────────────────────────────────────────

async function generateSecondaryAnnual(
  req: ReportRequest, year: any, scales: GradeScale[], cohort: any, student: any
) {
  const { data: examsData } = await supabase
    .from('exams').select('id, name, term')
    .eq('academic_year_id', year.id)
    .in('term', ['q1','sem1','q2','sem2'])
    .eq('is_active', true)

  const byTerm = new Map<string, any>((examsData ?? []).map((e: any) => [e.term, e]))
  const sem1 = byTerm.get('sem1')
  const sem2 = byTerm.get('sem2')
  const q1   = byTerm.get('q1')
  const q2   = byTerm.get('q2')

  if (!sem1 || !sem2) return { error: 'Both semester exams are required for the annual report' }

  const examIds = [sem1.id, sem2.id, ...(q1 ? [q1.id] : []), ...(q2 ? [q2.id] : [])]
  const { data: allComps } = await supabase
    .from('exam_components')
    .select('id, exam_id, name, max_marks, sort_order')
    .in('exam_id', examIds)
    .order('sort_order')

  const byExam    = (eid: number) => (allComps ?? []).filter((c: any) => c.exam_id === eid)
  const sem1Comps = byExam(sem1.id)
  const sem2Comps = byExam(sem2.id)
  const q1Comps   = q1 ? byExam(q1.id) : []
  const q2Comps   = q2 ? byExam(q2.id) : []

  const allCompIds = (allComps ?? []).map((c: any) => c.id as number)
  const { data: allMarks } = await supabase
    .from('student_component_marks')
    .select('subject_id, exam_component_id, obtained_marks, is_absent')
    .eq('student_id', student.student_id)
    .in('exam_component_id', allCompIds.length ? allCompIds : [0])

  const marksByKey = new Map<string, any>()
  for (const m of (allMarks ?? [])) marksByKey.set(`${m.exam_component_id}-${m.subject_id}`, m)

  const subjects = await getSubjectsForSection(cohort.class_id, cohort.section_id)

  const hasQ1    = q1Comps.length > 0
  const hasQ2    = q2Comps.length > 0
  const sem1Max  = sem1Comps.reduce((s: number, c: any) => s + Number(c.max_marks), 0)
  const sem2Max  = sem2Comps.reduce((s: number, c: any) => s + Number(c.max_marks), 0)
  const q1Max    = Number(q1Comps[0]?.max_marks ?? 25)
  const q2Max    = Number(q2Comps[0]?.max_marks ?? 25)
  const term1Max = sem1Max + (hasQ1 ? q1Max : 0)
  const term2Max = sem2Max + (hasQ2 ? q2Max : 0)
  const annualMax= term1Max + term2Max

  const rows = subjects.map(subj => {
    const components: any[] = []

    // 2nd semester components (shown first in the annual report, as per sample)
    let sem2Total = 0
    for (const comp of sem2Comps) {
      const m        = marksByKey.get(`${comp.id}-${subj.id}`)
      const isAbsent = m?.is_absent ?? false
      const obtained = isAbsent ? null : (m?.obtained_marks !== undefined ? Number(m.obtained_marks) : null)
      sem2Total += obtained ?? 0
      components.push({ label: `2nd Semester ${comp.name}`, max: Number(comp.max_marks), obtained, is_absent: isAbsent, is_computed: false })
    }
    components.push({ label: 'Total Marks and Grade', max: sem2Max, obtained: sem2Total, is_computed: true })

    let q2Obtained: number | null = null
    if (hasQ2) {
      const m    = marksByKey.get(`${q2Comps[0].id}-${subj.id}`)
      q2Obtained = m?.is_absent ? null : (m?.obtained_marks !== undefined ? Number(m.obtained_marks) : null)
      components.push({ label: '2nd Quarter Marks', max: q2Max, obtained: q2Obtained, is_computed: false })
    }

    const term2Total = sem2Total + (q2Obtained ?? 0)
    components.push({ label: '1st Term Marks', max: term2Max, obtained: term2Total, is_computed: true })

    // 1st semester (computed for annual average)
    let sem1Total = 0
    for (const comp of sem1Comps) {
      const m = marksByKey.get(`${comp.id}-${subj.id}`)
      sem1Total += m?.is_absent ? 0 : Number(m?.obtained_marks ?? 0)
    }
    const q1Obtained = hasQ1
      ? (() => { const m = marksByKey.get(`${q1Comps[0].id}-${subj.id}`); return m?.is_absent ? 0 : Number(m?.obtained_marks ?? 0) })()
      : 0
    const term1Total  = sem1Total + q1Obtained
    const annualTotal = term1Total + term2Total

    components.push({ label: 'Annual Average Marks', max: annualMax, obtained: annualTotal, is_computed: true })

    const p = calcPct(annualTotal, annualMax)
    return { subject: subj.name, components, percentage: p, grade: calcGrade(p, scales) }
  })

  const { data: beh } = await supabase
    .from('student_exam_behaviour')
    .select('cleanliness, discipline, punctuality, regularity')
    .eq('student_id', student.student_id)
    .eq('exam_id', sem2.id)
    .maybeSingle()

  const behaviour = ['Cleanliness','Discipline','Punctuality','Regularity'].map((title, i) => {
    const keys = ['cleanliness','discipline','punctuality','regularity'] as const
    const val  = beh ? (beh[keys[i]] !== null ? Number(beh[keys[i]]) : null) : null
    const p    = val !== null ? calcPct(val, 25) : null
    return { title, label: 'Annual Marks', max: 25, obtained: val, percentage: p, grade: calcGrade(p, scales) }
  })

  const { data: att } = await supabase
    .from('student_exam_attendance')
    .select('total_days, days_present')
    .eq('student_id', student.student_id)
    .eq('exam_id', sem2.id)
    .maybeSingle()

  const { data: promo } = await supabase
    .from('promotion_decisions')
    .select('decision')
    .eq('student_id', student.student_id)
    .eq('from_academic_year_id', year.id)
    .maybeSingle()

  const totalMax = rows.length * annualMax + 100

  return {
    template:          req.audience === 'patron' ? 'secondary_annual_patron' : 'secondary_annual',
    audience:          req.audience,
    academicYear:      year.name,
    examName:          `Progress Report (Annual Average) ${year.name}`,
    examTerm:          'annual',
    student:           studentInfo(student, cohort),
    rows,
    behaviour,
    attendance:        att ?? null,
    total_max_marks:   totalMax,
    promotion_decision:promo?.decision ?? null,
    remarks:           '',
  }
}

// ─── Primary Rubric ───────────────────────────────────────────────────────────

async function generatePrimaryRubric(
  req: ReportRequest, year: any, cohort: any, student: any
) {
  const { data: exam } = await supabase
    .from('exams').select('id, name')
    .eq('academic_year_id', year.id)
    .eq('term', req.examTerm)
    .eq('is_active', true)
    .maybeSingle()
  if (!exam) return { error: `No exam found for term '${req.examTerm}'` }

  const [{ data: skills }, { data: grades }, { data: att }] = await Promise.all([
    supabase.from('rubric_skills').select('id, group_name, skill_text, sort_order').order('group_name').order('sort_order'),
    supabase.from('student_rubric_grades').select('rubric_skill_id, grade').eq('student_id', student.student_id).eq('exam_id', exam.id),
    supabase.from('student_exam_attendance').select('total_days, days_present').eq('student_id', student.student_id).eq('exam_id', exam.id).maybeSingle(),
  ])

  const gradeMap = new Map<number, string>((grades ?? []).map((g: any) => [g.rubric_skill_id, g.grade]))

  // Grouped for student full report
  const skillGroups: Record<string, { id: number; text: string; grade: string }[]> = {}
  for (const s of (skills ?? [])) {
    if (!skillGroups[s.group_name]) skillGroups[s.group_name] = []
    skillGroups[s.group_name].push({ id: s.id, text: s.skill_text, grade: gradeMap.get(s.id) ?? '—' })
  }

  // Flat list for patron concise report
  const patronSkills = (skills ?? []).map((s: any) => ({ title: s.skill_text, grade: gradeMap.get(s.id) ?? '—' }))

  const gradeKey = [
    { symbol: 'A+', label: 'Excellent / Always',          min: 90 },
    { symbol: 'A',  label: 'Good / Often',                min: 80 },
    { symbol: 'B',  label: 'Fair / Occasionally',         min: 70 },
    { symbol: 'C',  label: 'Just Satisfactory / Seldom',  min: 60 },
    { symbol: 'U',  label: 'Unsatisfactory / Never',      min: 40 },
  ]

  return {
    template:    req.audience === 'patron' ? 'primary_patron' : 'primary_rubric',
    audience:    req.audience,
    academicYear:year.name,
    examName:    exam.name,
    examTerm:    req.examTerm,
    student: {
      gr_no:       student.gr_no,
      full_name:   student.full_name,
      class_name:  cohort.class_name,
      section_name:cohort.section_name,
    },
    skill_groups:  req.audience === 'student' ? skillGroups : null,
    patron_skills: req.audience === 'patron'  ? patronSkills : null,
    grade_key:     gradeKey,
    attendance:    att ?? null,
    general_remark:    '',
    concluding_remarks:'',
  }
}

// ─── Dispatch ─────────────────────────────────────────────────────────────────

async function dispatch(req: ReportRequest, year: any, scales: GradeScale[], cohort: any, student: any) {
  const { level } = cohort
  const { examTerm } = req

  if (level === 'primary') return generatePrimaryRubric(req, year, cohort, student)

  if (level === 'secondary') {
    if (examTerm === 'q1' || examTerm === 'q2') return generateSecondaryQuarterly(req, year, scales, cohort, student)
    if (examTerm === 'sem1' || examTerm === 'sem2')  return generateSecondaryTerm(req, year, scales, cohort, student)
    if (examTerm === 'annual')                        return generateSecondaryAnnual(req, year, scales, cohort, student)
  }

  if (level === 'high_school') return generateHighSchool(req, year, scales, cohort, student)

  return { error: `No handler for level '${level}' + term '${examTerm}'` }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body: ReportRequest = await request.json()
    const { scope, classSectionId, studentId, examTerm } = body

    if (!classSectionId) return NextResponse.json({ error: 'classSectionId is required' }, { status: 400 })
    if (!examTerm)        return NextResponse.json({ error: 'examTerm is required' }, { status: 400 })
    if (scope === 'individual' && !studentId)
      return NextResponse.json({ error: 'studentId required for individual scope' }, { status: 400 })

    const year   = await getYear(body.academicYearId)
    if (!year)   return NextResponse.json({ error: 'No active academic year found' }, { status: 400 })

    const scales = await getScales(year.id)
    const cohort = await getCohort(classSectionId)
    if (!cohort) return NextResponse.json({ error: 'Class section not found' }, { status: 404 })

    if (scope === 'individual') {
      const student = await getStudentEnrollment(studentId!, year.id, classSectionId)
      if (!student) return NextResponse.json({ error: 'Student enrollment not found' }, { status: 404 })

      const result = await dispatch(body, year, scales, cohort, student)
      if (!result)        return NextResponse.json({ error: 'Could not generate report' }, { status: 400 })
      if ((result as any).error) return NextResponse.json({ error: (result as any).error }, { status: 400 })

      return NextResponse.json({ success: true, data: result })
    }

    // Class scope — generate one report per enrolled student
    const students = await getAllEnrolledStudents(year.id, classSectionId)
    const reports: any[] = []

    for (const student of students) {
      const result = await dispatch(body, year, scales, cohort, student)
      if (result && !(result as any).error) reports.push(result)
    }

    return NextResponse.json({ success: true, data: { reports, count: reports.length } })

  } catch (err: any) {
    console.error('Report generate error:', err)
    return NextResponse.json({ error: err?.message ?? 'Internal server error' }, { status: 500 })
  }
}