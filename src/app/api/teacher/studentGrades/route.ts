import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

// GET: Fetch Students & Grades for a specific Assignment ID
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const assignmentId = searchParams.get('assignment_id');

  if (!assignmentId) return NextResponse.json({ error: 'Missing Assignment ID' }, { status: 400 });

  try {
    // 1. Get Assignment Details AND Grading Config
    const { data: assignment } = await supabase
      .from('teacher_assignments')
      // We add class_grading_config to the select query here
      .select('*, classes(name, class_grading_config(weight_1, weight_2, weight_mid, weight_final)), sections(id, name), subjects(name)')
      .eq('id', assignmentId)
      .single();

    if (!assignment) throw new Error('Class not found');

    // 2. Get Students in that Section AND their grades for this assignment
    const { data: students, error } = await supabase
      .from('students')
      .select(`
        id, name, roll_number,
        grades ( assessment_1, assessment_2, midterm, final_exam )
      `)
      .eq('section_id', assignment.sections.id)
      .eq('grades.assignment_id', assignmentId); // Only get grades for THIS subject

    if (error) throw error;

    // 3. Format data for frontend
    const formattedStudents = students.map((s: any) => {
      // Grades comes as an array, take the first one or default to 0
      const g = s.grades?.[0] || { assessment_1: 0, assessment_2: 0, midterm: 0, final_exam: 0 };
      return {
        studentId: s.id,
        name: s.name,
        ...g
      };
    });

    // Extract weights (default to 25 if missing)
    // We look into the nested array because of the join
    const weights = assignment.classes.class_grading_config?.[0] || { 
        weight_1: 25, weight_2: 25, weight_mid: 25, weight_final: 25 
    };

    return NextResponse.json({
      success: true,
      className: `${assignment.classes.name} - ${assignment.sections.name}`,
      subjectName: assignment.subjects.name,
      weights: weights, 
      students: formattedStudents
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// POST: Save Grades
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { assignmentId, grades } = body;

    // We use 'upsert' to either insert new grades or update existing ones
    const updates = grades.map((g: any) => ({
      student_id: g.studentId,
      assignment_id: assignmentId,
      assessment_1: g.assessment_1,
      assessment_2: g.assessment_2,
      midterm: g.midterm,
      final_exam: g.final_exam
    }));

    const { error } = await supabase
      .from('grades')
      .upsert(updates, { onConflict: 'student_id, assignment_id' });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}