import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'

export async function POST(request: Request) {
  const payload = await request.json()

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/reports/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    cache: 'no-store',
  })

  const json = await res.json()
  if (!res.ok) {
    return NextResponse.json({ error: json.error || 'Failed generating report' }, { status: 500 })
  }

  const data = json.data

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Report')

  ws.addRow(['Khadija Kazi Ali Memorial High School'])
  ws.addRow(['Type', data.reportType])
  ws.addRow(['Academic Year', data.academicYear?.name ?? '—'])
  if (data.classLabel) ws.addRow(['Class', data.classLabel])
  if (data.student?.name) ws.addRow(['Student', data.student.name])
  ws.addRow([])

  ws.addRow(['Summary'])
  Object.entries(data.summary || {}).forEach(([k, v]) => ws.addRow([k, v ?? '—']))
  ws.addRow([])

  if (data.gradeDistribution) {
    ws.addRow(['Grade Distribution'])
    Object.entries(data.gradeDistribution).forEach(([k, v]) => ws.addRow([k, v]))
    ws.addRow([])
  }

  if (data.rows?.length) {
    ws.addRow(['Roll No', 'Student', 'Overall %', 'Grade', 'Result'])
    for (const r of data.rows) {
      ws.addRow([r.roll_number ?? '', r.name, r.overall_percentage ?? '', r.overall_grade ?? '', r.overall_result ?? ''])
    }
  }

  const buf = await wb.xlsx.writeBuffer()
  return new NextResponse(buf as any, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="report.xlsx"`,
    },
  })
}
