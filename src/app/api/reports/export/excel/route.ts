// /src/app/api/reports/export/excel/route.ts
//
// Requires: npm install exceljs   (likely already installed)

import { NextResponse } from 'next/server'
import ExcelJS          from 'exceljs'

// ─── Shared Helpers ───────────────────────────────────────────────────────────

const SCHOOL = 'Khadija Kazi Ali Memorial Higher Secondary School'

type WS = ExcelJS.Worksheet

function hdrStyle(bold = false): Partial<ExcelJS.Style> {
  return {
    font:      { bold, size: 11 },
    fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } },
    border:    allBorders(),
    alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
  }
}

function cellStyle(bold = false, bg?: string): Partial<ExcelJS.Style> {
  return {
    font:      { bold, size: 10 },
    fill:      bg ? { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } } : { type: 'pattern', pattern: 'none' },
    border:    allBorders(),
    alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
  }
}

function allBorders(): Partial<ExcelJS.Borders> {
  const s = { style: 'thin' as ExcelJS.BorderStyle }
  return { top: s, left: s, bottom: s, right: s }
}

function mergeWrite(ws: WS, range: string, value: string, style: Partial<ExcelJS.Style>) {
  ws.mergeCells(range)
  const cell    = ws.getCell(range.split(':')[0])
  cell.value    = value
  cell.style    = style
}

function studentInfoRows(ws: WS, vm: any, startRow: number): number {
  let r = startRow
  ws.getRow(r).height = 14
  const s = vm.student
  const info: [string, string][] = [
    ['G.R. No.', s.gr_no || ''],
    ['Student Name', s.full_name],
    ['Father\'s Name', s.father_name ?? ''],
    ['Class / Section', `${s.class_name} — ${s.section_name}`],
  ]
  for (const [label, value] of info) {
    ws.mergeCells(`A${r}:B${r}`)
    ws.getCell(`A${r}`).value = label
    ws.getCell(`A${r}`).font  = { bold: true, size: 10 }
    ws.mergeCells(`C${r}:F${r}`)
    ws.getCell(`C${r}`).value = value
    ws.getCell(`C${r}`).font  = { size: 10 }
    r++
  }
  return r + 1
}

// ─── High School Sheet ────────────────────────────────────────────────────────

function writeHighSchool(ws: WS, vm: any) {
  const isPatron = vm.audience === 'patron'
  ws.columns = [
    { key: 'subject',  width: 26 },
    { key: 'max',      width: 14 },
    { key: 'obtained', width: 14 },
    { key: 'pct',      width: 12 },
    { key: 'grade',    width: 10 },
  ]

  // Title rows
  ws.mergeCells('A1:E1'); const t1 = ws.getCell('A1')
  t1.value = SCHOOL; t1.font = { bold: true, size: 12 }; t1.alignment = { horizontal: 'center' }

  ws.mergeCells('A2:E2'); const t2 = ws.getCell('A2')
  t2.value = isPatron ? `Patron Report — ${vm.academicYear}` : vm.examName
  t2.font  = { bold: false, size: 11 }; t2.alignment = { horizontal: 'center' }

  let r = studentInfoRows(ws, vm, 4)

  // Column headers
  const hdrs = ['Subject', 'Maximum Marks', 'Marks Obtained', 'Percentage', 'Grade']
  hdrs.forEach((h, i) => {
    const cell = ws.getCell(r, i + 1)
    cell.value = h; cell.style = hdrStyle(true)
  })
  r++

  // Subject rows
  for (const row of vm.rows) {
    const vals = [
      row.subject,
      row.max_marks,
      row.is_absent ? 'Ab' : (row.obtained_marks ?? '—'),
      row.percentage ?? '—',
      row.grade,
    ]
    vals.forEach((v, i) => {
      const cell = ws.getCell(r, i + 1)
      cell.value = v; cell.style = cellStyle(false)
      if (i === 0) cell.alignment = { horizontal: 'left', vertical: 'middle' }
    })
    r++
  }

  // Behaviour rows (student report only)
  if (!isPatron && vm.behaviour) {
    for (const b of vm.behaviour) {
      const vals = [b.title, b.max, b.obtained ?? '—', b.percentage ?? '—', b.grade]
      vals.forEach((v, i) => {
        const cell = ws.getCell(r, i + 1)
        cell.value = v; cell.style = cellStyle(false)
        if (i === 0) cell.alignment = { horizontal: 'left', vertical: 'middle' }
      })
      r++
    }
  }

  // Grand total
  const gt = vm.grand_total
  ;['Grand Total', gt.max, gt.obtained, gt.percentage ?? '—', gt.grade].forEach((v, i) => {
    const cell = ws.getCell(r, i + 1)
    cell.value = v; cell.style = hdrStyle(true)
    if (i === 0) cell.alignment = { horizontal: 'left', vertical: 'middle' }
  })
  r += 2

  // Attendance
  ws.mergeCells(`A${r}:E${r}`)
  ws.getCell(`A${r}`).value = `Attendance — Total: ${vm.attendance?.total_days ?? '___'}   Present: ${vm.attendance?.days_present ?? '___'}`
  ws.getCell(`A${r}`).font  = { size: 10 }
  r++

  // Remarks for patron
  if (isPatron) {
    r++
    ws.mergeCells(`A${r}:E${r}`)
    ws.getCell(`A${r}`).value = 'Remarks:'
    ws.getCell(`A${r}`).font  = { bold: true, size: 10 }
    r++
    ws.mergeCells(`A${r}:E${r}`)
    ws.getCell(`A${r}`).value = ''
    ws.getCell(`A${r}`).border = { bottom: { style: 'thin' } }
    r++
  }
}

