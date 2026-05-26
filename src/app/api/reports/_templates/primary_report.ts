/**
 * primary_report.ts
 *
 * Generates an HTML report card for primary classes (Grade 1–5) that exactly
 * matches the physical report card format (scanned sample: grade_1_to_5_student_report.jpeg).
 *
 * Layout:
 *   • Header: Student Name, G.R. No., Class/Sec., Grade Key, Term/Attendance box
 *   • Body: two-column skill table layout
 *       Left column  → 1. ENGLISH  (i–v sub-sections)
 *                      2. URDU     (i–v sub-sections)
 *       Right column → 3. MATHEMATICS SKILLS
 *                      4. SOCIAL SCIENCE SKILLS
 *                      5. WORK SKILLS
 *                      6. SOCIAL SKILLS
 *                      7. PARENTAL INVOLVEMENT
 *   • Footer: General Remark, Concluding Remarks, signature line
 *
 * ViewModel shape (PrimaryReportVm):
 * {
 *   schoolName?:   string
 *   term:          string          // e.g. "3rd Term"  |  "Annual"
 *   termLabel?:    string          // printed next to "3rd Term" — e.g. "Mar–May  ANNUAL"
 *
 *   student: {
 *     full_name:         string
 *     gr_number:         string | null
 *     class_name:        string | null
 *     section_name:      string | null
 *   }
 *
 *   attendance: {
 *     total_days:   number | null
 *     days_present: number | null
 *     days_absent:  number | null
 *   }
 *
 *   // Each subject has sub-sections; each sub-section has skill rows.
 *   // grade is one of: A+, A, B, C, U  (or null if not yet filled)
 *   english: SubjectWithSections        // subject #1
 *   urdu:    SubjectWithSections        // subject #2
 *   mathematics:   SkillSection[]       // subject #3 – flat list of skill rows
 *   social_science: SkillSection[]      // subject #4
 *   work_skills:    SkillSection[]      // subject #5
 *   social_skills:  SkillSection[]      // subject #6
 *   parental:       SkillSection[]      // subject #7
 *
 *   general_remark:     string | null
 *   concluding_remarks: string | null
 * }
 *
 * SubjectWithSections = { sections: { label: string; skills: SkillRow[] }[] }
 * SkillRow            = { label: string; grade: string | null }
 * SkillSection        = { label: string; grade: string | null }
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SkillRow {
  label: string
  grade: string | null
}

export interface NamedSection {
  label:  string          // e.g. "(i) Listening Skills"
  skills: SkillRow[]
}

export interface SubjectWithSections {
  sections: NamedSection[]
}

export interface PrimaryReportAttendance {
  total_days:   number | null
  days_present: number | null
  days_absent:  number | null
}

export interface PrimaryReportStudent {
  full_name:    string
  gr_number:    string | null
  class_name:   string | null
  section_name: string | null
}

export interface PrimaryReportVm {
  schoolName?:         string
  term:                string
  termLabel?:          string

  student:             PrimaryReportStudent
  attendance:          PrimaryReportAttendance

  english:             SubjectWithSections
  urdu:                SubjectWithSections
  mathematics:         SkillRow[]
  social_science:      SkillRow[]
  work_skills:         SkillRow[]
  social_skills:       SkillRow[]
  parental:            SkillRow[]

  general_remark:      string | null
  concluding_remarks:  string | null
}

// ─── Grade Key (fixed — matches the physical card) ────────────────────────────

const GRADE_KEY = [
  { grade: 'A+', pct: '90', desc: 'Excellent / Always'           },
  { grade: 'A',  pct: '80', desc: 'Good / Often'                 },
  { grade: 'B',  pct: '70', desc: 'Fair / Occasionally'          },
  { grade: 'C',  pct: '60', desc: 'Just Satisfactory / Seldom'   },
  { grade: 'U',  pct: '40', desc: 'Unsatisfactory / Never'       },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function e(s: string | null | undefined): string {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function gradeCell(grade: string | null): string {
  return `<td class="grade-cell">${e(grade)}</td>`
}

// ─── Section renderers ────────────────────────────────────────────────────────

/**
 * Renders one language subject (English / Urdu) with sub-sections.
 *
 * Layout matches the physical card:
 *   • Subject header row  → number + full-width title (no Grade cell)
 *   • First sub-section   → label | "Grade" header  (establishes the column)
 *   • Remaining sub-sections → label spanning both columns
 *   • Skill rows          → label | grade cell
 */
