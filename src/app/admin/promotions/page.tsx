'use client'

import { useEffect, useState } from 'react'
import ClassCard from '../components/classCard'

type Cohort = {
  classSectionId: number
  label: string
}

export default function PromotionsLandingPage() {
  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await fetch('/api/promotions/cohorts', { cache: 'no-store' })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Failed to load cohorts')
        setCohorts(json.data || [])
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Select Class for Promotions</h1>

      {loading && <div className="text-gray-600">Loading...</div>}
      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          Error: {error}
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {cohorts.map((c) => (
            <ClassCard key={c.classSectionId} classSectionId={c.classSectionId} label={c.label} />
          ))}
          {cohorts.length === 0 && (
            <div className="text-gray-600">
              No active enrollments found for the current academic year.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
