// import { NextResponse } from 'next/server'
// import PDFDocument from 'pdfkit'
// import { Readable } from 'stream'

// function bufferFromStream(stream: Readable): Promise<Buffer> {
//   return new Promise((resolve, reject) => {
//     const chunks: Buffer[] = []
//     stream.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
//     stream.on('end', () => resolve(Buffer.concat(chunks)))
//     stream.on('error', reject)
//   })
// }

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

//   const doc = new PDFDocument({ margin: 40 })
//   doc.fontSize(16).text('Khadija Kazi Ali Memorial High School', { align: 'center' })
//   doc.moveDown(0.4)
//   doc.fontSize(12).text('Report', { align: 'center' })
//   doc.moveDown()

//   doc.fontSize(10)
//   doc.text(`Type: ${data.reportType}`)
//   doc.text(`Academic Year: ${data.academicYear?.name ?? '—'}`)
//   if (data.classLabel) doc.text(`Class: ${data.classLabel}`)
//   if (data.student?.name) doc.text(`Student: ${data.student.name}`)
//   if (data.enrollment?.roll_number) doc.text(`Roll No: ${data.enrollment.roll_number}`)
//   doc.moveDown()

//   doc.fontSize(12).text('Summary', { underline: true })
//   doc.fontSize(10)
//   Object.entries(data.summary || {}).forEach(([k, v]) => doc.text(`${k}: ${v ?? '—'}`))
//   doc.moveDown()

//   if (data.gradeDistribution) {
//     doc.fontSize(12).text('Grade Distribution', { underline: true })
//     doc.fontSize(10)
//     Object.entries(data.gradeDistribution).forEach(([k, v]) => doc.text(`${k}: ${v}`))
//     doc.moveDown()
//   }

//   // For class-wise rows, print a small table-like section
//   if (data.rows?.length) {
//     doc.fontSize(12).text('Students', { underline: true })
//     doc.fontSize(10)
//     for (const r of data.rows) {
//       doc.text(`${r.roll_number ?? ''}  ${r.name}  ${r.overall_percentage ?? '—'}%  ${r.overall_grade ?? '—'}`)
//     }
//   }

//   doc.end()
//   const buf = await bufferFromStream(doc as any)

//   return new NextResponse(buf, {
//     status: 200,
//     headers: {
//       'Content-Type': 'application/pdf',
//       'Content-Disposition': `attachment; filename="report.pdf"`,
//     },
//   })
// }

import { NextResponse } from 'next/server'
import PDFDocument from 'pdfkit'
import { Readable } from 'stream'

function bufferFromStream(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    stream.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
  })
}

function addKeyValue(doc: any, label: string, value: string | number | null | undefined) {
  doc.font('Helvetica-Bold').text(`${label}: `, { continued: true })
  doc.font('Helvetica').text(value ?? '-')
}

