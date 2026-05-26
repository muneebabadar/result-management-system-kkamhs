// /src/app/api/reports/export/pdf/route.ts
//
// Requires: npm install puppeteer
// For Vercel/serverless: npm install puppeteer-core @sparticuz/chromium
// and swap the launch call per the comment at the bottom of this file.

import { NextResponse } from 'next/server'
import puppeteer        from 'puppeteer'

import {
  primaryReportHtml,
  DEFAULT_PRIMARY_SKILLS,
  type PrimaryReportVm,
} from '@/app/api/reports/_templates/primary_report'  // adjust path to match your project

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
// Delegates to primary_report.ts which produces the exact physical card layout
// (two-column skill tables, grade key, attendance box, signatures).
//
// The generate route must include these fields on the primary vm:
//   english, urdu, mathematics, social_science, work_skills,
//   social_skills, parental  — see PrimaryReportVm in primary_report.ts
// Any field that is missing falls back to DEFAULT_PRIMARY_SKILLS (blank grades).

function htmlPrimaryRubric(vm: any): string {
  const primaryVm: PrimaryReportVm = {
    schoolName: 'Khadija Kazi Ali Memorial Higher Secondary School',
    term:       vm.term      ?? vm.examName ?? '',
    termLabel:  vm.termLabel ?? undefined,

    student: {
      full_name:    vm.student.full_name,
      gr_number:    vm.student.gr_no       ?? null,
      class_name:   vm.student.class_name  ?? null,
      section_name: vm.student.section_name ?? null,
    },

    attendance: {
      total_days:   vm.attendance?.total_days   ?? null,
      days_present: vm.attendance?.days_present ?? null,
      days_absent:  vm.attendance?.days_absent  ?? null,
    },

    english:        vm.english        ?? DEFAULT_PRIMARY_SKILLS.english,
    urdu:           vm.urdu           ?? DEFAULT_PRIMARY_SKILLS.urdu,
    mathematics:    vm.mathematics    ?? DEFAULT_PRIMARY_SKILLS.mathematics,
    social_science: vm.social_science ?? DEFAULT_PRIMARY_SKILLS.social_science,
    work_skills:    vm.work_skills    ?? DEFAULT_PRIMARY_SKILLS.work_skills,
    social_skills:  vm.social_skills  ?? DEFAULT_PRIMARY_SKILLS.social_skills,
    parental:       vm.parental       ?? DEFAULT_PRIMARY_SKILLS.parental,

    general_remark:     vm.general_remark     ?? null,
    concluding_remarks: vm.concluding_remarks ?? null,
  }

  // primaryReportHtml returns a complete document with its own <style> block.
  // Extract BOTH the style and the body — if we take only the body the two-column
  // card CSS (.body-columns, .skill-table, .top-bar, etc.) is lost and the layout
  // collapses into a plain list. A <style> tag inside <body> is valid HTML5 and
  // puppeteer renders it correctly.
  const fullDoc    = primaryReportHtml(primaryVm)
  const styleMatch = fullDoc.match(/<style>([\s\S]*?)<\/style>/)
  const bodyMatch  = fullDoc.match(/<body>([\s\S]*)<\/body>/)

  const inlineStyle = styleMatch ? `<style>${styleMatch[1]}</style>` : ''
  const bodyContent = bodyMatch  ? bodyMatch[1].trim()               : fullDoc

  return `${inlineStyle}\n${bodyContent}`
}

// ─── Primary Patron ───────────────────────────────────────────────────────────

