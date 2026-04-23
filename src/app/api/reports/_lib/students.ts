import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function fetchStudentContext(studentId: number, academicYearId?: number) {
  if (academicYearId) {
    const { data, error } = await supabase
      .from('student_enrollments')
      .select(`
        roll_number,
        students(id, full_name, father_name),
        academic_years(name),
        class_sections(
          id,
          classes(name),
          sections(name)
        )
      `)
      .eq('student_id', studentId)
      .eq('academic_year_id', academicYearId)
      .maybeSingle()

    if (error) throw new Error(error.message)

    const enrollment = data ?? null
    const studentRow = Array.isArray(enrollment?.students) ? enrollment.students[0] : enrollment?.students
    const classSectionRow = Array.isArray(enrollment?.class_sections) ? enrollment.class_sections[0] : enrollment?.class_sections
    const academicYearRow = Array.isArray(enrollment?.academic_years) ? enrollment.academic_years[0] : enrollment?.academic_years

    if (studentRow?.id) {
      return {
        id: studentRow.id as number,
        full_name: studentRow.full_name as string,
        father_name: (studentRow.father_name as string | null) ?? null,
        roll_number: (enrollment?.roll_number as string | null) ?? null,
        class_name: (classSectionRow as any)?.classes?.name ?? null,
        section_name: (classSectionRow as any)?.sections?.name ?? null,
        academic_year_name: (academicYearRow as any)?.name ?? null,
      }
    }
  }

  const { data: s, error: sErr } = await supabase
    .from('students')
    .select('id, full_name, father_name, roll_number')
    .eq('id', studentId)
    .single()

  if (sErr) throw new Error(sErr.message)

  return {
    id: s.id as number,
    full_name: s.full_name as string,
    father_name: (s.father_name as string | null) ?? null,
    roll_number: (s.roll_number as string | null) ?? null,
    class_name: null,
    section_name: null,
    academic_year_name: null,
  }
}