function addSectionTitle(doc: any, title: string) {
  doc.moveDown(0.5)
  doc.font('Helvetica-Bold').fontSize(13).text(title)
  doc.moveDown(0.3)
  doc.font('Helvetica').fontSize(10)
}

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
    const doc = new PDFDocument({ margin: 40, size: 'A4' })

    doc.font('Helvetica-Bold').fontSize(16).text('Khadija Kazi Ali Memorial High School', { align: 'center' })
    doc.moveDown(0.4)
    doc.fontSize(12).text('Report', { align: 'center' })
    doc.moveDown()
    doc.font('Helvetica').fontSize(10)

    if (vm.template === 'preliminary') {
      addKeyValue(doc, 'Exam', vm.examName)
      addKeyValue(doc, 'Student', vm.student?.full_name)
      addKeyValue(doc, 'Father', vm.student?.father_name)
      addKeyValue(doc, 'Class', `${vm.student?.class_name ?? ''} ${vm.student?.section_name ?? ''}`.trim())
      addKeyValue(doc, 'Roll No', vm.student?.roll_number)

      addSectionTitle(doc, 'Marks')
      for (const row of vm.rows || []) {
        doc.text(
          `${row.subject}: ${row.obtained ?? '-'} / ${row.max} | % ${row.pct ?? '-'} | Grade ${row.grade ?? '-'}`
        )
      }

      addSectionTitle(doc, 'Overall')
      addKeyValue(doc, 'Total Marks', vm.totals?.maxTotal)
      addKeyValue(doc, 'Obtained', vm.totals?.obtainedTotal)
      addKeyValue(doc, 'Percentage', vm.totals?.pct)
      addKeyValue(doc, 'Grade', vm.totals?.grade)
    } else if (vm.template === 'annual_average') {
      addKeyValue(doc, 'Exam', vm.examName)
      addKeyValue(doc, 'Student', vm.student?.full_name)
      addKeyValue(doc, 'Father', vm.student?.father_name)
      addKeyValue(doc, 'Class', `${vm.student?.class_name ?? ''} ${vm.student?.section_name ?? ''}`.trim())
      addKeyValue(doc, 'Roll No', vm.student?.roll_number)

      addSectionTitle(doc, 'Subjects')
      for (const block of vm.blocks || []) {
        doc.font('Helvetica-Bold').text(`${block.subject} | % ${block.pct ?? '-'} | Grade ${block.grade ?? '-'}`)
        doc.font('Helvetica')
        for (const component of block.components || []) {
          doc.text(
            `  ${component.label}: ${component.is_absent ? 'Ab' : component.obtained ?? '-'} / ${component.max}`
          )
        }
        doc.moveDown(0.3)
      }

      addSectionTitle(doc, 'Overall')
      addKeyValue(doc, 'Percentage', vm.overall?.pct)
      addKeyValue(doc, 'Grade', vm.overall?.grade)
      addKeyValue(doc, 'Attendance', `${vm.attendance?.days_present ?? '-'} / ${vm.attendance?.total_days ?? '-'}`)
    } else if (vm.template === 'rubric') {
      addKeyValue(doc, 'Exam', vm.examName)
      addKeyValue(doc, 'Class', vm.cohortLabel)

      addSectionTitle(doc, 'Rubric Overview')
      for (const entry of vm.students || []) {
        doc.font('Helvetica-Bold').text(
          `${entry.student?.roll_number ?? '-'} - ${entry.student?.full_name ?? 'Unknown'}`
        )
        doc.font('Helvetica')
        for (const skill of vm.rubric || []) {
          doc.text(`${skill.group_name} / ${skill.skill_text}: ${entry.grades?.[String(skill.id)] ?? '-'}`)
        }
        doc.moveDown(0.4)
      }
    } else if (vm.template === 'annual_summary') {
      addKeyValue(doc, 'Academic Year', vm.academicYear?.name)

      addSectionTitle(doc, 'Summary')
      addKeyValue(doc, 'Total Students', vm.summary?.totalStudents)
      addKeyValue(doc, 'Average Score', vm.summary?.averageScore)
      addKeyValue(doc, 'Pass Count', vm.summary?.passCount)
      addKeyValue(doc, 'Fail Count', vm.summary?.failCount)

      addSectionTitle(doc, 'Grade Distribution')
      for (const [grade, count] of Object.entries(vm.gradeDistribution ?? {})) {
        doc.text(`${grade}: ${count}`)
      }

      addSectionTitle(doc, 'Class-wise Breakdown')
      for (const cohort of vm.cohorts || []) {
        doc.text(
          `${cohort.label}: ${cohort.totalStudents} students | Avg ${cohort.averageScore ?? '-'} | Pass ${cohort.passCount ?? 0} | Fail ${cohort.failCount ?? 0}`
        )
      }
    } else {
      return NextResponse.json({ error: 'PDF export not implemented for this template.' }, { status: 400 })
    }

    const pdfPromise = bufferFromStream(doc as unknown as Readable)
    doc.end()
    const pdf = await pdfPromise

    return new NextResponse(pdf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="report.pdf"`,
      },
    })
  } catch (err: unknown) {
  console.error('[PDF export error]', err)
  return NextResponse.json(
    { error: err instanceof Error ? err.message : 'Internal server error' },
    { status: 500 }
  )
}
}
