import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase (Same as your users route)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function GET(request: Request) {
  try {
    // 1. Get the teacher ID from the URL
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('id');

    if (!teacherId) {
      return NextResponse.json(
        { error: 'Teacher ID is required' },
        { status: 400 }
      );
    }

    // 2. Fetch data (Join with classes, sections, subjects)
    const { data, error } = await supabase
      .from('teacher_assignments')
      .select(`
        id,
        classes ( name ),
        sections ( name ),
        subjects ( name )
      `)
      .eq('teacher_id', teacherId);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 3. Flatten the data for easier use in the frontend
    const formattedData = data.map((item: any) => ({
      id: item.id,
      className: item.classes?.name,
      section: item.sections?.name,
      subject: item.subjects?.name,
    }));

    return NextResponse.json({ success: true, data: formattedData }, { status: 200 });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}