// ─── Secondary Quarterly Sheet ────────────────────────────────────────────────

function writeSecondaryQuarterly(ws: WS, vm: any) {
  ws.columns = [
    { key: 'subject',  width: 26 },
    { key: 'max',      width: 14 },
    { key: 'obtained', width: 14 },
    { key: 'pct',      width: 12 },
    { key: 'grade',    width: 10 },
  ]

  ws.mergeCells('A1:E1')
  ws.getCell('A1').value = SCHOOL
  ws.getCell('A1').font  = { bold: true, size: 12 }
  ws.getCell('A1').alignment = { horizontal: 'center' }

  ws.mergeCells('A2:E2')
  ws.getCell('A2').value = vm.examName
  ws.getCell('A2').font  = { size: 11 }
  ws.getCell('A2').alignment = { horizontal: 'center' }

  let r = studentInfoRows(ws, vm, 4)

  ;['Subject','Maximum Marks','Marks Obtained','Percentage','Grade'].forEach((h, i) => {
    const cell = ws.getCell(r, i + 1); cell.value = h; cell.style = hdrStyle(true)
  })
  r++

  for (const row of vm.rows) {
    ;[row.subject, row.max_marks, row.is_absent ? 'Ab' : (row.obtained_marks ?? '—'), row.percentage ?? '—', row.grade].forEach((v, i) => {
      const cell = ws.getCell(r, i + 1); cell.value = v; cell.style = cellStyle()
      if (i === 0) cell.alignment = { horizontal: 'left', vertical: 'middle' }
    })
    r++
  }

  const gt = vm.grand_total
  ;['Grand Total', gt.max, gt.obtained, gt.percentage ?? '—', gt.grade].forEach((v, i) => {
    const cell = ws.getCell(r, i + 1); cell.value = v; cell.style = hdrStyle(true)
    if (i === 0) cell.alignment = { horizontal: 'left', vertical: 'middle' }
  })
}

// ─── Secondary Term / Annual Sheet ───────────────────────────────────────────

