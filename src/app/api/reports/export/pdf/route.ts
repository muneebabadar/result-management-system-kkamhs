import { NextResponse } from 'next/server'
import PDFDocument from 'pdfkit'
import { Readable } from 'stream'
import path from 'path'

// ─── Font path (copy NotoSansArabic.ttf to public/fonts/) ─────
const URDU_FONT = path.join(process.cwd(), 'public/fonts/NotoSansArabic.ttf')

// ─── Colour palette ───────────────────────────────────────────
const C = {
  primary : '#1a3c5e',
  accent  : '#2e6da4',
  subHdr  : '#d6e4f0',
  rowAlt  : '#f0f5fb',
  border  : '#333333',
  softBdr : '#b0c4de',
  text    : '#111111',
  muted   : '#555555',
  white   : '#ffffff',
  success : '#1a6b3c',
  warn    : '#7a5000',
  danger  : '#8b1a1a',
  gold    : '#ffd700',
}

// ─── Page constants ───────────────────────────────────────────
const A4  = { w: 595.28, h: 841.89 }
const A3L = { w: 1190.55, h: 841.89 }  // A3 landscape

// ─── Stream helper ────────────────────────────────────────────
function bufferFromStream(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    stream.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
  })
}

// ─── Arabic / Urdu helpers ────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-var-requires
const reshaper = require('arabic-reshaper')

function isUrdu(s: string) { return /[\u0600-\u06FF]/.test(s) }
function shapeUrdu(text: string): string {
  return reshaper.convertArabic(text).split(' ').reverse().join(' ')
}

// ─── Grade colour ─────────────────────────────────────────────
function gradeColor(g?: string | null) {
  if (!g) return C.muted
  const u = String(g).toUpperCase()
  if (u === 'A+' || u.startsWith('A')) return C.success
  if (u.startsWith('B') || u.startsWith('C')) return C.warn
  return C.danger
}

// ─── Low-level draw helpers ───────────────────────────────────
function hline(doc: PDFKit.PDFDocument, x1: number, x2: number, y: number, w = 0.4) {
  doc.moveTo(x1, y).lineTo(x2, y).strokeColor(C.border).lineWidth(w).stroke()
}
function vline(doc: PDFKit.PDFDocument, x: number, y1: number, y2: number, w = 0.4) {
  doc.moveTo(x, y1).lineTo(x, y2).strokeColor(C.border).lineWidth(w).stroke()
}

/** Draw text, auto-switching to Urdu font + shaping when needed. */
function drawText(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  opts: { size?: number; bold?: boolean; color?: string; width?: number; align?: string; lineBreak?: boolean } = {}
) {
  const s = String(text ?? '')
  const { size = 8, bold = false, color = C.text, width, align = 'left', lineBreak = false } = opts
  if (isUrdu(s)) {
    doc.registerFont('UrduFont', URDU_FONT)
    doc.font('UrduFont').fontSize(size).fillColor(color)
       .text(shapeUrdu(s), x, y, { width, align: align as any, lineBreak })
  } else {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size).fillColor(color)
       .text(s, x, y, { width, align: align as any, lineBreak })
  }
}

// ─── Shared school header (A4 portrait) ───────────────────────
function schoolHeaderA4(doc: PDFKit.PDFDocument, margin: number, colW: number): number {
  const y = margin
  doc.rect(margin, y, colW, 52).fill(C.primary)
  doc.fillColor(C.white).font('Helvetica-Bold').fontSize(15)
     .text('KHADIJA KAZI ALI MEMORIAL HIGH SCHOOL', margin, y + 10, { width: colW, align: 'center' })
  doc.font('Helvetica').fontSize(9)
     .text('Result Card', margin, y + 32, { width: colW, align: 'center' })
  doc.fillColor(C.text)
  return y + 60
}

