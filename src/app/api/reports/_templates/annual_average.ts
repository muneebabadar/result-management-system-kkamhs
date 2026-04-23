export function annualAverageHtml(vm: any) {
  const blocks = (vm.blocks || [])
    .map((b: any) => {
      const rows = (b.components || [])
        .map(
          (c: any) => `
          <tr>
            <td class="left">${escapeHtml(c.label)}</td>
            <td>${c.max}</td>
            <td>${c.is_absent ? 'Ab' : c.obtained ?? '—'}</td>
          </tr>
        `
        )
        .join('')

      return `
        <div class="block">
          <div class="blockHead">
            <div><b>${escapeHtml(b.subject)}</b></div>
            <div class="right"><b>%:</b> ${b.pct ?? '—'} &nbsp; <b>Grade:</b> ${b.grade ?? '—'}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th class="left">Component</th>
                <th>Max</th>
                <th>Obtained</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `
    })
    .join('')

  const a = vm.attendance
  const b = vm.behaviour

  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; }
    .title { text-align:center; font-weight:700; font-size:16px; margin-bottom:6px; }
    .meta { display:flex; justify-content:space-between; margin-bottom:10px; }
    .box { border:1px solid #000; padding:8px; }
    .block { margin-top:10px; }
    .blockHead { display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; }
    table { width:100%; border-collapse:collapse; }
    th, td { border:1px solid #000; padding:6px; text-align:center; }
    th.left, td.left { text-align:left; }
    .two { display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:10px; }
    .sign { margin-top:18px; display:flex; justify-content:space-between; }
    .line { border-top:1px solid #000; width:180px; margin-top:28px; text-align:center; padding-top:4px; }
  </style>
</head>
<body>
  <div class="title">${escapeHtml(vm.examName)} — Annual Average</div>

  <div class="meta">
    <div class="box" style="width:60%">
      <div><b>Name:</b> ${escapeHtml(vm.student.full_name)}</div>
      <div><b>Father:</b> ${escapeHtml(vm.student.father_name ?? '')}</div>
      <div><b>Class:</b> ${escapeHtml(vm.student.class_name ?? '')} &nbsp;&nbsp; <b>Section:</b> ${escapeHtml(vm.student.section_name ?? '')}</div>
      <div><b>Roll No:</b> ${escapeHtml(vm.student.roll_number ?? '')}</div>
      <div><b>Academic Year:</b> ${escapeHtml(vm.student.academic_year_name ?? '')}</div>
    </div>
    <div class="box" style="width:38%">
      <div><b>Overall %:</b> ${vm.overall?.pct ?? '—'}</div>
      <div><b>Overall Grade:</b> ${vm.overall?.grade ?? '—'}</div>
      <div style="margin-top:6px"><b>Attendance:</b> ${a?.days_present ?? '—'} / ${a?.total_days ?? '—'}</div>
    </div>
  </div>

  ${blocks}

  <div class="two">
    <div class="box">
      <div><b>Behaviour</b></div>
      <div>Cleanliness: ${b?.cleanliness ?? '—'}</div>
      <div>Discipline: ${b?.discipline ?? '—'}</div>
      <div>Punctuality: ${b?.punctuality ?? '—'}</div>
      <div>Regularity: ${b?.regularity ?? '—'}</div>
    </div>

    <div class="box">
      <div><b>Remarks</b></div>
      <div style="height:70px"></div>
    </div>
  </div>

  <div class="sign">
    <div class="line">Class Teacher</div>
    <div class="line">Principal</div>
    <div class="line">Date</div>
  </div>
</body>
</html>
`
}

function escapeHtml(s: string) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}