function writeSecondaryComplex(ws: WS, vm: any) {
  const isAnnual = vm.template === 'secondary_annual'

  ws.columns = [
    { key: 'subject',    width: 20 },
    { key: 'component',  width: 30 },
    { key: 'max',        width: 13 },
    { key: 'obtained',   width: 13 },
    { key: 'percentage', width: 12 },
    { key: 'grade',      width: 10 },
  ]

  ws.mergeCells('A1:F1')
  ws.getCell('A1').value = SCHOOL; ws.getCell('A1').font = { bold: true, size: 12 }; ws.getCell('A1').alignment = { horizontal: 'center' }

  ws.mergeCells('A2:F2')
  ws.getCell('A2').value = vm.examName; ws.getCell('A2').font = { size: 11 }; ws.getCell('A2').alignment = { horizontal: 'center' }

  let r = studentInfoRows(ws, vm, 4)

  ;['Subjects','Components','Max. Marks','Marks Obtained','Percentage','Grade'].forEach((h, i) => {
    const cell = ws.getCell(r, i + 1); cell.value = h; cell.style = hdrStyle(true)
  })
  r++

  // Subject rows with merged subject cell
  for (const row of vm.rows) {
    const startRow = r
    const compCount = row.components.length

    for (let ci = 0; ci < compCount; ci++) {
      const comp = row.components[ci]

      if (ci === 0 && compCount > 1) {
        ws.mergeCells(`A${startRow}:A${startRow + compCount - 1}`)
      }
      const subjectCell = ws.getCell(startRow, 1)
      subjectCell.value     = row.subject
      subjectCell.style     = cellStyle(true)
      subjectCell.alignment = { horizontal: 'left', vertical: 'middle' }

      const compCell = ws.getCell(r, 2)
      compCell.value = comp.label
      compCell.style = comp.is_computed ? cellStyle(true, 'FFF4F4F4') : cellStyle(false)
      compCell.alignment = { horizontal: 'left', vertical: 'middle' }

      ws.getCell(r, 3).value = comp.max;     ws.getCell(r, 3).style = comp.is_computed ? cellStyle(true, 'FFF4F4F4') : cellStyle()
      ws.getCell(r, 4).value = comp.obtained !== null ? comp.obtained : '—'; ws.getCell(r, 4).style = comp.is_computed ? cellStyle(true, 'FFF4F4F4') : cellStyle()

      if (ci === 0) {
        if (compCount > 1) {
          ws.mergeCells(`E${startRow}:E${startRow + compCount - 1}`)
          ws.mergeCells(`F${startRow}:F${startRow + compCount - 1}`)
        }
        ws.getCell(startRow, 5).value = row.percentage ?? '—'
        ws.getCell(startRow, 5).style = cellStyle()
        ws.getCell(startRow, 5).alignment = { horizontal: 'center', vertical: 'middle' }
        ws.getCell(startRow, 6).value = row.grade
        ws.getCell(startRow, 6).style = cellStyle()
        ws.getCell(startRow, 6).alignment = { horizontal: 'center', vertical: 'middle' }
      }

      r++
    }
  }

  // Behaviour rows
  for (const b of vm.behaviour) {
    ;[b.title, b.label, b.max, b.obtained ?? '—', b.percentage ?? '—', b.grade].forEach((v, i) => {
      const cell = ws.getCell(r, i + 1); cell.value = v; cell.style = cellStyle()
      if (i === 0) { cell.font = { bold: true, size: 10 }; cell.alignment = { horizontal: 'left', vertical: 'middle' } }
      if (i === 1) cell.alignment = { horizontal: 'left', vertical: 'middle' }
    })
    r++
  }

  // Total row
  const totalLabel = isAnnual ? 'Total Annual Max. Marks' : 'Total Max. Marks'
  ws.mergeCells(`A${r}:B${r}`)
  ws.getCell(`A${r}`).value = totalLabel; ws.getCell(`A${r}`).style = hdrStyle(true); ws.getCell(`A${r}`).alignment = { horizontal: 'left', vertical: 'middle' }
  ;[vm.total_max_marks, vm.total_obtained ?? '—', vm.overall_percentage ?? '—', vm.overall_grade ?? '—'].forEach((v, i) => {
    const cell = ws.getCell(r, i + 3); cell.value = v; cell.style = hdrStyle(true)
  })
  r += 2

  ws.mergeCells(`A${r}:F${r}`)
  ws.getCell(`A${r}`).value = `Attendance — Total: ${vm.attendance?.total_days ?? '___'}   Present: ${vm.attendance?.days_present ?? '___'}`
  ws.getCell(`A${r}`).font  = { size: 10 }
}

// ─── Primary Rubric Sheet ─────────────────────────────────────────────────────

function writePrimaryRubric(ws: WS, vm: any) {
  ws.columns = [{ key: 'a', width: 34 }, { key: 'b', width: 10 }, { key: 'c', width: 2 }, { key: 'd', width: 34 }, { key: 'e', width: 10 }]

  ws.mergeCells('A1:E1'); ws.getCell('A1').value = SCHOOL; ws.getCell('A1').font = { bold: true, size: 12 }; ws.getCell('A1').alignment = { horizontal: 'center' }
  ws.mergeCells('A2:E2'); ws.getCell('A2').value = vm.examName; ws.getCell('A2').font = { size: 11 }; ws.getCell('A2').alignment = { horizontal: 'center' }
  ws.mergeCells('A3:E3'); ws.getCell('A3').value = `${vm.student.full_name}  —  ${vm.student.class_name} ${vm.student.section_name}`; ws.getCell('A3').font = { size: 10 }; ws.getCell('A3').alignment = { horizontal: 'center' }

  let r = 5
  const groups = Object.entries(vm.skill_groups ?? {})
  const half   = Math.ceil(groups.length / 2)
  const leftGroups  = groups.slice(0, half)
  const rightGroups = groups.slice(half)

  const maxRows = Math.max(
    leftGroups.reduce((s, [, skills]) => s + (skills as any[]).length + 1, 0),
    rightGroups.reduce((s, [, skills]) => s + (skills as any[]).length + 1, 0)
  )

  function writeGroup(groups: any[], colOffset: number, startRow: number) {
    let row = startRow
    for (const [groupName, skills] of groups) {
      ws.getCell(row, colOffset).value     = groupName
      ws.getCell(row, colOffset).font      = { bold: true, size: 10 }
      ws.getCell(row, colOffset).fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } }
      ws.getCell(row, colOffset + 1).fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } }
      row++
      for (const s of (skills as any[])) {
        ws.getCell(row, colOffset).value = s.text; ws.getCell(row, colOffset).font = { size: 10 }
        ws.getCell(row, colOffset + 1).value = s.grade; ws.getCell(row, colOffset + 1).font = { bold: true, size: 10 }; ws.getCell(row, colOffset + 1).alignment = { horizontal: 'center' }
        row++
      }
    }
  }

  writeGroup(leftGroups,  1, r)
  writeGroup(rightGroups, 4, r)
  r += maxRows + 2

  ws.mergeCells(`A${r}:E${r}`)
  ws.getCell(`A${r}`).value = `Attendance — Total: ${vm.attendance?.total_days ?? '___'}   Present: ${vm.attendance?.days_present ?? '___'}`
}