/** School header for A3 landscape. Returns bottom y. */
function schoolHeaderA3L(doc: PDFKit.PDFDocument, m: number, cw: number): number {
  const y = m
  doc.rect(m, y, cw, 48).fill(C.primary)
  doc.circle(m + 22, y + 24, 17).fillAndStroke(C.white, C.accent)
  doc.font('Helvetica-Bold').fontSize(6).fillColor(C.primary)
     .text('KKAM\nHSS', m + 12, y + 18, { width: 20, align: 'center' })
  doc.font('Helvetica-Bold').fontSize(16).fillColor(C.white)
     .text('KHADIJA KAZI ALI MEMORIAL HIGHER SECONDARY SCHOOL', m + 48, y + 8, {
       width: cw - 56, align: 'center',
     })
  doc.font('Helvetica').fontSize(7.5).fillColor('#cce0ff')
     .text('Plot No. 1, Gulshan-e-Bilal, Sector-6, Sub Sec. 1-B, Surjani Township, Karachi.',
           m + 48, y + 30, { width: cw - 56, align: 'center' })
  doc.fillColor(C.text)
  return y + 52
}

/** Grade key legend box. */
function gradeKeyBox(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number) {
  doc.rect(x, y, w, h).fill(C.white).stroke(C.border)
  doc.font('Helvetica-Bold').fontSize(6.5).fillColor(C.primary)
     .text('GRADE KEY', x + 4, y + 3, { width: w - 8, align: 'center' })
  const keys = [
    ['A+', 'Excellent / Always'],
    ['A',  'Good / Often'],
    ['B',  'Fair / Occasionally'],
    ['C',  'Just Satisfactory / Seldom'],
    ['U',  'Unsatisfactory / Never'],
  ]
  keys.forEach(([g, d], i) => {
    const ky = y + 14 + i * 7
    doc.font('Helvetica-Bold').fontSize(6).fillColor(C.primary).text(g, x + 4, ky, { width: 14 })
    doc.font('Helvetica').fontSize(6).fillColor(C.muted).text(d, x + 18, ky, { width: w - 22 })
  })
}

// ─── A4 shared helpers ────────────────────────────────────────
function infoBox(
  doc: PDFKit.PDFDocument,
  y: number,
  left: Array<[string, string | null | undefined]>,
  right: Array<[string, string | null | undefined]>,
  margin: number,
  colW: number,
): number {
  const LABEL_W = 72, ROW_H = 20
  const boxH = Math.max(left.length, right.length) * ROW_H + 14
  doc.rect(margin, y, colW, boxH).fill('#f7f9fc')
  doc.rect(margin, y, colW, boxH).stroke(C.softBdr)
  if (right.length > 0) {
    const midX = margin + colW / 2
    doc.moveTo(midX, y + 6).lineTo(midX, y + boxH - 6).strokeColor(C.softBdr).lineWidth(0.5).stroke()
  }
  const halfW = colW / 2
  let ly = y + 10
  for (const [label, value] of left) {
    doc.font('Helvetica-Bold').fontSize(8).fillColor(C.muted)
       .text(label.toUpperCase(), margin + 8, ly, { width: LABEL_W, lineBreak: false })
    doc.font('Helvetica').fontSize(9).fillColor(C.text)
       .text(String(value ?? '—'), margin + 8 + LABEL_W, ly, { width: halfW - LABEL_W - 16, lineBreak: false })
    ly += ROW_H
  }
  let ry = y + 10
  for (const [label, value] of right) {
    const rx = margin + halfW
    doc.font('Helvetica-Bold').fontSize(8).fillColor(C.muted)
       .text(label.toUpperCase(), rx + 8, ry, { width: LABEL_W, lineBreak: false })
    doc.font('Helvetica').fontSize(9).fillColor(C.text)
       .text(String(value ?? '—'), rx + 8 + LABEL_W, ry, { width: halfW - LABEL_W - 16, lineBreak: false })
    ry += ROW_H
  }
  return y + boxH + 10
}

