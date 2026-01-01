'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Calendar, ChevronDown, Download, FileText, Loader2 } from 'lucide-react'
import AdminHeader from '../components/adminHeader'

type ReportType = 'individual' | 'class-wise' | 'annual'

type CohortOption = {
  id: number
  label: string
}

type StudentOption = {
  id: number
  full_name: string
}

export default function GenerateReports() {
  const [reportType, setReportType] = useState<ReportType>('individual')

  const [cohorts, setCohorts] = useState<CohortOption[]>([])
  const [students, setStudents] = useState<StudentOption[]>([])

  const [loadingCohorts, setLoadingCohorts] = useState(true)
  const [loadingStudents, setLoadingStudents] = useState(false)

  const [selectedClassSectionId, setSelectedClassSectionId] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState('')

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const [generating, setGenerating] = useState(false)
  const [loadingText, setLoadingText] = useState('Download Reports')
  const [error, setError] = useState('')

  const canRun = useMemo(() => {
    if (reportType === 'annual') return true
    if (reportType === 'class-wise') return !!selectedClassSectionId
    if (reportType === 'individual') return !!selectedStudentId // enforce student selection
    return false
  }, [reportType, selectedClassSectionId, selectedStudentId])

  // Load cohorts
  useEffect(() => {
    const load = async () => {
      setLoadingCohorts(true)
      setError('')
      try {
        const res = await fetch('/api/reports/options', { cache: 'no-store' })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Failed to load classes')
        setCohorts(json.data.cohorts || [])
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setLoadingCohorts(false)
      }
    }
    load()
  }, [])

  // Load students for selected cohort
  useEffect(() => {
    setSelectedStudentId('')
    setStudents([])

    if (!selectedClassSectionId) return

    const loadStudents = async () => {
      setLoadingStudents(true)
      setError('')
      try {
        const res = await fetch(`/api/reports/options?classSectionId=${selectedClassSectionId}`, { cache: 'no-store' })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Failed to load students')
        setStudents(json.data.students || [])
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setLoadingStudents(false)
      }
    }

    loadStudents()
  }, [selectedClassSectionId])

  // Reset selections when report type changes
  useEffect(() => {
    setError('')
    if (reportType === 'annual') {
      setSelectedClassSectionId('')
      setSelectedStudentId('')
    }
    if (reportType === 'class-wise') {
      setSelectedStudentId('')
    }
  }, [reportType])

  const buildPayload = () => {
    const payload: any = { reportType }
    if (selectedClassSectionId) payload.classSectionId = Number(selectedClassSectionId)
    if (selectedStudentId) payload.studentId = Number(selectedStudentId)
    if (startDate) payload.startDate = startDate
    if (endDate) payload.endDate = endDate
    return payload
  }

  const download = async (kind: 'pdf' | 'excel') => {
    setGenerating(true)
    setError('')
    setLoadingText(kind === 'pdf' ? 'Generating PDF...' : 'Generating Excel...')

    try {
      // Optional: validate by generating JSON first (helps with better user errors)
      const previewRes = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      })
      const previewJson = await previewRes.json().catch(() => ({}))
      if (!previewRes.ok) throw new Error(previewJson.error || 'Report cannot be generated for this selection.')

      const endpoint = kind === 'pdf' ? '/api/reports/export/pdf' : '/api/reports/export/excel'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      })

      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Download failed')
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = kind === 'pdf' ? 'report.pdf' : 'report.xlsx'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setGenerating(false)
      setLoadingText('Download Reports')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />

      <main className="max-w-5xl mx-auto p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Generate Reports
          </h1>

          {/* Report Type Toggle */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-gray-700 mb-3">Report Type</label>
            <div className="flex flex-wrap gap-3">
              {[
                { label: 'Individual Student Report', key: 'individual' as ReportType },
                { label: 'Class-wise Report', key: 'class-wise' as ReportType },
                { label: 'Annual Report', key: 'annual' as ReportType },
              ].map((t) => {
                const isActive = reportType === t.key
                return (
                  <button
                    key={t.key}
                    onClick={() => setReportType(t.key)}
                    className={`px-5 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                      isActive
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {t.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Select Class */}
            <div className={`${reportType === 'annual' ? 'opacity-50 pointer-events-none' : ''}`}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Class {loadingCohorts && <span className="text-xs text-gray-400 ml-2">(Loading...)</span>}
              </label>
              <div className="relative">
                <select
                  value={selectedClassSectionId}
                  onChange={(e) => setSelectedClassSectionId(e.target.value)}
                  disabled={loadingCohorts || reportType === 'annual'}
                  className="w-full appearance-none bg-white border border-gray-200 text-gray-700 py-3 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-200 cursor-pointer disabled:bg-gray-50"
                >
                  <option value="">Select Class</option>
                  {cohorts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-3.5 text-gray-400 pointer-events-none" size={16} />
              </div>
            </div>

            {/* Select Student */}
            <div className={`${reportType !== 'individual' ? 'opacity-50 pointer-events-none' : ''}`}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Student {loadingStudents && <span className="text-xs text-gray-400 ml-2">(Loading...)</span>}
                {!selectedClassSectionId && reportType === 'individual' && (
                  <span className="text-xs text-gray-400 ml-2">(Choose class first)</span>
                )}
              </label>
              <div className="relative">
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  disabled={!selectedClassSectionId || reportType !== 'individual' || loadingStudents}
                  className="w-full appearance-none bg-white border border-gray-200 text-gray-700 py-3 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-200 cursor-pointer disabled:bg-gray-50 disabled:text-gray-400"
                >
                  <option value="">Select Student</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name}
                    </option>
                  ))}
                </select>
                {loadingStudents ? (
                  <Loader2 className="absolute right-4 top-3.5 text-gray-400 animate-spin" size={16} />
                ) : (
                  <ChevronDown className="absolute right-4 top-3.5 text-gray-400 pointer-events-none" size={16} />
                )}
              </div>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <div className="relative">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-white border border-gray-200 text-gray-700 py-3 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
                {!startDate && <Calendar className="absolute right-4 top-3.5 text-gray-400 pointer-events-none" size={18} />}
              </div>
              <p className="text-xs text-gray-400 mt-1">Filters by enrollment created date (current schema limitation).</p>
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <div className="relative">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-white border border-gray-200 text-gray-700 py-3 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
                {!endDate && <Calendar className="absolute right-4 top-3.5 text-gray-400 pointer-events-none" size={18} />}
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
            <button
              onClick={() => download('pdf')}
              disabled={generating || !canRun}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-white transition-all shadow-md ${
                generating || !canRun ? 'bg-gray-400 cursor-not-allowed' : 'bg-gray-900 hover:bg-gray-800'
              }`}
            >
              {generating ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>{loadingText}</span>
                </>
              ) : (
                <>
                  <Download size={18} />
                  Download PDF
                </>
              )}
            </button>

            <button
              onClick={() => download('excel')}
              disabled={generating || !canRun}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-white transition-all shadow-md ${
                generating || !canRun ? 'bg-gray-400 cursor-not-allowed' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {generating ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>{loadingText}</span>
                </>
              ) : (
                <>
                  <Download size={18} />
                  Download Excel
                </>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
