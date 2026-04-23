// import { NextResponse } from 'next/server'
// import ExcelJS from 'exceljs'

// export async function POST(request: Request) {
//   const payload = await request.json()

//   const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
//   const res = await fetch(`${baseUrl}/api/reports/generate`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(payload),
//     cache: 'no-store',
//   })

//   const json = await res.json()
//   if (!res.ok) {
//     return NextResponse.json({ error: json.error || 'Failed generating report' }, { status: 500 })
//   }

//   const data = json.data

//   const wb = new ExcelJS.Workbook()
//   const ws = wb.addWorksheet('Report')

//   ws.addRow(['Khadija Kazi Ali Memorial High School'])
//   ws.addRow(['Type', data.reportType])
//   ws.addRow(['Academic Year', data.academicYear?.name ?? '—'])
//   if (data.classLabel) ws.addRow(['Class', data.classLabel])
//   if (data.student?.name) ws.addRow(['Student', data.student.name])
//   ws.addRow([])

//   ws.addRow(['Summary'])
//   Object.entries(data.summary || {}).forEach(([k, v]) => ws.addRow([k, v ?? '—']))
//   ws.addRow([])

//   if (data.gradeDistribution) {
//     ws.addRow(['Grade Distribution'])
//     Object.entries(data.gradeDistribution).forEach(([k, v]) => ws.addRow([k, v]))
//     ws.addRow([])
//   }

//   if (data.rows?.length) {
//     ws.addRow(['Roll No', 'Student', 'Overall %', 'Grade', 'Result'])
//     for (const r of data.rows) {
//       ws.addRow([r.roll_number ?? '', r.name, r.overall_percentage ?? '', r.overall_grade ?? '', r.overall_result ?? ''])
//     }
//   }

//   const buf = await wb.xlsx.writeBuffer()
//   return new NextResponse(buf as any, {
//     status: 200,
//     headers: {
//       'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
//       'Content-Disposition': `attachment; filename="report.xlsx"`,
//     },
//   })
// }

import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const origin = new URL(req.url).origin
    const genRes = await fetch(`${origin}/api/reports/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    })

    const genJson = await genRes.json().catch(() => ({}))
    if (!genRes.ok) return NextResponse.json({ error: genJson.error || 'Generate failed' }, { status: 400 })

    const vm = genJson.data

    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Report')

    if (vm.template === 'preliminary') {
      ws.addRow([vm.examName, 'Result Card'])
      ws.addRow([])
      ws.addRow(['Name', vm.student.full_name])
      ws.addRow(['Class', vm.student.class_name ?? '', 'Section', vm.student.section_name ?? ''])
      ws.addRow(['Roll', vm.student.roll_number ?? ''])
      ws.addRow([])

      ws.addRow(['Subject', 'Max', 'Obtained', '%', 'Grade'])
      for (const r of vm.rows || []) {
        ws.addRow([r.subject, r.max, r.obtained ?? '', r.pct ?? '', r.grade ?? ''])
      }

      ws.addRow([])
      ws.addRow(['Total Max', vm.totals.maxTotal])
      ws.addRow(['Total Obtained', vm.totals.obtainedTotal])
      ws.addRow(['Overall %', vm.totals.pct ?? ''])
      ws.addRow(['Overall Grade', vm.totals.grade ?? ''])
    } else if (vm.template === 'annual_average') {
      ws.addRow([vm.examName, 'Annual Average'])
      ws.addRow([])
      ws.addRow(['Name', vm.student.full_name])
      ws.addRow(['Class', vm.student.class_name ?? '', 'Section', vm.student.section_name ?? ''])
      ws.addRow(['Roll', vm.student.roll_number ?? ''])
      ws.addRow([])

      for (const b of vm.blocks || []) {
        ws.addRow([b.subject, '', '', 'Pct', b.pct ?? '', 'Grade', b.grade ?? ''])
        ws.addRow(['Component', 'Max', 'Obtained'])
        for (const c of b.components || []) {
          ws.addRow([c.label, c.max, c.is_absent ? 'Ab' : c.obtained ?? ''])
        }
        ws.addRow([])
      }

      ws.addRow(['Overall %', vm.overall?.pct ?? '', 'Overall Grade', vm.overall?.grade ?? ''])
    } else if (vm.template === 'rubric') {
      const rubric = vm.rubric || []
      const columns = ['Roll', 'Student', ...rubric.map((skill: any) => skill.skill_text)]

      ws.addRow([vm.examName, 'Rubric Report'])
      ws.addRow(['Class', vm.cohortLabel ?? ''])
      ws.addRow([])
      ws.addRow(columns)

      for (const row of vm.students || []) {
        ws.addRow([
          row.student?.roll_number ?? '',
          row.student?.full_name ?? '',
          ...rubric.map((skill: any) => row.grades?.[String(skill.id)] ?? ''),
        ])
      }
    } else if (vm.template === 'annual_summary') {
      ws.addRow(['Academic Year', vm.academicYear?.name ?? ''])
      ws.addRow([])
      ws.addRow(['Total Students', vm.summary?.totalStudents ?? 0])
      ws.addRow(['Average Score', vm.summary?.averageScore ?? ''])
      ws.addRow(['Pass Count', vm.summary?.passCount ?? 0])
      ws.addRow(['Fail Count', vm.summary?.failCount ?? 0])
      ws.addRow([])

      ws.addRow(['Grade', 'Count'])
      for (const [grade, count] of Object.entries(vm.gradeDistribution ?? {})) {
        ws.addRow([grade, count])
      }

      ws.addRow([])
      ws.addRow(['Class/Section', 'Total Students', 'Average Score', 'Pass Count', 'Fail Count'])
      for (const cohort of vm.cohorts || []) {
        ws.addRow([
          cohort.label,
          cohort.totalStudents ?? 0,
          cohort.averageScore ?? '',
          cohort.passCount ?? 0,
          cohort.failCount ?? 0,
        ])
      }
    } else {
      return NextResponse.json({ error: 'Excel export not implemented for this template.' }, { status: 400 })
    }

    ws.columns.forEach((c) => (c.width = 22))

    const buffer = await wb.xlsx.writeBuffer()

    return new NextResponse(Buffer.from(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="report.xlsx"',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