function summaryBar(
  doc: PDFKit.PDFDocument,
  y: number,
  margin: number,
  colW: number,
  items: Array<{ label: string; value: string; highlight?: boolean }>,
): number {
  const H = 48
  doc.rect(margin, y, colW, H).fill(C.primary)
  const cw = colW / items.length
  items.forEach((item, i) => {
    const x = margin + i * cw
    if (i > 0) doc.moveTo(x, y + 8).lineTo(x, y + H - 8).strokeColor(C.softBdr).lineWidth(0.5).stroke()
    doc.font('Helvetica').fontSize(7.5).fillColor(C.rowAlt)
       .text(item.label.toUpperCase(), x, y + 10, { width: cw, align: 'center' })
    doc.font('Helvetica-Bold').fontSize(13).fillColor(item.highlight ? C.gold : C.white)
       .text(item.value, x, y + 24, { width: cw, align: 'center' })
  })
  doc.fillColor(C.text)
  return y + H + 10
}

// ══════════════════════════════════════════════════════════════
// RENDERER 1 — Annual Average (A4 portrait, secondary individual)
// ══════════════════════════════════════════════════════════════
function renderAnnualAverage(doc: PDFKit.PDFDocument, vm: any) {
  const M = 36, CW = A4.w - M * 2
  let y = schoolHeaderA4(doc, M, CW)

  // Exam badge
  doc.rect(M, y, CW, 18).fill(C.accent)
  doc.font('Helvetica-Bold').fontSize(9).fillColor(C.white)
     .text(vm.examName ?? 'Report', M, y + 5, { width: CW, align: 'center' })
  y += 24

  const s = vm.student ?? {}
  y = infoBox(doc, y, [['Student', s.full_name], ['Father', s.father_name]],
                       [['Class', `${s.class_name ?? ''} ${s.section_name ?? ''}`.trim()], ['Roll No', s.roll_number]],
                       M, CW)

  // Component columns
  const firstBlock  = (vm.blocks ?? [])[0]
  const compLabels: string[] = (firstBlock?.components ?? []).map((c: any) => c.label)
  const SUBJ_W = 130, PCT_W = 55, GRD_W = 50
  const compW  = compLabels.length > 0 ? Math.floor((CW - SUBJ_W - PCT_W - GRD_W) / compLabels.length) : CW - SUBJ_W - PCT_W - GRD_W

  let cx = M
  const cols: Array<{ label: string; x: number; w: number; align?: 'right' | 'center' | 'left' }> = []
  cols.push({ label: 'SUBJECT', x: cx, w: SUBJ_W }); cx += SUBJ_W
  for (const lbl of compLabels) { cols.push({ label: lbl.toUpperCase(), x: cx, w: compW, align: 'right' }); cx += compW }
  cols.push({ label: '%',     x: cx, w: PCT_W, align: 'right' }); cx += PCT_W
  cols.push({ label: 'GRADE', x: cx, w: GRD_W, align: 'center' })

  // Section title
  doc.rect(M, y, CW, 22).fill(C.accent)
  doc.font('Helvetica-Bold').fontSize(10).fillColor(C.white).text('SUBJECT PERFORMANCE', M + 8, y + 6, { width: CW - 16 })
  y += 28

  // Table header
  const H = 20
  doc.rect(M, y, CW, H).fill(C.primary)
  doc.font('Helvetica-Bold').fontSize(8).fillColor(C.white)
  for (const col of cols) {
    doc.text(col.label, col.x + 4, y + 6, { width: col.w - 8, align: col.align ?? 'left', lineBreak: false })
  }
  y += H

  ;(vm.blocks ?? []).forEach((block: any, i: number) => {
    const rowH = 24
    if (i % 2 === 1) doc.rect(M, y, CW, rowH).fill(C.rowAlt)
    doc.moveTo(M, y + rowH).lineTo(M + CW, y + rowH).strokeColor(C.softBdr).lineWidth(0.5).stroke()

    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.text)
       .text(block.subject, cols[0].x + 4, y + 8, { width: cols[0].w - 8, lineBreak: false })

    ;(block.components ?? []).forEach((comp: any, j: number) => {
      const col = cols[1 + j]
      const val = comp.is_absent ? 'Ab' : comp.obtained != null ? `${comp.obtained} / ${comp.max}` : `- / ${comp.max}`
      doc.font('Helvetica').fontSize(8.5).fillColor(C.text)
         .text(val, col.x + 4, y + 8, { width: col.w - 8, align: 'right', lineBreak: false })
    })

    const pi = cols.length - 2, gi = cols.length - 1
    doc.font('Helvetica').fontSize(8.5).fillColor(C.text)
       .text(block.pct != null ? `${block.pct}%` : '-', cols[pi].x + 4, y + 8, { width: cols[pi].w - 8, align: 'right', lineBreak: false })
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(gradeColor(block.grade))
       .text(block.grade ?? '-', cols[gi].x + 4, y + 8, { width: cols[gi].w - 8, align: 'center', lineBreak: false })

    y += rowH
  })

  y += 12
  const att = vm.attendance ? `${vm.attendance.days_present ?? '-'} / ${vm.attendance.total_days ?? '-'} days` : '-'
  summaryBar(doc, y, M, CW, [
    { label: 'Overall %', value: vm.overall?.pct != null ? `${vm.overall.pct}%` : '-' },
    { label: 'Grade',     value: vm.overall?.grade ?? '-', highlight: true },
    { label: 'Attendance', value: att },
  ])

  doc.rect(M - 4, M - 4, CW + 8, A4.h - M * 2 + 8).strokeColor(C.softBdr).lineWidth(1).stroke()
}