function renderLanguageSubject(num: number, title: string, subj: SubjectWithSections): string {
  const rows = subj.sections
    .map((sec, secIdx) => {
      const subRows = sec.skills
        .map(sk => `
          <tr>
            <td class="skill-label">${e(sk.label)}</td>
            ${gradeCell(sk.grade)}
          </tr>`)
        .join('')

      // "Grade" column header appears only on the first sub-section row
      const secHeaderRow = secIdx === 0
        ? `<tr class="subsection-header">
             <td class="subsection-title">${e(sec.label)}</td>
             <td class="col-grade-head">Grade</td>
           </tr>`
        : `<tr class="subsection-header">
             <td class="subsection-title" colspan="2">${e(sec.label)}</td>
           </tr>`

      return `${secHeaderRow}${subRows}`
    })
    .join('')

  return `
    <table class="skill-table">
      <thead>
        <tr class="subject-header">
          <td class="subject-num">${num}</td>
          <td class="subject-title" colspan="2">${e(title)}</td>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`
}

/** Renders a simple skill-list subject (no sub-sections) */
function renderSkillList(num: number, title: string, skills: SkillRow[]): string {
  const rows = skills
    .map(sk => `
      <tr>
        <td class="skill-label" colspan="2">${e(sk.label)}</td>
        ${gradeCell(sk.grade)}
      </tr>`)
    .join('')

  return `
    <table class="skill-table">
      <thead>
        <tr class="subject-header">
          <td class="subject-num">${num}</td>
          <td class="subject-title">${e(title)}</td>
          <td class="col-grade-head">Grade</td>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function primaryReportHtml(vm: PrimaryReportVm): string {
  const a = vm.attendance

  // Grade key table rows
  const gradeKeyRows = GRADE_KEY.map(
    g => `<tr>
            <td class="gk-pct">${e(g.pct)}</td>
            <td class="gk-grade">${e(g.grade)}</td>
            <td class="gk-desc">${e(g.desc)}</td>
          </tr>`
  ).join('')

  // Left column: English + Urdu
  const leftCol = [
    renderLanguageSubject(1, 'ENGLISH', vm.english),
    renderLanguageSubject(2, 'URDU',    vm.urdu),
  ].join('\n')

  // Right column: Maths, Social Science, Work Skills, Social Skills, Parental
  const rightCol = [
    renderSkillList(3, 'MATHEMATICS SKILLS',    vm.mathematics),
    renderSkillList(4, 'SOCIAL SCIENCE SKILLS', vm.social_science),
    renderSkillList(5, 'WORK SKILLS',           vm.work_skills),
    renderSkillList(6, 'SOCIAL SKILLS',         vm.social_skills),
    renderSkillList(7, 'PARENTAL INVOLVEMENT',  vm.parental),
  ].join('\n')

  const termDateLabel = vm.termLabel ? `<span class="term-date">${e(vm.termLabel)}</span>` : ''

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Primary Report Card — ${e(vm.student.full_name)}</title>
  <style>
    /* ── Reset & base ── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      color: #000;
      background: #fff;
      padding: 14px 18px;
    }

    /* ── School name banner ── */
    .school-name {
      text-align: center;
      font-size: 15px;
      font-weight: 700;
      letter-spacing: .5px;
      margin-bottom: 6px;
    }

    /* ── Top bar: grade key | student info | GR / class | attendance ── */
    .top-bar {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 0;
      border: 1px solid #000;
      margin-bottom: 8px;
    }

    /* Grade Key cell */
    .grade-key-cell {
      border-right: 1px solid #000;
      padding: 4px 6px;
    }
    .grade-key-cell table { border-collapse: collapse; font-size: 10.5px; }
    .grade-key-cell thead td {
      font-weight: 700;
      padding-bottom: 2px;
    }
    .gk-pct  { width: 22px; text-align: right; padding-right: 4px; }
    .gk-grade{ width: 22px; font-weight: 700; }
    .gk-desc { }

    /* Student info cell */
    .student-info-cell {
      padding: 5px 8px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 4px;
    }
    .info-row {
      display: flex;
      align-items: baseline;
      gap: 4px;
      font-size: 11px;
    }
    .info-label { font-weight: 700; white-space: nowrap; }
    .info-line  {
      flex: 1;
      border-bottom: 1px solid #000;
      min-width: 80px;
    }

    /* Right: GR No + Class + Attendance */
    .right-info-cell {
      border-left: 1px solid #000;
      padding: 5px 8px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 4px;
      min-width: 175px;
    }
    .gr-class-row {
      display: flex;
      gap: 12px;
      align-items: baseline;
    }
    .attendance-table { border-collapse: collapse; width: 100%; font-size: 10.5px; margin-top: 4px; }
    .attendance-table td { border: 1px solid #000; padding: 2px 5px; }
    .attendance-table td:first-child { font-weight: 700; }
    .att-val { min-width: 35px; }
    .term-date { font-style: italic; font-size: 10px; margin-left: 4px; }

    /* ── Two-column body ── */
    .body-columns {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0 8px;
      align-items: start;
    }

    /* ── Skill tables ── */
    .skill-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 5px;
      font-size: 10.5px;
    }
    .skill-table td, .skill-table th {
      border: 1px solid #000;
      padding: 2px 4px;
    }

    /* Subject header row */
    .subject-header { background: #e8e8e8; }
    .subject-num   { width: 14px; font-weight: 700; text-align: center; padding: 2px 3px; }
    .subject-title { font-weight: 700; text-transform: uppercase; font-size: 10.5px; }
    .col-grade-head{ width: 36px; font-weight: 700; text-align: center; font-size: 10px; }

    /* Sub-section header row */
    .subsection-header td { background: #f5f5f5; }
    .subsection-title {
      font-weight: 700;
      font-size: 10px;
      padding-left: 6px;
      font-style: italic;
    }

    /* Skill row */
    .skill-label  { padding-left: 10px; }
    .grade-cell   { width: 36px; text-align: center; font-weight: 700; }

    /* ── Remarks section ── */
    .remarks-section {
      margin-top: 8px;
      border: 1px solid #000;
      padding: 5px 8px;
    }
    .remark-row {
      display: flex;
      align-items: baseline;
      gap: 6px;
      margin-bottom: 6px;
      font-size: 11px;
    }
    .remark-label { font-weight: 700; white-space: nowrap; }
    .remark-line  {
      flex: 1;
      border-bottom: 1px solid #000;
    }

    /* ── Signature row ── */
    .signature-row {
      margin-top: 22px;
      display: flex;
      justify-content: space-between;
    }
    .sig-block {
      text-align: center;
      width: 150px;
    }
    .sig-line {
      border-top: 1px solid #000;
      padding-top: 3px;
      font-size: 10.5px;
    }

    /* ── Print ── */
    @media print {
      body { padding: 0; }
      @page { margin: 10mm; }
    }
  </style>
</head>
<body>

  ${vm.schoolName ? `<div class="school-name">${e(vm.schoolName)}</div>` : ''}

  <!-- ── Top bar ── -->
  <div class="top-bar">

    <!-- Grade Key -->
    <div class="grade-key-cell">
      <table>
        <thead><tr><td colspan="3"><b>Grade Key</b></td></tr></thead>
        <tbody>${gradeKeyRows}</tbody>
      </table>
    </div>

    <!-- Student info -->
    <div class="student-info-cell">
      <div class="info-row">
        <span class="info-label">Student Name:</span>
        <span class="info-line">&nbsp;${e(vm.student.full_name)}</span>
      </div>
    </div>

    <!-- GR No / Class / Attendance -->
    <div class="right-info-cell">
      <div class="gr-class-row">
        <div class="info-row" style="gap:3px">
          <span class="info-label">G.R. No.</span>
          <span class="info-line">&nbsp;${e(vm.student.gr_number)}</span>
        </div>
      </div>
      <div class="info-row" style="gap:3px">
        <span class="info-label">Class/Sec.:</span>
        <span class="info-line">&nbsp;${e(vm.student.class_name)}${vm.student.section_name ? ' / ' + e(vm.student.section_name) : ''}</span>
      </div>
      <table class="attendance-table">
        <tr>
          <td>${e(vm.term)}</td>
          <td class="att-val" colspan="2">${termDateLabel}</td>
        </tr>
        <tr>
          <td>Total School Days</td>
          <td class="att-val">${a.total_days ?? ''}</td>
        </tr>
        <tr>
          <td>Days Present</td>
          <td class="att-val">${a.days_present ?? ''}</td>
        </tr>
        <tr>
          <td>Days Absent</td>
          <td class="att-val">${a.days_absent ?? ''}</td>
        </tr>
      </table>
    </div>

  </div><!-- /top-bar -->

  <!-- ── Two-column skill body ── -->
  <div class="body-columns">
    <div class="left-col">${leftCol}</div>
    <div class="right-col">${rightCol}</div>
  </div>

  <!-- ── Remarks ── -->
  <div class="remarks-section">
    <div class="remark-row">
      <span class="remark-label">General Remark:</span>
      <span class="remark-line">&nbsp;${e(vm.general_remark)}</span>
    </div>
    <div class="remark-row">
      <span class="remark-label">Concluding Remarks:</span>
      <span class="remark-line">&nbsp;${e(vm.concluding_remarks)}</span>
    </div>
  </div>

  <!-- ── Signatures ── -->
  <div class="signature-row">
    <div class="sig-block"><div class="sig-line">Class Teacher</div></div>
    <div class="sig-block"><div class="sig-line">Principal</div></div>
    <div class="sig-block"><div class="sig-line">Date</div></div>
    <div class="sig-block"><div class="sig-line">Parent's Signature</div></div>
  </div>

</body>
</html>`
}

