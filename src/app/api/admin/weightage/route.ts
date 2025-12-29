// import { NextResponse } from 'next/server';
// import { createClient } from '@supabase/supabase-js';

// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!, 
//   { auth: { persistSession: false } }
// );

// export async function GET() {
//   // Join classes with their config
//   const { data, error } = await supabase
//     .from('classes')
//     .select('id, name, class_grading_config(weight_1, weight_2, weight_mid, weight_final)');
  
//   if(error) return NextResponse.json({error: error.message});

//   const formatted = data.map((c: any) => ({
//     class_id: c.id,
//     className: c.name,
//     weight_1: c.class_grading_config?.[0]?.weight_1 ?? 25,
//     weight_2: c.class_grading_config?.[0]?.weight_2 ?? 25,
//     weight_mid: c.class_grading_config?.[0]?.weight_mid ?? 25,
//     weight_final: c.class_grading_config?.[0]?.weight_final ?? 25,
//   }));

//   return NextResponse.json({ success: true, data: formatted });
// }

// export async function POST(request: Request) {
//   const body = await request.json();
//   const { class_id, weight_1, weight_2, weight_mid, weight_final } = body;

//   const { error } = await supabase
//     .from('class_grading_config')
//     .upsert({ class_id, weight_1, weight_2, weight_mid, weight_final }, { onConflict: 'class_id' });

//   if(error) return NextResponse.json({error: error.message}, {status: 500});
//   return NextResponse.json({ success: true });
// }

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, 
  { auth: { persistSession: false } }
);

export async function GET() {
  // Join classes with their config
  const { data, error } = await supabase
    .from('classes')
    .select('id, name, class_grading_config(weight_1, weight_2, weight_mid, weight_final)')
    .order('id');
  
  if(error) {
    console.error('Supabase error:', error);
    return NextResponse.json({error: error.message}, {status: 500});
  }

  // Format the data safely
  const formatted = data.map((c: any) => ({
    class_id: c.id,
    className: c.name,
    // Use default 25 if the config is null or undefined
    weight_1: c.class_grading_config?.[0]?.weight_1 ?? 25,
    weight_2: c.class_grading_config?.[0]?.weight_2 ?? 25,
    weight_mid: c.class_grading_config?.[0]?.weight_mid ?? 25,
    weight_final: c.class_grading_config?.[0]?.weight_final ?? 25,
  }));

  return NextResponse.json({ success: true, data: formatted });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { class_id, weight_1, weight_2, weight_mid, weight_final } = body;

    // Save the new weights
    const { error } = await supabase
      .from('class_grading_config')
      .upsert({ 
        class_id, 
        weight_1, 
        weight_2, 
        weight_mid, 
        weight_final 
      }, { onConflict: 'class_id' });

    if(error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Save error:', error);
    return NextResponse.json({error: (error as Error).message}, {status: 500});
  }
}