// ══════════════════════════════════════════════════════════════
// RENDERER 2 — Annual Summary (A4 portrait)
// ══════════════════════════════════════════════════════════════
function renderAnnualSummary(doc: PDFKit.PDFDocument, vm: any) {
  const M = 36, CW = A4.w - M * 2
  let y = schoolHeaderA4(doc, M, CW)

  doc.rect(M, y, CW, 18).fill(C.accent)
  doc.font('Helvetica-Bold').fontSize(9).fillColor(C.white)
     .text(`Annual Summary — ${vm.academicYear?.name ?? ''}`, M, y + 5, { width: CW, align: 'center' })
  y += 24

  y = summaryBar(doc, y, M, CW, [
    { label: 'Total Students', value: String(vm.summary?.totalStudents ?? 0) },
    { label: 'Average Score',  value: vm.summary?.averageScore != null ? `${vm.summary.averageScore}%` : '-' },
    { label: 'Pass',           value: String(vm.summary?.passCount ?? 0), highlight: true },
    { label: 'Fail',           value: String(vm.summary?.failCount ?? 0) },
  ])

  // Grade distribution
  doc.rect(M, y, CW, 22).fill(C.accent)
  doc.font('Helvetica-Bold').fontSize(10).fillColor(C.white).text('GRADE DISTRIBUTION', M + 8, y + 6, { width: CW - 16 })
  y += 28

  const grades = Object.entries(vm.gradeDistribution ?? {})
  const gW = grades.length > 0 ? Math.floor(CW / grades.length) : CW
  grades.forEach(([grade, count], i) => {
    const x = M + i * gW
    doc.rect(x, y, gW - 2, 48).fillAndStroke(i % 2 === 0 ? C.rowAlt : '#e8f0fa', C.softBdr)
    doc.font('Helvetica-Bold').fontSize(20).fillColor(C.primary)
       .text(grade, x, y + 6, { width: gW - 2, align: 'center', lineBreak: false })
    doc.font('Helvetica-Bold').fontSize(11).fillColor(C.muted)
       .text(String(count), x, y + 30, { width: gW - 2, align: 'center', lineBreak: false })
  })
  y += 58

  // Class breakdown
  doc.rect(M, y, CW, 22).fill(C.accent)
  doc.font('Helvetica-Bold').fontSize(10).fillColor(C.white).text('CLASS-WISE BREAKDOWN', M + 8, y + 6, { width: CW - 16 })
  y += 28

  const cols = [
    { label: 'CLASS / SECTION', x: M,       w: 220 },
    { label: 'STUDENTS',        x: M + 220, w: 80,  align: 'right' as const },
    { label: 'AVG %',           x: M + 300, w: 80,  align: 'right' as const },
    { label: 'PASS',            x: M + 380, w: 70,  align: 'right' as const },
    { label: 'FAIL',            x: M + 450, w: 69,  align: 'right' as const },
  ]
  const HH = 20
  doc.rect(M, y, CW, HH).fill(C.primary)
  doc.font('Helvetica-Bold').fontSize(8).fillColor(C.white)
  for (const col of cols) doc.text(col.label, col.x + 4, y + 6, { width: col.w - 8, align: col.align ?? 'left', lineBreak: false })
  y += HH

  ;(vm.cohorts ?? []).forEach((cohort: any, i: number) => {
    const rowH = 22
    if (i % 2 === 1) doc.rect(M, y, CW, rowH).fill(C.rowAlt)
    doc.moveTo(M, y + rowH).lineTo(M + CW, y + rowH).strokeColor(C.softBdr).lineWidth(0.5).stroke()
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.text).text(cohort.label, cols[0].x + 4, y + 7, { width: cols[0].w - 8, lineBreak: false })
    doc.font('Helvetica').fontSize(8.5).fillColor(C.text).text(String(cohort.totalStudents ?? 0), cols[1].x + 4, y + 7, { width: cols[1].w - 8, align: 'right', lineBreak: false })
    doc.text(cohort.averageScore != null ? `${cohort.averageScore}%` : '-', cols[2].x + 4, y + 7, { width: cols[2].w - 8, align: 'right', lineBreak: false })
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.success).text(String(cohort.passCount ?? 0), cols[3].x + 4, y + 7, { width: cols[3].w - 8, align: 'right', lineBreak: false })
    doc.fillColor(C.danger).text(String(cohort.failCount ?? 0), cols[4].x + 4, y + 7, { width: cols[4].w - 8, align: 'right', lineBreak: false })
    y += rowH
  })

  doc.rect(M - 4, M - 4, CW + 8, A4.h - M * 2 + 8).strokeColor(C.softBdr).lineWidth(1).stroke()
}

