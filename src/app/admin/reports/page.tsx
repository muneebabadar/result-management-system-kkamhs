'use client'

import { useEffect, useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Level    = 'primary' | 'secondary' | 'high_school'
type Scope    = 'individual' | 'class'
type Audience = 'student' | 'patron'
type Term     = 'q1' | 'q2' | 'sem1' | 'sem2' | 'preliminary' | 'annual' | 'term1' | 'term2'

interface CohortOption {
  id:           number
  label:        string
  class_name:   string
  section_name: string
  level:        Level
}

interface StudentOption {
  id:               number
  class_section_id: number
  label:            string
}

// Exam terms available per school level
const TERM_OPTIONS: Record<Level, { value: Term; label: string }[]> = {
  primary: [
    { value: 'term1', label: '1st Term' },
    { value: 'term2', label: '2nd Term' },
  ],
  secondary: [
    { value: 'q1',     label: '1st Quarterly Test' },
    { value: 'sem1',   label: '1st Term Report' },
    { value: 'q2',     label: '2nd Quarterly Test' },
    { value: 'sem2',   label: '2nd Term Report' },
    { value: 'annual', label: 'Annual Report' },
  ],
  high_school: [
    { value: 'preliminary', label: '1st Term (Preliminary)' },
    { value: 'annual',      label: 'Annual Examination' },
  ],
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GenerateReportsPage() {
  const [loading,       setLoading]       = useState(true)
  const [cohortOptions, setCohortOptions] = useState<CohortOption[]>([])
  const [studentOptions,setStudentOptions]= useState<StudentOption[]>([])

  // Form state
  const [scope,            setScope]           = useState<Scope>('individual')
  const [audience,         setAudience]        = useState<Audience>('student')
  const [classSectionId,   setClassSectionId]  = useState<number | null>(null)
  const [studentId,        setStudentId]       = useState<number | null>(null)
  const [examTerm,         setExamTerm]        = useState<Term | ''>('')

  // Status
  const [isGenerating, setIsGenerating] = useState(false)
  const [errorMsg,     setErrorMsg]     = useState<string | null>(null)

  // ── Derived ──

  const selectedCohort = cohortOptions.find(c => c.id === classSectionId) ?? null
  const level          = selectedCohort?.level ?? null

  const termOptions = level ? (TERM_OPTIONS[level] ?? []) : []

  const filteredStudents = classSectionId
    ? studentOptions.filter(s => s.class_section_id === classSectionId)
    : []

  const canRun = Boolean(
    classSectionId &&
    examTerm &&
    (scope === 'class' || studentId)
  )

  // ── Load options ──

  useEffect(() => {
    ;(async () => {
      try {
        const res  = await fetch('/api/reports/options')
        const json = await res.json()
        if (json.success) {
          setCohortOptions(json.cohortOptions ?? [])
          setStudentOptions(json.studentOptions ?? [])
        }
      } catch (err) {
        console.error('Failed to load report options', err)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // Reset dependent fields when class changes
  useEffect(() => {
    setStudentId(null)
    setExamTerm('')
  }, [classSectionId])

  // Reset student when scope changes to class
  useEffect(() => {
    if (scope === 'class') setStudentId(null)
  }, [scope])

  // ── Actions ──

  function buildPayload() {
    return {
      scope,
      audience,
      classSectionId,
      studentId: scope === 'individual' ? studentId : undefined,
      examTerm,
    }
  }

  async function handleExport(format: 'pdf' | 'excel') {
    if (!canRun) return
    setIsGenerating(true)
    setErrorMsg(null)

    try {
      const endpoint = format === 'pdf'
        ? '/api/reports/export/pdf'
        : '/api/reports/export/excel'

      const res = await fetch(endpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(buildPayload()),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? `Export failed (${res.status})`)
      }

      // Trigger browser download
      const blob     = await res.blob()
      const url      = URL.createObjectURL(blob)
      const anchor   = document.createElement('a')
      const cd       = res.headers.get('Content-Disposition') ?? ''
      const match    = cd.match(/filename="([^"]+)"/)
      anchor.href     = url
      anchor.download = match?.[1] ?? `report.${format === 'pdf' ? 'pdf' : 'xlsx'}`
      anchor.click()
      URL.revokeObjectURL(url)

    } catch (err: any) {
      setErrorMsg(err.message ?? 'Export failed')
    } finally {
      setIsGenerating(false)
    }
  }

  // ── Render ──

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Loading...
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-8">
      <h1 className="text-2xl font-semibold text-gray-800">Generate Reports</h1>

      {/* ── Scope ── */}
      <Section title="Report Scope">
        <ToggleGroup
          options={[
            { value: 'individual', label: 'Individual Student' },
            { value: 'class',      label: 'Entire Class' },
          ]}
          value={scope}
          onChange={v => setScope(v as Scope)}
        />
      </Section>

      {/* ── Audience ── */}
      <Section title="Report For">
        <ToggleGroup
          options={[
            { value: 'student', label: 'Student' },
            { value: 'patron',  label: 'Patron' },
          ]}
          value={audience}
          onChange={v => setAudience(v as Audience)}
        />
      </Section>

      {/* ── Class ── */}
      <Section title="Class">
        <Select
          placeholder="Select class..."
          value={classSectionId ?? ''}
          onChange={v => setClassSectionId(v ? Number(v) : null)}
          options={cohortOptions.map(c => ({ value: c.id, label: c.label }))}
        />
      </Section>

      {/* ── Student (individual only) ── */}
      {scope === 'individual' && (
        <Section title="Student">
          <Select
            placeholder={classSectionId ? 'Select student...' : 'Select a class first'}
            value={studentId ?? ''}
            onChange={v => setStudentId(v ? Number(v) : null)}
            options={filteredStudents.map(s => ({ value: s.id, label: s.label }))}
            disabled={!classSectionId}
          />
        </Section>
      )}

      {/* ── Exam Term ── */}
      <Section title="Exam">
        <Select
          placeholder={classSectionId ? 'Select exam...' : 'Select a class first'}
          value={examTerm}
          onChange={v => setExamTerm(v as Term | '')}
          options={termOptions.map(t => ({ value: t.value, label: t.label }))}
          disabled={!classSectionId}
        />
        {level && (
          <p className="mt-1.5 text-xs text-gray-400">
            {level === 'primary'     && 'Class 1–4: rubric-based skill grading'}
            {level === 'secondary'   && 'Class 5–8: quarterly + semester + annual'}
            {level === 'high_school' && 'Class 9–12: preliminary or annual examination'}
          </p>
        )}
      </Section>

      {/* ── Error ── */}
      {errorMsg && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {/* ── Actions ── */}
      <div className="flex gap-3 pt-2">
        <ExportButton
          label="Download PDF"
          disabled={!canRun || isGenerating}
          loading={isGenerating}
          onClick={() => handleExport('pdf')}
          variant="primary"
        />
        <ExportButton
          label="Download Excel"
          disabled={!canRun || isGenerating}
          loading={isGenerating}
          onClick={() => handleExport('excel')}
          variant="secondary"
        />
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{title}</label>
      {children}
    </div>
  )
}

function ToggleGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value:   T
  onChange:(v: T) => void
}) {
  return (
    <div className="flex gap-0 rounded-md border border-gray-300 overflow-hidden w-fit">
      {options.map((opt, i) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={[
            'px-4 py-2 text-sm font-medium transition-colors',
            i > 0 ? 'border-l border-gray-300' : '',
            value === opt.value
              ? 'bg-gray-800 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50',
          ].join(' ')}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function Select({
  placeholder,
  value,
  onChange,
  options,
  disabled = false,
}: {
  placeholder: string
  value:       string | number
  onChange:    (v: string) => void
  options:     { value: string | number; label: string }[]
  disabled?:   boolean
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      className={[
        'w-full rounded-md border px-3 py-2 text-sm bg-white',
        'focus:outline-none focus:ring-2 focus:ring-gray-400',
        disabled ? 'border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-300 text-gray-800',
      ].join(' ')}
    >
      <option value="" disabled>{placeholder}</option>
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )
}

function ExportButton({
  label,
  disabled,
  loading,
  onClick,
  variant,
}: {
  label:    string
  disabled: boolean
  loading:  boolean
  onClick:  () => void
  variant:  'primary' | 'secondary'
}) {
  const base = 'px-5 py-2.5 rounded-md text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
  const styles = {
    primary:   `${base} bg-gray-800 text-white hover:bg-gray-700`,
    secondary: `${base} border border-gray-300 text-gray-700 bg-white hover:bg-gray-50`,
  }
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={styles[variant]}
    >
      {loading ? 'Generating...' : label}
    </button>
  )
}