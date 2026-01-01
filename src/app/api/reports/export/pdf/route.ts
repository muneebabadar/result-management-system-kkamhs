import { NextResponse } from 'next/server'
import PDFDocument from 'pdfkit'
import { Readable } from 'stream'

function bufferFromStream(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    stream.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
  })
}

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

  const doc = new PDFDocument({ margin: 40 })
  doc.fontSize(16).text('Khadija Kazi Ali Memorial High School', { align: 'center' })
  doc.moveDown(0.4)
  doc.fontSize(12).text('Report', { align: 'center' })
  doc.moveDown()

  doc.fontSize(10)
  doc.text(`Type: ${data.reportType}`)
  doc.text(`Academic Year: ${data.academicYear?.name ?? '—'}`)
  if (data.classLabel) doc.text(`Class: ${data.classLabel}`)
  if (data.student?.name) doc.text(`Student: ${data.student.name}`)
  if (data.enrollment?.roll_number) doc.text(`Roll No: ${data.enrollment.roll_number}`)
  doc.moveDown()

  doc.fontSize(12).text('Summary', { underline: true })
  doc.fontSize(10)
  Object.entries(data.summary || {}).forEach(([k, v]) => doc.text(`${k}: ${v ?? '—'}`))
  doc.moveDown()

  if (data.gradeDistribution) {
    doc.fontSize(12).text('Grade Distribution', { underline: true })
    doc.fontSize(10)
    Object.entries(data.gradeDistribution).forEach(([k, v]) => doc.text(`${k}: ${v}`))
    doc.moveDown()
  }

  // For class-wise rows, print a small table-like section
  if (data.rows?.length) {
    doc.fontSize(12).text('Students', { underline: true })
    doc.fontSize(10)
    for (const r of data.rows) {
      doc.text(`${r.roll_number ?? ''}  ${r.name}  ${r.overall_percentage ?? '—'}%  ${r.overall_grade ?? '—'}`)
    }
  }

  doc.end()
  const buf = await bufferFromStream(doc as any)

  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="report.pdf"`,
    },
  })
}
