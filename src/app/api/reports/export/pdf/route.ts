// /src/app/api/reports/export/pdf/route.ts
//
// Requires: npm install puppeteer
// For Vercel/serverless: npm install puppeteer-core @sparticuz/chromium
// and swap the launch call per the comment at the bottom of this file.

import { NextResponse } from 'next/server'
import puppeteer        from 'puppeteer'

// ─── Shared HTML Scaffolding ─────────────────────────────────────────────────

const BASE_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 11px; background: #fff; color: #000; }
  .page {
    max-width: 680px; margin: 0 auto;
    padding: 18px 20px;
    border: 2px solid #000;
    min-height: 270mm;
    position: relative;
  }
  .page-break { page-break-after: always; }
  .header { text-align: center; margin-bottom: 12px; }
  .school-name { font-size: 14px; font-weight: bold; letter-spacing: 0.3px; margin-bottom: 3px; }
  .exam-title  { font-size: 12px; margin-bottom: 2px; }
  .info-block  { margin-bottom: 10px; }
  .info-row    { display: flex; justify-content: space-between; margin-bottom: 3px; }
  .info-pair   { display: flex; gap: 5px; }
  .lbl         { font-weight: bold; min-width: 88px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  th, td { border: 1px solid #000; padding: 3px 6px; text-align: center; font-size: 11px; }
  th { background: #e8e8e8; font-weight: bold; }
  .left { text-align: left; }
  .computed { background: #f4f4f4; font-weight: bold; }
  .total-row { font-weight: bold; background: #e8e8e8; }
  .absent { font-style: italic; color: #555; }
  .att-line { margin: 8px 0; font-size: 11px; }
  .sigs {
    display: flex; justify-content: space-between;
    margin-top: 36px; padding-top: 0;
  }
  .sig { text-align: center; min-width: 140px; }
  .sig-line { border-top: 1px solid #000; padding-top: 3px; font-size: 10px; margin-top: 30px; }
  .remarks-field { margin-top: 12px; }
  .remarks-field .underline { border-bottom: 1px solid #000; min-height: 18px; margin-top: 2px; }
  .grade-key { margin-top: 10px; border: 1px solid #000; padding: 6px 8px; font-size: 10px; }
  .grade-key-title { font-weight: bold; margin-bottom: 4px; }
  .grade-key-row { display: flex; gap: 10px; flex-wrap: wrap; }
  .grade-key-item span:first-child { font-weight: bold; min-width: 22px; display: inline-block; }
  .skill-groups { display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; }
  .skill-group  { margin-bottom: 8px; }
  .skill-group-title { font-weight: bold; background: #e8e8e8; padding: 2px 4px; margin-bottom: 2px; }
  .skill-row { display: flex; justify-content: space-between; border-bottom: 1px solid #ddd; padding: 1px 4px; }
  .nb { font-size: 9.5px; font-style: italic; margin-top: 6px; }
`

function wrap(inner: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>${BASE_CSS}</style></head>
<body>${inner}</body>
</html>`
}

function header(vm: any, subtitle?: string): string {
  return `
  <div class="header">
    <div class="school-name">Khadija Kazi Ali Memorial Higher Secondary School</div>
    <div class="exam-title">Progress Report ${vm.academicYear}</div>
    ${subtitle ? `<div class="exam-title">${subtitle}</div>` : ''}
  </div>`
}

function signatures(): string {
  return `
  <div class="sigs">
    <div class="sig"><div class="sig-line">Class Teacher Signature</div></div>
    <div class="sig"><div class="sig-line">Date</div></div>
    <div class="sig"><div class="sig-line">Principal Signature</div></div>
  </div>`
}

function attendance(att: any): string {
  return `<div class="att-line">Attendance out of <strong>${att?.total_days ?? '___'}</strong> days &nbsp;—&nbsp; Present: <strong>${att?.days_present ?? '___'}</strong></div>`
}

function fmtVal(v: number | null, isAbsent?: boolean): string {
  if (isAbsent) return '<span class="absent">Ab</span>'
  return v !== null ? String(v) : '—'
}

// ─── High School (student + patron) ─────────────────────────────────────────

function htmlHighSchool(vm: any): string {
  const isPatron  = vm.audience === 'patron'
  const subtitle  = isPatron ? 'Patron Report' : vm.examName

  const studentBlock = `
  <div class="info-block">
    <div class="info-row">
      <div class="info-pair"><span class="lbl">G.R. No.:</span><span>${vm.student.gr_no || '____'}</span></div>
      <div class="info-pair"><span class="lbl">Roll No.:</span><span>${vm.student.roll_number || '____'}</span></div>
    </div>
    <div class="info-row">
      <div class="info-pair"><span class="lbl">Student Name:</span><span>${vm.student.full_name}</span></div>
      <div class="info-pair"><span class="lbl">Class:</span><span>${vm.student.class_name}</span></div>
    </div>
    <div class="info-row">
      <div class="info-pair"><span class="lbl">Father's Name:</span><span>${vm.student.father_name}</span></div>
      <div class="info-pair"><span class="lbl">Section:</span><span>${vm.student.section_name}</span></div>
    </div>
  </div>`

  const subjectRows = vm.rows.map((r: any) => `
    <tr>
      <td class="left">${r.subject}</td>
      <td>${r.max_marks}</td>
      <td>${fmtVal(r.obtained_marks, r.is_absent)}</td>
      <td>${r.percentage !== null ? r.percentage : '—'}</td>
      <td>${r.grade}</td>
    </tr>`).join('')

  const behaviourRows = (!isPatron && vm.behaviour)
    ? vm.behaviour.map((b: any) => `
    <tr>
      <td class="left">${b.title}</td>
      <td>${b.max}</td>
      <td>${fmtVal(b.obtained)}</td>
      <td>${b.percentage !== null ? b.percentage : '—'}</td>
      <td>${b.grade}</td>
    </tr>`).join('')
    : ''

  const table = `
  <table>
    <thead>
      <tr>
        <th class="left">Subject</th>
        <th>Maximum Marks</th>
        <th>Marks Obtained</th>
        <th>Percentage</th>
        <th>Grade</th>
      </tr>
    </thead>
    <tbody>
      ${subjectRows}
      ${behaviourRows}
      <tr class="total-row">
        <td class="left">Grand Total</td>
        <td>${vm.grand_total.max}</td>
        <td>${vm.grand_total.obtained}</td>
        <td>${vm.grand_total.percentage !== null ? vm.grand_total.percentage : '—'}</td>
        <td>${vm.grand_total.grade}</td>
      </tr>
    </tbody>
  </table>`

  const remarksBlock = isPatron
    ? `<div class="remarks-field"><strong>Remarks:</strong><div class="underline">&nbsp;</div></div>
       <p class="nb">N.B. The Adoptee will be updated with the progress of the child through mail twice a year in December &amp; July.</p>`
    : ''

  return `
  <div class="page">
    ${header(vm, subtitle)}
    ${studentBlock}
    ${table}
    ${attendance(vm.attendance)}
    ${remarksBlock}
    ${signatures()}
  </div>`
}

// ─── Secondary Quarterly ─────────────────────────────────────────────────────

function htmlSecondaryQuarterly(vm: any): string {
  const rows = vm.rows.map((r: any) => `
    <tr>
      <td class="left">${r.subject}</td>
      <td>${r.max_marks}</td>
      <td>${fmtVal(r.obtained_marks, r.is_absent)}</td>
      <td>${r.percentage !== null ? r.percentage : '—'}</td>
      <td>${r.grade}</td>
    </tr>`).join('')

  return `
  <div class="page">
    ${header(vm, vm.examName)}
    <div class="info-block">
      <div class="info-row">
        <div class="info-pair"><span class="lbl">G.R. No.:</span><span>${vm.student.gr_no || '____'}</span></div>
        <div class="info-pair"><span class="lbl">Roll No.:</span><span>${vm.student.roll_number || '____'}</span></div>
      </div>
      <div class="info-row">
        <div class="info-pair"><span class="lbl">Student Name:</span><span>${vm.student.full_name}</span></div>
        <div class="info-pair"><span class="lbl">Class:</span><span>${vm.student.class_name}</span></div>
      </div>
      <div class="info-row">
        <div class="info-pair"><span class="lbl">Father's Name:</span><span>${vm.student.father_name}</span></div>
        <div class="info-pair"><span class="lbl">Section:</span><span>${vm.student.section_name}</span></div>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th class="left">Subject</th>
          <th>Maximum Marks</th>
          <th>Marks Obtained</th>
          <th>Percentage</th>
          <th>Grade</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        <tr class="total-row">
          <td class="left">Grand Total</td>
          <td>${vm.grand_total.max}</td>
          <td>${vm.grand_total.obtained}</td>
          <td>${vm.grand_total.percentage !== null ? vm.grand_total.percentage : '—'}</td>
          <td>${vm.grand_total.grade}</td>
        </tr>
      </tbody>
    </table>
    ${attendance(null)}
    ${signatures()}
  </div>`
}

// ─── Secondary Term / Annual (complex rowspan table) ─────────────────────────

function htmlSecondaryComplex(vm: any): string {
  const isAnnual = vm.template === 'secondary_annual'

  const subjectRows = vm.rows.flatMap((row: any) => {
    const rowCount = row.components.length
    return row.components.map((comp: any, ci: number) => {
      const subjectCell = ci === 0
        ? `<td rowspan="${rowCount}" style="vertical-align:middle;font-weight:bold;" class="left">${row.subject}</td>`
        : ''
      const pctCell = ci === 0
        ? `<td rowspan="${rowCount}" style="vertical-align:middle;">${row.percentage !== null ? row.percentage : '—'}</td>`
        : ''
      const gradeCell = ci === 0
        ? `<td rowspan="${rowCount}" style="vertical-align:middle;">${row.grade}</td>`
        : ''
      const tdClass = comp.is_computed ? ' class="computed left"' : ' class="left"'
      return `<tr>
        ${subjectCell}
        <td${tdClass}>${comp.label}</td>
        <td>${comp.max}</td>
        <td>${comp.obtained !== null ? comp.obtained : '—'}</td>
        ${pctCell}
        ${gradeCell}
      </tr>`
    })
  }).join('')

  const behaviourRows = vm.behaviour.map((b: any) => `
    <tr>
      <td class="left" style="font-weight:bold;">${b.title}</td>
      <td class="left">${b.label}</td>
      <td>${b.max}</td>
      <td>${fmtVal(b.obtained)}</td>
      <td>${b.percentage !== null ? b.percentage : '—'}</td>
      <td>${b.grade}</td>
    </tr>`).join('')

  const totalLabel = isAnnual ? 'Total Annual Max. Marks' : 'Total Max. Marks'

  return `
  <div class="page">
    ${header(vm, vm.examName)}
    <div class="info-block">
      <div class="info-row">
        <div class="info-pair"><span class="lbl">G.R. No.:</span><span>${vm.student.gr_no || '____'}</span></div>
        <div class="info-pair"><span class="lbl">Roll No.:</span><span>${vm.student.roll_number || '____'}</span></div>
      </div>
      <div class="info-row">
        <div class="info-pair"><span class="lbl">Student Name:</span><span>${vm.student.full_name}</span></div>
        <div class="info-pair"><span class="lbl">Class:</span><span>${vm.student.class_name}</span></div>
      </div>
      <div class="info-row">
        <div class="info-pair"><span class="lbl">Father's Name:</span><span>${vm.student.father_name}</span></div>
        <div class="info-pair"><span class="lbl">Section:</span><span>${vm.student.section_name}</span></div>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th class="left">Subjects</th>
          <th class="left">Components</th>
          <th>Max. Marks</th>
          <th>Marks Obtained</th>
          <th>Percentage</th>
          <th>Grade</th>
        </tr>
      </thead>
      <tbody>
        ${subjectRows}
        ${behaviourRows}
        <tr class="total-row">
          <td colspan="2" class="left">${totalLabel}</td>
          <td>${vm.total_max_marks}</td>
          <td>${vm.total_obtained ?? '—'}</td>
          <td>${vm.overall_percentage !== null ? vm.overall_percentage : '—'}</td>
          <td>${vm.overall_grade ?? '—'}</td>
        </tr>
      </tbody>
    </table>
    ${attendance(vm.attendance)}
    ${isAnnual && vm.promotion_decision
      ? `<div style="margin: 8px 0; font-weight:bold;">Promotion: ${vm.promotion_decision}</div>`
      : ''}
    ${vm.remarks !== null
      ? `<div class="remarks-field"><strong>Remarks:</strong><div class="underline">&nbsp;</div></div>`
      : ''}
    ${signatures()}
  </div>`
}

// ─── Primary Rubric ───────────────────────────────────────────────────────────

function htmlPrimaryRubric(vm: any): string {
  const groups = Object.entries(vm.skill_groups ?? {})

  const groupHtml = groups.map(([groupName, skills]: [string, any]) => `
    <div class="skill-group">
      <div class="skill-group-title">${groupName}</div>
      ${skills.map((s: any) => `
        <div class="skill-row">
          <span>${s.text}</span>
          <strong>${s.grade}</strong>
        </div>`).join('')}
    </div>`).join('')

  const gradeKeyHtml = `
  <div class="grade-key">
    <div class="grade-key-title">Grade Key</div>
    <div class="grade-key-row">
      ${vm.grade_key.map((g: any) => `
        <div class="grade-key-item"><span>${g.symbol}</span> ${g.label}</div>`).join('')}
    </div>
  </div>`

  return `
  <div class="page">
    ${header(vm, vm.examName)}
    <div class="info-block">
      <div class="info-row">
        <div class="info-pair"><span class="lbl">Student:</span><span>${vm.student.full_name}</span></div>
        <div class="info-pair"><span class="lbl">Class:</span><span>${vm.student.class_name} — ${vm.student.section_name}</span></div>
      </div>
    </div>
    <div class="skill-groups">${groupHtml}</div>
    ${gradeKeyHtml}
    ${attendance(vm.attendance)}
    <div class="remarks-field"><strong>General Remark:</strong><div class="underline">&nbsp;</div></div>
    <div class="remarks-field" style="margin-top:6px;"><strong>Concluding Remarks:</strong><div class="underline">&nbsp;</div></div>
    ${signatures()}
  </div>`
}

// ─── Primary Patron ───────────────────────────────────────────────────────────

function htmlPrimaryPatron(vm: any): string {
  const rows = (vm.patron_skills ?? []).map((s: any) => `
    <tr>
      <td class="left">${s.title}</td>
      <td>${s.grade}</td>
    </tr>`).join('')

  const gradeKeyHtml = `
  <div class="grade-key">
    <div class="grade-key-title">Grade Key</div>
    <div class="grade-key-row">
      ${vm.grade_key.map((g: any) => `
        <div class="grade-key-item"><span>${g.symbol}</span> ${g.label}</div>`).join('')}
    </div>
  </div>`

  return `
  <div class="page">
    ${header(vm, 'Patron Report')}
    <div class="info-block">
      <div class="info-row">
        <div class="info-pair"><span class="lbl">G.R. No.:</span><span>${vm.student.gr_no || '____'}</span></div>
      </div>
      <div class="info-row">
        <div class="info-pair"><span class="lbl">Student:</span><span>${vm.student.full_name}</span></div>
        <div class="info-pair"><span class="lbl">Class:</span><span>${vm.student.class_name} — ${vm.student.section_name}</span></div>
      </div>
    </div>
    <table>
      <thead><tr><th class="left">Title</th><th>Grade</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${gradeKeyHtml}
    ${attendance(vm.attendance)}
    <div class="remarks-field"><strong>Remarks:</strong><div class="underline">&nbsp;</div></div>
    <div class="remarks-field" style="margin-top:6px;"><strong>Conclusion:</strong><div class="underline">&nbsp;</div></div>
    <p class="nb">N.B. The Adoptee will be updated with the progress of the child through mail twice a year in December &amp; July.</p>
    ${signatures()}
  </div>`
}

// ─── Secondary Patron (quarterly / term / annual — simplified one-line-per-subject) ──

function htmlSecondaryPatron(vm: any): string {
  // For term/annual the data shape uses `rows[].components` (complex).
  // We flatten to just the final total component per subject so the
  // patron sees one clean row per subject, identical to the quarterly layout.
  const isSimple = vm.template === 'secondary_quarterly_patron'

  const rows = vm.rows.map((r: any) => {
    let obtained: number | null
    let maxMarks: number
    let pct: number | null
    let grade: string

    if (isSimple) {
      obtained = r.obtained_marks
      maxMarks = r.max_marks
      pct      = r.percentage
      grade    = r.grade
    } else {
      // Last component is always the term/annual total
      const last = r.components[r.components.length - 1]
      obtained   = last.obtained
      maxMarks   = last.max
      pct        = r.percentage
      grade      = r.grade
    }

    return `
    <tr>
      <td class="left">${r.subject}</td>
      <td>${maxMarks}</td>
      <td>${obtained !== null ? obtained : '—'}</td>
      <td>${pct !== null ? pct : '—'}</td>
      <td>${grade}</td>
    </tr>`
  }).join('')

  // Grand total row
  let grandMax: number, grandObtained: number | null, grandPct: number | null, grandGrade: string
  if (isSimple) {
    grandMax      = vm.grand_total.max
    grandObtained = vm.grand_total.obtained
    grandPct      = vm.grand_total.percentage
    grandGrade    = vm.grand_total.grade
  } else {
    grandMax      = vm.total_max_marks
    grandObtained = vm.total_obtained ?? null
    grandPct      = vm.overall_percentage ?? null
    grandGrade    = vm.overall_grade ?? '—'
  }

  // Derive exam subtitle from template type
  const subtitleMap: Record<string, string> = {
    secondary_quarterly_patron: vm.examName,
    secondary_term_patron:      vm.examName,
    secondary_annual_patron:    `Progress Report (Annual Average) ${vm.academicYear}`,
  }
  const subtitle = subtitleMap[vm.template] ?? vm.examName

  return `
  <div class="page">
    ${header(vm, subtitle)}
    <div class="info-block">
      <div class="info-row">
        <div class="info-pair"><span class="lbl">G.R. No.:</span><span>${vm.student.gr_no || '____'}</span></div>
        <div class="info-pair"><span class="lbl">Roll No.:</span><span>${vm.student.roll_number || '____'}</span></div>
      </div>
      <div class="info-row">
        <div class="info-pair"><span class="lbl">Student Name:</span><span>${vm.student.full_name}</span></div>
        <div class="info-pair"><span class="lbl">Class:</span><span>${vm.student.class_name}</span></div>
      </div>
      <div class="info-row">
        <div class="info-pair"><span class="lbl">Father's Name:</span><span>${vm.student.father_name}</span></div>
        <div class="info-pair"><span class="lbl">Section:</span><span>${vm.student.section_name}</span></div>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th class="left">Subject</th>
          <th>Maximum Marks</th>
          <th>Marks Obtained</th>
          <th>Percentage</th>
          <th>Grade</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        <tr class="total-row">
          <td class="left">Grand Total</td>
          <td>${grandMax}</td>
          <td>${grandObtained !== null ? grandObtained : '—'}</td>
          <td>${grandPct !== null ? grandPct : '—'}</td>
          <td>${grandGrade}</td>
        </tr>
      </tbody>
    </table>
    ${vm.attendance ? attendance(vm.attendance) : ''}
    <div class="remarks-field"><strong>Remarks:</strong><div class="underline">&nbsp;</div></div>
    <p class="nb">N.B. The Adoptee will be updated with the progress of the child through mail twice a year in December &amp; July.</p>
    ${signatures()}
  </div>`
}

// ─── Dispatch to HTML Template ───────────────────────────────────────────────

function buildHtml(vm: any): string {
  switch (vm.template) {
    case 'high_school_term':
    case 'high_school_patron':
      return htmlHighSchool(vm)
    case 'secondary_quarterly':
      return htmlSecondaryQuarterly(vm)
    case 'secondary_quarterly_patron':
    case 'secondary_term_patron':
    case 'secondary_annual_patron':
      return htmlSecondaryPatron(vm)
    case 'secondary_term':
    case 'secondary_annual':
      return htmlSecondaryComplex(vm)
    case 'primary_rubric':
      return htmlPrimaryRubric(vm)
    case 'primary_patron':
      return htmlPrimaryPatron(vm)
    default:
      return `<div>Unknown template: ${vm.template}</div>`
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Call the generate route internally to get the view model(s)
    const origin   = new URL(request.url).origin
    const genRes   = await fetch(`${origin}/api/reports/generate`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
    const genJson = await genRes.json()
    if (!genJson.success) return NextResponse.json({ error: genJson.error }, { status: 400 })

    // Normalise: single report or class batch
    const reports: any[] = genJson.data?.reports ?? [genJson.data]

    // Build one HTML block per student, each followed by a page break
    const pages = reports.map((vm: any, i: number) => {
      const html  = buildHtml(vm)
      const isLast = i === reports.length - 1
      return isLast ? html : html.replace('<div class="page">', '<div class="page page-break">')
    }).join('\n')

    const fullHtml = wrap(pages)

    // ── Puppeteer PDF ──
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
    // For Vercel/serverless, replace the launch above with:
    // import chromium from '@sparticuz/chromium'
    // import puppeteerCore from 'puppeteer-core'
    // const browser = await puppeteerCore.launch({
    //   args: chromium.args,
    //   defaultViewport: chromium.defaultViewport,
    //   executablePath: await chromium.executablePath(),
    //   headless: chromium.headless,
    // })

    const page = await browser.newPage()
    await page.setContent(fullHtml, { waitUntil: 'networkidle0' })
    const pdf = await page.pdf({
      format:          'A4',
      printBackground: true,
      margin:          { top: '10mm', bottom: '10mm', left: '8mm', right: '8mm' },
    })
    await browser.close()

    const firstName = reports[0]?.student?.full_name?.replace(/\s+/g, '_') ?? 'report'
    const filename  = reports.length > 1
      ? `${reports[0]?.student?.class_name?.replace(/\s+/g, '_')}_reports.pdf`
      : `${firstName}_report.pdf`

    return new Response(pdf, {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })

  } catch (err: any) {
    console.error('PDF export error:', err)
    return NextResponse.json({ error: err?.message ?? 'PDF generation failed' }, { status: 500 })
  }
}