// ══════════════════════════════════════════════════════════════
// RENDERER 3 — Rubric Register (A3 landscape, primary class-wise)
// Matches the physical class register sheet
// ══════════════════════════════════════════════════════════════
function renderRubricRegister(doc: PDFKit.PDFDocument, vm: any) {
  const M  = 22
  const CW = A3L.w - M * 2

  const rubric   = vm.rubric   ?? []
  const students = vm.students ?? []

  // Group skills by group_name (preserves insertion order)
  const groupMap = new Map<string, any[]>()
  for (const skill of rubric) {
    const gn = String(skill.group_name ?? 'Other')
    if (!groupMap.has(gn)) groupMap.set(gn, [])
    groupMap.get(gn)!.push(skill)
  }
  const groups = Array.from(groupMap.entries())

  // Column geometry
  const NO_W   = 24
  const NAME_W = 120
  const SUM_W  = 50
  const SKILL_W = Math.max(18, Math.floor((CW - NO_W - NAME_W - SUM_W) / rubric.length))

  // x positions: [No, Name, skill0, skill1, ..., Summary]
  const colX: number[] = []
  let cx = M
  colX.push(cx); cx += NO_W
  colX.push(cx); cx += NAME_W
  for (let i = 0; i < rubric.length; i++) { colX.push(cx); cx += SKILL_W }
  const sumX = M + CW - SUM_W

  // Heights
  const SCHOOL_H = 48
  const META_H   = 20
  const GROUP_H  = 20
  const SKILL_H  = 88
  const DATA_H   = 18
  const N_ROWS   = 30

  let y = M

  // School header
  y = schoolHeaderA3L(doc, M, CW)
  y += 3

  // Grade key — top right corner
  gradeKeyBox(doc, A3L.w - M - 140, M, 138, SCHOOL_H)

  // Meta: Class / Section / Term
  doc.rect(M, y, CW, META_H).fill(C.subHdr).stroke(C.border)
  const metaFields = [
    { label: 'CLASS',   value: vm.cohortLabel ?? '' },
    { label: 'SECTION', value: vm.sectionName ?? '' },
    { label: 'TERM',    value: vm.examName ?? '' },
  ]
  const mw = CW / metaFields.length
  metaFields.forEach(({ label, value }, i) => {
    const mx = M + i * mw
    doc.font('Helvetica-Bold').fontSize(8).fillColor(C.primary)
       .text(`${label}:  `, mx + 6, y + 6, { continued: true, width: 55 })
    doc.font('Helvetica').fillColor(C.text).text(value)
    if (i > 0) vline(doc, mx, y, y + META_H)
  })
  y += META_H

  // ── Header row 1: Group names (spanning) ─────────────────
  doc.rect(M, y, CW, GROUP_H).fill(C.primary)
  doc.font('Helvetica-Bold').fontSize(7).fillColor(C.white)
  doc.text('No.',  colX[0] + 2, y + 6, { width: NO_W - 4,  align: 'center', lineBreak: false })
  doc.text('Name', colX[1] + 2, y + 6, { width: NAME_W - 4, align: 'center', lineBreak: false })

  let skillCursor = 0
  for (const [groupName, skills] of groups) {
    const spanW = SKILL_W * skills.length
    const spanX = colX[2 + skillCursor]
    vline(doc, spanX, y, y + GROUP_H + SKILL_H, 1)

    if (isUrdu(groupName)) {
      doc.registerFont('UrduFont', URDU_FONT)
      doc.font('UrduFont').fontSize(9).fillColor(C.white)
         .text(shapeUrdu(groupName), spanX + 2, y + 5, { width: spanW - 4, align: 'center', lineBreak: false })
    } else {
      doc.font('Helvetica-Bold').fontSize(8).fillColor(C.white)
         .text(groupName, spanX + 2, y + 6, { width: spanW - 4, align: 'center', lineBreak: false })
    }
    skillCursor += skills.length
  }

  doc.font('Helvetica-Bold').fontSize(7).fillColor(C.white)
     .text('Summary', sumX + 2, y + 6, { width: SUM_W - 4, align: 'center', lineBreak: false })
  y += GROUP_H

  // ── Header row 2: Rotated skill names (bilingual) ─────────
  doc.rect(M, y, CW, SKILL_H).fill('#f0f4f8').stroke(C.border)

  rubric.forEach((skill: any, i: number) => {
    const sx = colX[2 + i] + SKILL_W / 2
    vline(doc, colX[2 + i], y, y + SKILL_H)

    doc.save()
    doc.translate(sx, y + SKILL_H - 5)
    doc.rotate(-90)

    // English (group_name or skill_text if English)
    if (!isUrdu(skill.skill_text ?? '')) {
      doc.font('Helvetica').fontSize(6.5).fillColor(C.primary)
         .text(String(skill.skill_text ?? '').substring(0, 22), 0, 0, { width: SKILL_H - 10, lineBreak: false })
    } else if (!isUrdu(skill.group_name ?? '')) {
      doc.font('Helvetica').fontSize(6.5).fillColor(C.primary)
         .text(String(skill.group_name ?? '').substring(0, 22), 0, 0, { width: SKILL_H - 10, lineBreak: false })
    }

    // Urdu (skill_text if Urdu)
    if (isUrdu(skill.skill_text ?? '')) {
      doc.registerFont('UrduFont', URDU_FONT)
      doc.font('UrduFont').fontSize(6.5).fillColor(C.accent)
         .text(shapeUrdu(String(skill.skill_text ?? '')), 0, isUrdu(skill.group_name ?? '') ? 0 : 10,
               { width: SKILL_H - 10, lineBreak: false })
    }
    doc.restore()
  })

  vline(doc, colX[1], y - GROUP_H, y + SKILL_H + DATA_H * N_ROWS, 1)
  vline(doc, sumX,    y - GROUP_H, y + SKILL_H + DATA_H * N_ROWS, 1)
  y += SKILL_H

  // ── Data rows ─────────────────────────────────────────────
  const tableBottom = y + DATA_H * N_ROWS
  doc.rect(M, y, CW, DATA_H * N_ROWS).stroke(C.border)

  for (let i = 0; i < N_ROWS; i++) {
    const ry = y + i * DATA_H
    const entry = students[i] ?? null
    if (i % 2 === 1) doc.rect(M, ry, CW, DATA_H).fill(C.rowAlt)
    hline(doc, M, M + CW, ry + DATA_H)

    doc.font('Helvetica').fontSize(7).fillColor(C.muted)
       .text(String(i + 1).padStart(2, '0'), colX[0] + 2, ry + 6, { width: NO_W - 4, align: 'center', lineBreak: false })

    if (entry) {
      doc.font('Helvetica-Bold').fontSize(8).fillColor(C.text)
         .text(entry.student?.full_name ?? '', colX[1] + 3, ry + 6, { width: NAME_W - 6, lineBreak: false })
      rubric.forEach((skill: any, j: number) => {
        vline(doc, colX[2 + j], ry, ry + DATA_H)
        const grade = entry.grades?.[String(skill.id)] ?? ''
        if (grade) {
          doc.font('Helvetica-Bold').fontSize(8).fillColor(gradeColor(grade))
             .text(grade, colX[2 + j], ry + 6, { width: SKILL_W, align: 'center', lineBreak: false })
        }
      })
    }
  }

  // Thick group separators through data area
  skillCursor = 0
  for (const [, skills] of groups) {
    skillCursor += skills.length
    if (skillCursor < rubric.length) vline(doc, colX[2 + skillCursor], y, tableBottom, 1)
  }

  doc.rect(M - 1, M - 1, CW + 2, A3L.h - M * 2 + 2).strokeColor(C.border).lineWidth(1).stroke()
}

