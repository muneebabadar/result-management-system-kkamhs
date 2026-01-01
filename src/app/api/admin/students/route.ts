import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('classId')

    if (!classId) {
      return NextResponse.json({ error: 'Class ID is required' }, { status: 400 })
    }

    // Use Service Role Key - bypasses RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const { data, error } = await supabase
      .from('student_enrollments')
      .select(`
        student_id,
        students ( id, full_name )
      `)
      .eq('class_section_id', classId)
      .eq('status', 'active')
      .order('student_id')
    
    if (error) throw error

    // Format the data
    const formattedStudents = data.map((item: any) => ({
      id: item.students.id,
      full_name: item.students.full_name
    }))

    return NextResponse.json({ success: true, data: formattedStudents })
  } catch (error: any) {
    console.error('Error fetching students:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}