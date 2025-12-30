'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

type Row = {
  studentId: number
  enrollmentId: number
  name: string
  classLabel: string
  overallResult: 'Pass' | 'Fail'
  decision: 'retain' | 'promote' | 'conditional_promote'
  promotionStatus: 'Promoted' | 'Not Promoted'
}

export default function ClassPromotionPage() {
  const params = useParams<{ className: string }>()
  const router = useRouter()

  // className param actually contains classSectionId
  const classSectionId = useMemo(() => Number(params.className), [params.className])

  const [runId, setRunId] = useState<number | null>(null)
  const [classLabel, setClassLabel] = useState('')
  const [students, setStudents] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [savingConfirm, setSavingConfirm] = useState(false)
  const [savingDecision, setSavingDecision] = useState(false)

  // ------------------------------------------------------------
  // Load promotion run
  // ------------------------------------------------------------
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        if (!classSectionId) throw new Error('Invalid class section')

        const res = await fetch(
          `/api/promotions/run?classSectionId=${classSectionId}`,
          { cache: 'no-store' }
        )
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Failed to load promotion run')

        setRunId(json.data.runId)
        setClassLabel(json.data.classLabel || '')
        setStudents(json.data.students || [])
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [classSectionId])

  // ------------------------------------------------------------
  // Toggle conditional promotion
  // ------------------------------------------------------------
  const handleConditionalToggle = async (studentId: number) => {
    if (!runId || savingDecision) return

    const current = students.find((s) => s.studentId === studentId)
    if (!current) return

    const nextDecision =
      current.decision === 'conditional_promote'
        ? 'retain'
        : 'conditional_promote'

    // Optimistic UI update
    setStudents((prev) =>
      prev.map((s) =>
        s.studentId === studentId
          ? {
              ...s,
              decision: nextDecision,
              promotionStatus:
                nextDecision === 'retain' ? 'Not Promoted' : 'Promoted',
            }
          : s
      )
    )

    setSavingDecision(true)

    const res = await fetch(`/api/promotions/run/${runId}/decisions`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        updates: [{ studentId, decision: nextDecision }],
      }),
    })

    setSavingDecision(false)

    if (!res.ok) {
      // revert on failure
      setStudents((prev) =>
        prev.map((s) => (s.studentId === studentId ? current : s))
      )
      const j = await res.json().catch(() => ({}))
      alert(j.error || 'Failed to save decision')
    }
  }

  // ------------------------------------------------------------
  // Confirm promotions
  // ------------------------------------------------------------
  const handleConfirm = async () => {
    if (!runId || savingConfirm || savingDecision) return

    setSavingConfirm(true)
    try {
      const res = await fetch(
        `/api/promotions/run/${runId}/confirm`,
        { method: 'POST' }
      )
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to confirm promotions')

      alert('Promotions confirmed!')
      router.push('/admin/promotions')
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setSavingConfirm(false)
    }
  }

  // ------------------------------------------------------------
  // Render
  // ------------------------------------------------------------
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Promotion Eligibility – {classLabel || '—'}
        </h1>
        <button
          onClick={() => router.back()}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back
        </button>
      </div>

      {loading && <div className="text-gray-600">Loading…</div>}

      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          Error: {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="overflow-x-auto rounded-md border bg-white">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-100 text-gray-700 text-left">
                <tr>
                  <th className="px-6 py-3">Student Name</th>
                  <th className="px-6 py-3">Class</th>
                  <th className="px-6 py-3">Overall Result</th>
                  <th className="px-6 py-3">Promotion Status</th>
                  <th className="px-6 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {students.map((s) => (
                  <tr key={s.studentId} className="hover:bg-gray-50">
                    <td className="px-6 py-4">{s.name}</td>
                    <td className="px-6 py-4">{s.classLabel}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-md text-white ${
                          s.overallResult === 'Pass'
                            ? 'bg-green-500'
                            : 'bg-red-500'
                        }`}
                      >
                        {s.overallResult}
                      </span>
                    </td>
                    <td className="px-6 py-4">{s.promotionStatus}</td>
                    <td className="px-6 py-4">
                      {s.overallResult === 'Fail' && (
                        <label className="inline-flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={s.decision === 'conditional_promote'}
                            onChange={() =>
                              handleConditionalToggle(s.studentId)
                            }
                            disabled={
                              savingConfirm ||
                              savingDecision ||
                              !runId
                            }
                          />
                          <span>Conditional Pass</span>
                        </label>
                      )}
                    </td>
                  </tr>
                ))}

                {students.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-10 text-center text-gray-600"
                    >
                      No active students found in this cohort.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleConfirm}
            disabled={
              savingConfirm ||
              savingDecision ||
              students.length === 0
            }
            className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {savingConfirm ? 'Processing…' : 'Confirm Promotions'}
          </button>
        </>
      )}
    </div>
  )
}