// ─── Default skill definitions (matches the physical card) ────────────────────
// Use these to build the vm when no custom skills are configured.

export const DEFAULT_PRIMARY_SKILLS = {
  english: {
    sections: [
      {
        label: '(i) Listening Skills',
        skills: [
          { label: 'Listens attentively during oral work', grade: null },
          { label: 'Understands and follows oral directions', grade: null },
        ],
      },
      {
        label: '(ii) Spoken English',
        skills: [
          { label: 'Speaks clearly and fluently', grade: null },
          { label: 'Participates in class discussions', grade: null },
        ],
      },
      {
        label: '(iii) Reading',
        skills: [
          { label: 'Reads with fluency', grade: null },
          { label: 'Understands and can answer the question about it.', grade: null },
        ],
      },
      {
        label: '(iv) Handwriting',
        skills: [
          { label: 'Formation of letters', grade: null },
          { label: 'Presentation of work', grade: null },
          { label: 'Speed of writing', grade: null },
        ],
      },
      {
        label: '(v) Writing Skills',
        skills: [
          { label: 'Knows Spellings', grade: null },
          { label: 'Can write answer with correct sentence structure', grade: null },
          { label: 'Composition Skills', grade: null },
        ],
      },
    ],
  },

  urdu: {
    sections: [
      {
        label: '(i) Listening Skills',
        skills: [
          { label: 'Listens attentively during oral work', grade: null },
          { label: 'Understands and follows oral directions', grade: null },
        ],
      },
      {
        label: '(ii) Spoken Urdu',
        skills: [
          { label: 'Speaks clearly and fluently', grade: null },
          { label: 'Participates in class discussions', grade: null },
        ],
      },
      {
        label: '(iii) Reading',
        skills: [
          { label: 'Reads with fluency', grade: null },
          { label: 'Understands and can answer the question about it.', grade: null },
        ],
      },
      {
        label: '(iv) Handwriting',
        skills: [
          { label: 'Formation of letters', grade: null },
          { label: 'Presentation of work', grade: null },
          { label: 'Speed of writing', grade: null },
        ],
      },
      {
        label: '(v) Writing Skills',
        skills: [
          { label: 'Knows Spellings', grade: null },
          { label: 'Can write answer with correct sentence structure', grade: null },
          { label: 'Composition Skills', grade: null },
        ],
      },
    ],
  },

  mathematics: [
    { label: 'Understand basic concepts', grade: null },
    { label: 'Responds orally for simple questions', grade: null },
    { label: 'Learns tables', grade: null },
    { label: 'Solves sums correctly', grade: null },
    { label: 'Solves problem from word context', grade: null },
  ],

  social_science: [
    { label: 'Understands basic concepts', grade: null },
    { label: 'Responds actively during projects', grade: null },
  ],

  work_skills: [
    { label: 'Complete assignments on time', grade: null },
    { label: 'Works hard and efficiently', grade: null },
    { label: 'Works independently', grade: null },
    { label: 'Accepts challenges', grade: null },
  ],

  social_skills: [
    { label: 'Respects rights, feelings and property of others', grade: null },
    { label: 'Shows strength of character', grade: null },
    { label: 'Shows manners', grade: null },
    { label: 'Accepts challenges', grade: null },
  ],

  parental: [
    { label: 'Is regular in coming to school', grade: null },
    { label: 'Is punctual', grade: null },
    { label: 'Comes well groomed', grade: null },
    { label: "Parents' co-operation", grade: null },
  ],
} satisfies Omit<PrimaryReportVm, 'schoolName' | 'term' | 'termLabel' | 'student' | 'attendance' | 'general_remark' | 'concluding_remarks'>