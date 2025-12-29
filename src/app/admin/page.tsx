'use client'

import { useEffect, useState } from 'react'
import StatCard from './components/statCard'
import QuickAction from './components/quickAction'
import Notification from './components/notification'

import {
  Users,
  GraduationCap,
  BookOpenCheck,
  BarChart2,
  Trophy,
} from 'lucide-react'

type DashboardNotification = {
  id: string | number
  title: string
  description: string
  created_at?: string
}

type DashboardData = {
  totalStudents: number
  totalClasses: number
  totalTeachers: number
  notifications: DashboardNotification[]
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData>({
    totalStudents: 0,
    totalClasses: 0,
    totalTeachers: 0,
    notifications: [],
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchDashboard = async () => {
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/admin/dashboard', { cache: 'no-store' })
      const result = await res.json()

      if (!res.ok) throw new Error(result.error || 'Failed to load dashboard')

      setData(result.data)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
  }, [])

  return (
    <div className="p-6 space-y-8">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

        {/* Optional: simple refresh */}
        <button
          onClick={fetchDashboard}
          className="px-4 py-2 rounded-xl bg-gray-100 text-gray-800 text-sm font-semibold hover:bg-gray-200 transition disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          Error: {error}
        </div>
      )}

      {/* Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Students"
          value={loading ? '—' : data.totalStudents}
        />
        <StatCard
          label="Total Classes"
          value={loading ? '—' : data.totalClasses}
        />
        <StatCard
          label="Total Teachers"
          value={loading ? '—' : data.totalTeachers}
        />
      </div>

      {/* Quick Actions */}
      <section>
        <h2 className="font-semibold text-gray-800 mb-3">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <QuickAction icon={Users} label="Manage Users" href="/admin/manageUsers" />
          <QuickAction icon={GraduationCap} label="Manage Students" href="/admin/manageStudents" />
          <QuickAction icon={BookOpenCheck} label="Manage Classes" href="/admin/manageClasses" />
          <QuickAction icon={BarChart2} label="Reports" href="/admin/reports" />
          <QuickAction icon={Trophy} label="Promotions" href="/admin/promotions" />
        </div>
      </section>

      {/* Notifications */}
      <section>
        <h2 className="font-semibold text-gray-800 mb-3">Notifications</h2>

        {loading ? (
          <div className="space-y-3">
            <div className="h-16 rounded-xl bg-gray-100" />
            <div className="h-16 rounded-xl bg-gray-100" />
          </div>
        ) : data.notifications.length === 0 ? (
          <div className="p-4 bg-gray-50 border rounded-xl text-gray-600">
            No notifications yet.
          </div>
        ) : (
          <div className="space-y-3">
            {data.notifications.map((n) => (
              <Notification
                key={n.id}
                title={n.title}
                description={n.description}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