// ─── Primary Patron Sheet ─────────────────────────────────────────────────────

function writePrimaryPatron(ws: WS, vm: any) {
  ws.columns = [{ key: 'a', width: 38 }, { key: 'b', width: 12 }]

  ws.mergeCells('A1:B1'); ws.getCell('A1').value = SCHOOL; ws.getCell('A1').font = { bold: true, size: 12 }; ws.getCell('A1').alignment = { horizontal: 'center' }
  ws.mergeCells('A2:B2'); ws.getCell('A2').value = 'Patron Report'; ws.getCell('A2').font = { size: 11 }; ws.getCell('A2').alignment = { horizontal: 'center' }
  ws.mergeCells('A3:B3'); ws.getCell('A3').value = `${vm.student.full_name}  —  ${vm.student.class_name}`; ws.getCell('A3').font = { size: 10 }; ws.getCell('A3').alignment = { horizontal: 'center' }

  let r = 5
  ;['Title','Grade'].forEach((h, i) => {
    const c = ws.getCell(r, i + 1); c.value = h; c.style = hdrStyle(true)
    if (i === 0) c.alignment = { horizontal: 'left' }
  })
  r++

  for (const s of (vm.patron_skills ?? [])) {
    ws.getCell(r, 1).value = s.title; ws.getCell(r, 1).style = cellStyle(); ws.getCell(r, 1).alignment = { horizontal: 'left' }
    ws.getCell(r, 2).value = s.grade; ws.getCell(r, 2).style = cellStyle(true)
    r++
  }

  r += 2
  ws.mergeCells(`A${r}:B${r}`)
  ws.getCell(`A${r}`).value = 'Remarks:'; ws.getCell(`A${r}`).font = { bold: true, size: 10 }
  r++
  ws.mergeCells(`A${r}:B${r}`)
  ws.getCell(`A${r}`).border = { bottom: { style: 'thin' } }
  r += 2
  ws.mergeCells(`A${r}:B${r}`)
  ws.getCell(`A${r}`).value = 'Conclusion:'; ws.getCell(`A${r}`).font = { bold: true, size: 10 }
  r++
  ws.mergeCells(`A${r}:B${r}`)
  ws.getCell(`A${r}`).border = { bottom: { style: 'thin' } }
}

// ─── Dispatch to Sheet Writer ─────────────────────────────────────────────────

function writeSheet(ws: WS, vm: any) {
  switch (vm.template) {
    case 'high_school_term':
    case 'high_school_patron':    writeHighSchool(ws, vm);          break
    case 'secondary_quarterly':   writeSecondaryQuarterly(ws, vm);  break
    case 'secondary_term':
    case 'secondary_annual':      writeSecondaryComplex(ws, vm);    break
    case 'primary_rubric':        writePrimaryRubric(ws, vm);       break
    case 'primary_patron':        writePrimaryPatron(ws, vm);       break
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const origin = new URL(request.url).origin
    const genRes = await fetch(`${origin}/api/reports/generate`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
    const genJson = await genRes.json()
    if (!genJson.success) return NextResponse.json({ error: genJson.error }, { status: 400 })

    const reports: any[] = genJson.data?.reports ?? [genJson.data]

    const wb = new ExcelJS.Workbook()
    wb.creator  = SCHOOL
    wb.created  = new Date()

    for (const vm of reports) {
      const sheetName = reports.length === 1
        ? 'Report'
        : vm.student.full_name.substring(0, 31).replace(/[*?:/\\[\]]/g, '')

      const ws = wb.addWorksheet(sheetName, {
        pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
      })
      writeSheet(ws, vm)
    }

    const buffer   = await wb.xlsx.writeBuffer()
    const firstName = reports[0]?.student?.full_name?.replace(/\s+/g, '_') ?? 'report'
    const filename  = reports.length > 1
      ? `${reports[0]?.student?.class_name?.replace(/\s+/g, '_')}_reports.xlsx`
      : `${firstName}_report.xlsx`

    return new Response(buffer, {
      headers: {
        'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })

  } catch (err: any) {
    console.error('Excel export error:', err)
    return NextResponse.json({ error: err?.message ?? 'Excel generation failed' }, { status: 500 })
  }
}