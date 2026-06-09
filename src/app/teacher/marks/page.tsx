'use client'

// /src/app/teacher/marks/page.tsx

import { useCallback, useEffect, useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Exam {
  id:   number
  name: string
  type: string
  term: string | null
}

interface CohortOption {
  id:    number
  label: string
}

interface Component {
  id:         number
  name:       string
  max_marks:  number
  sort_order: number
}

interface Subject {
  id:         number
  name:       string
  max_marks:  number
  sort_order: number
}

interface Student {
  id:          number
  full_name:   string
  roll_number: string | null
}

interface MarkCell {
  obtained: string
  isAbsent: boolean
}

// key: `${studentId}-${subjectId}-${componentId}`
type MarkState = Record<string, MarkCell>

interface EntryData {
  exam:       { id: number; name: string }
  components: Component[]
  subjects:   Subject[]
  students:   Student[]
  existingMarks: {
    student_id:        number
    subject_id:        number
    exam_component_id: number
    obtained_marks:    number | null
    is_absent:         boolean
  }[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mk(studentId: number, subjectId: number, componentId: number) {
  return `${studentId}-${subjectId}-${componentId}`
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MarksEntryPage() {
  const [exams,   setExams]   = useState<Exam[]>([])
  const [cohorts, setCohorts] = useState<CohortOption[]>([])

  const [selectedExam,   setSelectedExam]   = useState('')
  const [selectedCohort, setSelectedCohort] = useState('')

  const [entryData, setEntryData] = useState<EntryData | null>(null)
  const [marks,     setMarks]     = useState<MarkState>({})

  const [loading, setLoading] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [saved,   setSaved]   = useState(false)

  // ── Load selectors on mount ──────────────────────────────────────────────

  useEffect(() => {
    Promise.all([
      fetch('/api/exams').then(r => r.json()),
      fetch('/api/reports/options').then(r => r.json()),
    ]).then(([examJson, optJson]) => {
      setExams(examJson.data?.exams ?? [])
      setCohorts(optJson.cohortOptions ?? [])
    })
  }, [])

  // ── Load grid when exam + class both selected ────────────────────────────

  useEffect(() => {
    if (!selectedExam || !selectedCohort) {
      setEntryData(null)
      setMarks({})
      return
    }

    setLoading(true)
    setError(null)
    setSaved(false)

    fetch(`/api/marks/entry?examId=${selectedExam}&classSectionId=${selectedCohort}`)
      .then(r => r.json())
      .then(json => {
        if (!json.success) throw new Error(json.error)
        const data: EntryData = json.data

        // Pre-fill from saved marks
        const initial: MarkState = {}
        for (const m of data.existingMarks) {
          initial[mk(m.student_id, m.subject_id, m.exam_component_id)] = {
            obtained: m.is_absent ? '' : String(m.obtained_marks ?? ''),
            isAbsent: m.is_absent,
          }
        }

        setEntryData(data)
        setMarks(initial)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [selectedExam, selectedCohort])

  // ── Mark input handlers ──────────────────────────────────────────────────

  const handleChange = useCallback(
    (studentId: number, subjectId: number, componentId: number, value: string) => {
      const k = mk(studentId, subjectId, componentId)
      setMarks(prev => ({ ...prev, [k]: { obtained: value, isAbsent: false } }))
      setSaved(false)
    },
    []
  )

  const handleAbsent = useCallback(
    (studentId: number, subjectId: number, componentId: number) => {
      const k = mk(studentId, subjectId, componentId)
      setMarks(prev => {
        const was = prev[k]?.isAbsent ?? false
        return { ...prev, [k]: { obtained: '', isAbsent: !was } }
      })
      setSaved(false)
    },
    []
  )

  // ── Save ─────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!entryData) return
    setSaving(true)
    setError(null)
    setSaved(false)

    const payload = []
    for (const student of entryData.students) {
      for (const subject of entryData.subjects) {
        for (const component of entryData.components) {
          const cell = marks[mk(student.id, subject.id, component.id)]
          if (!cell) continue
          payload.push({
            studentId:       student.id,
            subjectId:       subject.id,
            examComponentId: component.id,
            obtainedMarks:   cell.isAbsent || cell.obtained === '' ? null : Number(cell.obtained),
            isAbsent:        cell.isAbsent,
          })
        }
      }
    }

    try {
      const res  = await fetch('/api/marks/entry', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ marks: payload }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setSaved(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6 min-h-screen bg-white">

      <h1 className="text-xl font-semibold text-gray-800">Mark Entry</h1>

      {/* ── Selectors ── */}
      <div className="flex flex-wrap gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Exam
          </label>
          <select
            value={selectedExam}
            onChange={e => setSelectedExam(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm min-w-[220px] focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select exam…</option>
            {exams.map(ex => (
              <option key={ex.id} value={ex.id}>{ex.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Class / Section
          </label>
          <select
            value={selectedCohort}
            onChange={e => setSelectedCohort(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm min-w-[220px] focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select class…</option>
            {cohorts.map(c => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Status ── */}
      {error   && <p className="text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-gray-400">Loading…</p>}

      {/* ── Grid ── */}
      {entryData && !loading && (
        <div className="space-y-4">

          {entryData.subjects.length === 0 && (
            <p className="text-sm text-amber-600">
              No subjects configured for this class. Add them in class subject config first.
            </p>
          )}

          {entryData.subjects.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
              <table className="text-sm border-collapse w-full">
                <thead>

                  {/* Subject group headers */}
                  <tr>
                    <th
                      rowSpan={2}
                      className="border border-gray-200 bg-gray-50 px-4 py-2.5 text-left font-medium text-gray-600 whitespace-nowrap sticky left-0 z-10"
                    >
                      Student
                    </th>
                    <th
                      rowSpan={2}
                      className="border border-gray-200 bg-gray-50 px-3 py-2.5 text-center font-medium text-gray-600 whitespace-nowrap"
                    >
                      Roll No
                    </th>
                    {entryData.subjects.map(sub => (
                      <th
                        key={sub.id}
                        colSpan={entryData.components.length}
                        className="border border-gray-200 bg-blue-50 px-3 py-2 text-center font-semibold text-blue-800 text-xs uppercase tracking-wide"
                      >
                        {sub.name}
                      </th>
                    ))}
                  </tr>

                  {/* Component sub-headers */}
                  <tr>
                    {entryData.subjects.map(sub =>
                      entryData.components.map(comp => (
                        <th
                          key={`${sub.id}-${comp.id}`}
                          className="border border-gray-200 bg-gray-50 px-2 py-1.5 text-center font-medium text-gray-600 whitespace-nowrap"
                        >
                          <div className="text-xs">{comp.name}</div>
                          <div className="text-xs font-normal text-gray-400">/ {comp.max_marks}</div>
                        </th>
                      ))
                    )}
                  </tr>

                </thead>

                <tbody>
                  {entryData.students.map((student, idx) => (
                    <tr key={student.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-200 px-4 py-1.5 whitespace-nowrap font-medium text-gray-700 sticky left-0 bg-inherit">
                        {student.full_name}
                      </td>
                      <td className="border border-gray-200 px-3 py-1.5 text-center text-gray-400">
                        {student.roll_number ?? '—'}
                      </td>
                      {entryData.subjects.map(sub =>
                        entryData.components.map(comp => {
                          const cell = marks[mk(student.id, sub.id, comp.id)] ?? {
                            obtained: '',
                            isAbsent: false,
                          }
                          return (
                            <td
                              key={`${sub.id}-${comp.id}`}
                              className="border border-gray-200 px-1.5 py-1"
                            >
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min={0}
                                  max={comp.max_marks}
                                  value={cell.obtained}
                                  disabled={cell.isAbsent}
                                  onChange={e =>
                                    handleChange(student.id, sub.id, comp.id, e.target.value)
                                  }
                                  className="w-14 border border-gray-300 rounded px-1.5 py-0.5 text-center text-sm
                                             disabled:bg-gray-100 disabled:text-gray-300
                                             focus:outline-none focus:ring-1 focus:ring-blue-400"
                                />
                                <button
                                  type="button"
                                  title="Toggle absent"
                                  onClick={() => handleAbsent(student.id, sub.id, comp.id)}
                                  className={`text-xs px-1.5 py-0.5 rounded border transition-colors ${
                                    cell.isAbsent
                                      ? 'bg-red-100 border-red-400 text-red-600 font-semibold'
                                      : 'border-gray-300 text-gray-400 hover:border-red-300 hover:text-red-400'
                                  }`}
                                >
                                  Ab
                                </button>
                              </div>
                            </td>
                          )
                        })
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Save bar ── */}
          {entryData.subjects.length > 0 && (
            <div className="flex items-center gap-4 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-6 py-2 rounded-md disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving…' : 'Save Marks'}
              </button>
              {saved && (
                <span className="text-sm text-green-600 font-medium">Saved successfully.</span>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  )
}