// ══════════════════════════════════════════════════════════════
// RENDERER 4 — Class Results List (A4 portrait, secondary class-wise)
// Simple ranked list: No | Roll | Name | Overall % | Grade | Result
// ══════════════════════════════════════════════════════════════
function renderClassResults(doc: PDFKit.PDFDocument, vm: any) {
  const M = 36, CW = A4.w - M * 2
  let y = schoolHeaderA4(doc, M, CW)

  // Exam + class badge
  doc.rect(M, y, CW, 18).fill(C.accent)
  doc.font('Helvetica-Bold').fontSize(9).fillColor(C.white)
     .text(`${vm.cohortLabel ?? ''} — ${vm.examName ?? 'Results'}`, M, y + 5, { width: CW, align: 'center' })
  y += 24

  // Info row
  const infoH = 24
  doc.rect(M, y, CW, infoH).fill('#f7f9fc').stroke(C.softBdr)
  doc.font('Helvetica-Bold').fontSize(8).fillColor(C.muted)
     .text('CLASS', M + 8, y + 8, { width: 50, lineBreak: false })
  doc.font('Helvetica').fontSize(9).fillColor(C.text)
     .text(vm.cohortLabel ?? '—', M + 58, y + 8, { lineBreak: false })
  doc.font('Helvetica-Bold').fontSize(8).fillColor(C.muted)
     .text('ACADEMIC YEAR', M + CW / 2, y + 8, { width: 95, lineBreak: false })
  doc.font('Helvetica').fontSize(9).fillColor(C.text)
     .text(vm.academicYear?.name ?? '—', M + CW / 2 + 95, y + 8, { lineBreak: false })
  y += infoH + 10

  // Table header
  const cols = [
    { label: 'NO.',       x: M,         w: 32,               align: 'center' as const },
    { label: 'ROLL',      x: M + 32,    w: 50,               align: 'center' as const },
    { label: 'STUDENT NAME', x: M + 82, w: 220,              align: 'left'   as const },
    { label: 'OVERALL %', x: M + 302,   w: 90,               align: 'right'  as const },
    { label: 'GRADE',     x: M + 392,   w: 60,               align: 'center' as const },
    { label: 'RESULT',    x: M + 452,   w: CW - (452 - 36),  align: 'center' as const },
  ]

  const TH = 22
  doc.rect(M, y, CW, TH).fill(C.primary)
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.white)
  for (const col of cols) {
    doc.text(col.label, col.x + 4, y + 7, { width: col.w - 8, align: col.align, lineBreak: false })
  }
  y += TH

  const students: any[] = vm.students ?? []
  students.forEach((st: any, i: number) => {
    const rowH = 22
    if (i % 2 === 1) doc.rect(M, y, CW, rowH).fill(C.rowAlt)
    doc.moveTo(M, y + rowH).lineTo(M + CW, y + rowH).strokeColor(C.softBdr).lineWidth(0.5).stroke()

    const pct   = st.overallPct
    const grade = st.overallGrade
    const result = st.overallResult ?? (pct != null ? (pct >= 45 ? 'Pass' : 'Fail') : null)

    doc.font('Helvetica').fontSize(9).fillColor(C.muted)
       .text(String(st.no ?? i + 1).padStart(2, '0'), cols[0].x + 4, y + 7,
             { width: cols[0].w - 8, align: 'center', lineBreak: false })

    doc.font('Helvetica').fontSize(9).fillColor(C.muted)
       .text(st.rollNumber ?? '—', cols[1].x + 4, y + 7,
             { width: cols[1].w - 8, align: 'center', lineBreak: false })

    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.text)
       .text(st.name ?? '—', cols[2].x + 4, y + 7,
             { width: cols[2].w - 8, align: 'left', lineBreak: false })

    doc.font('Helvetica').fontSize(9).fillColor(C.text)
       .text(pct != null ? `${pct}%` : '—', cols[3].x + 4, y + 7,
             { width: cols[3].w - 8, align: 'right', lineBreak: false })

    doc.font('Helvetica-Bold').fontSize(10).fillColor(gradeColor(grade))
       .text(grade ?? '—', cols[4].x + 4, y + 6,
             { width: cols[4].w - 8, align: 'center', lineBreak: false })

    const resultColor = result?.toLowerCase() === 'pass' ? C.success : result ? C.danger : C.muted
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(resultColor)
       .text(result ?? '—', cols[5].x + 4, y + 7,
             { width: cols[5].w - 8, align: 'center', lineBreak: false })

    y += rowH
  })

  // Summary footer
  y += 8
  const passed = students.filter(s => String(s.overallResult ?? '').toLowerCase() === 'pass').length
  const failed  = students.filter(s => String(s.overallResult ?? '').toLowerCase() === 'fail').length
  summaryBar(doc, y, M, CW, [
    { label: 'Total Students', value: String(students.length) },
    { label: 'Passed',         value: String(passed), highlight: true },
    { label: 'Failed',         value: String(failed) },
  ])

  doc.rect(M - 4, M - 4, CW + 8, A4.h - M * 2 + 8).strokeColor(C.softBdr).lineWidth(1).stroke()
}

// ══════════════════════════════════════════════════════════════
// ROUTE HANDLER
// ══════════════════════════════════════════════════════════════
// ROUTE HANDLER
// ══════════════════════════════════════════════════════════════
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

    // Determine page size from template
    const isLandscapeA3 = vm.template === 'rubric_register'
    const doc = new PDFDocument({
      margin: 0,
      size: isLandscapeA3 ? 'A3' : 'A4',
      layout: isLandscapeA3 ? 'landscape' : 'portrait',
    })

    switch (vm.template) {
      case 'annual_average':       renderAnnualAverage(doc, vm);       break
      case 'annual_summary':       renderAnnualSummary(doc, vm);       break
      case 'rubric_register':      renderRubricRegister(doc, vm);      break
      case 'class_results':        renderClassResults(doc, vm);        break
      default:
        return NextResponse.json({ error: `PDF not implemented for template: ${vm.template}` }, { status: 400 })
    }

    const pdfPromise = bufferFromStream(doc as unknown as Readable)
    doc.end()
    const pdf = await pdfPromise

    return new NextResponse(pdf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="report.pdf"',
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