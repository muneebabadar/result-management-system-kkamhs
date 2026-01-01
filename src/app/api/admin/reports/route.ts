import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('classId')

    if (!classId) {
      return NextResponse.json({ error: 'Class ID is required' }, { status: 400 })
    }

    // 1. Initialize Supabase with Service Role Key (Secure & Server-side only)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // 2. Fetch Students and their Grades
    const { data, error } = await supabase
      .from('student_enrollments')
      .select(`
        student_id,
        roll_number,
        students (
          full_name,
          student_grades (
            marks_obtained,
            subjects ( name )
          )
        )
      `)
      .eq('class_section_id', classId)
      .eq('status', 'active')

    if (error) {
      console.error('Supabase error:', error)
      throw error
    }

    console.log('Fetched data:', data) // DEBUG

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