function htmlPrimaryPatron(vm: any): string {
  const rows = (vm.patron_skills ?? []).map((s: any) => `
    <tr>
      <td class="pt-skill">${s.title}</td>
      <td class="pt-grade">${s.grade ?? '—'}</td>
    </tr>`).join('')
 
  const att = vm.attendance
 
  // Returns a self-contained block with its own <style> so the layout CSS
  // isn't affected by BASE_CSS (same technique as htmlPrimaryRubric).
  return `
<style>
  .pt-page { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #000;
             max-width: 680px; margin: 0 auto; padding: 16px 22px; }
 
  /* ── Letterhead ── */
  .pt-header { display: flex; justify-content: space-between; align-items: flex-start;
               padding-bottom: 8px; margin-bottom: 10px; }
  .pt-school-name { font-size: 15px; font-weight: bold; }
  .pt-school-sub  { font-size: 9px; color: #333; margin-top: 2px; line-height: 1.4; }
  .pt-logo { width: 54px; height: 54px; border: 1px solid #999; border-radius: 50%;
             display: flex; align-items: center; justify-content: center;
             font-size: 8px; color: #555; text-align: center; line-height: 1.3; }
 
  /* ── AC No / student info ── */
  .pt-ac   { text-align: right; margin-bottom: 10px; font-size: 11px; }
  .pt-info { margin-bottom: 12px; }
  .pt-info-row   { display: flex; align-items: baseline; margin-bottom: 6px; gap: 8px; }
  .pt-info-label { font-weight: bold; min-width: 90px; }
  .pt-info-val   { border-bottom: 1px solid #000; min-width: 150px; padding-bottom: 1px; }
 
  /* ── "Remarks" heading ── */
  .pt-heading { text-align: center; font-weight: bold; font-size: 14px; margin: 12px 0 10px; }
 
  /* ── Two-column body ── */
  .pt-body   { display: flex; gap: 24px; align-items: flex-start; }
 
  /* Skill table */
  .pt-tbl          { border-collapse: collapse; font-size: 11px; }
  .pt-tbl th       { background: #d8d8d8; font-weight: bold; border: 1px solid #000;
                     padding: 3px 10px; text-align: center; }
  .pt-skill        { border: 1px solid #000; padding: 2px 10px; text-align: left; font-weight: bold; }
  .pt-grade        { border: 1px solid #000; padding: 2px 8px; text-align: center;
                     font-weight: bold; width: 52px; }
 
  /* Grade Criteria box */
  .pt-criteria       { border: 1px solid #000; padding: 10px 16px; min-width: 175px; }
  .pt-criteria-title { font-weight: bold; text-align: center; text-decoration: underline;
                       margin-bottom: 12px; font-size: 12px; }
  .pt-criteria-row   { display: flex; align-items: center; gap: 6px; margin-bottom: 10px;
                       font-size: 11px; }
  .pt-criteria-sym   { font-weight: bold; min-width: 24px; }
  .pt-criteria-eq    { min-width: 10px; }
 
  /* ── Remarks / Conclusion table ── */
  .pt-rem-tbl     { border-collapse: collapse; width: 100%; margin-top: 14px; font-size: 11px; }
  .pt-rem-tbl td  { border: 1px solid #000; padding: 6px 10px; vertical-align: top; }
  .pt-rem-label   { font-weight: bold; width: 110px; }
  .pt-rem-val     { min-height: 26px; }
 
  /* ── Attendance / N.B. / Signatures ── */
  .pt-att  { font-size: 10px; margin-top: 10px; }
  .pt-nb   { margin-top: 16px; font-size: 10px; line-height: 1.5; }
  .pt-nb b { display: block; }
  .pt-sigs { display: flex; justify-content: space-between; margin-top: 36px; }
  .pt-sig  { text-align: center; min-width: 130px; }
  .pt-sig-line { border-top: 1px solid #000; padding-top: 3px; font-size: 10px; margin-top: 30px; }
</style>
 
<div class="pt-page">
 
  <!-- Letterhead -->
  <div class="pt-header">
    <div>
      <div class="pt-school-name">Khadija Kazi Ali Memorial Higher Secondary School</div>
      <div class="pt-school-sub">Plot No. 1, Sec:-6, Sub Sec:-1B, Gulshan-e-Bilal, Surjani Town</div>
      <div class="pt-school-sub">kkamhs2014@gmail.com &nbsp; kkamhs832014@gmail.com</div>
    </div>
    <div class="pt-logo">ESTD.<br>2014</div>
  </div>
 
  <!-- AC No -->
  <div class="pt-ac">AC No &nbsp;___________</div>
 
  <!-- Student info -->
  <div class="pt-info">
    <div class="pt-info-row">
      <span class="pt-info-label">GR No</span>
      <span class="pt-info-val">&nbsp;${vm.student.gr_no || ''}</span>
    </div>
    <div class="pt-info-row">
      <span class="pt-info-label">Child's Name</span>
      <span class="pt-info-val">&nbsp;${vm.student.full_name}</span>
    </div>
    <div class="pt-info-row">
      <span class="pt-info-label">Class</span>
      <span class="pt-info-val" style="min-width:110px">&nbsp;${vm.student.class_name || ''}</span>
      <span class="pt-info-label" style="min-width:30px">Sec</span>
      <span class="pt-info-val" style="min-width:60px">&nbsp;${vm.student.section_name || ''}</span>
    </div>
  </div>
 
  <!-- Section heading -->
  <div class="pt-heading">Remarks</div>
 
  <!-- Skill table + Grade Criteria side by side -->
  <div class="pt-body">
    <table class="pt-tbl">
      <thead><tr><th>Title</th><th>Grade</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
 
    <div class="pt-criteria">
      <div class="pt-criteria-title">Grade Criteria</div>
      <div class="pt-criteria-row">
        <span class="pt-criteria-sym">A +</span>
        <span class="pt-criteria-eq">=</span>
        <span>Excellent</span>
      </div>
      <div class="pt-criteria-row">
        <span class="pt-criteria-sym">A</span>
        <span class="pt-criteria-eq">=</span>
        <span>Very Good</span>
      </div>
      <div class="pt-criteria-row">
        <span class="pt-criteria-sym">B</span>
        <span class="pt-criteria-eq">=</span>
        <span>Good</span>
      </div>
      <div class="pt-criteria-row">
        <span class="pt-criteria-sym">C</span>
        <span class="pt-criteria-eq">=</span>
        <span>Satisfactory</span>
      </div>
    </div>
  </div>
 
  <!-- Remarks + Conclusion -->
  <table class="pt-rem-tbl">
    <tr>
      <td class="pt-rem-label">Remarks</td>
      <td class="pt-rem-val">&nbsp;</td>
    </tr>
    <tr>
      <td class="pt-rem-label">Conclusion</td>
      <td class="pt-rem-val">&nbsp;</td>
    </tr>
  </table>
 
  <!-- Attendance -->
  ${att
    ? `<div class="pt-att">Total Days: <strong>${att.total_days ?? '___'}</strong> &nbsp;&nbsp; Days Present: <strong>${att.days_present ?? '___'}</strong></div>`
    : ''}
 
  <!-- N.B. -->
  <div class="pt-nb">
    <b>N.B.</b>
    The Adoptee will be updated with the progress of child through mail twice a year in December &amp; July.
  </div>
 
  <!-- Signatures -->
  <div class="pt-sigs">
    <div class="pt-sig"><div class="pt-sig-line">Class Teacher</div></div>
    <div class="pt-sig"><div class="pt-sig-line">Date</div></div>
    <div class="pt-sig"><div class="pt-sig-line">Principal</div></div>
  </div>
 
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