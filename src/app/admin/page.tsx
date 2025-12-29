'use client'

import { useEffect, useState } from 'react'
import StatCard from './components/statCard'
import QuickAction from './components/quickAction'
import Notification from './components/notification'
import AdminHeader from './components/adminHeader'
import {
  Users,
  GraduationCap,
  BookOpenCheck,
  BarChart2,
  Trophy,
  Sliders,
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
    <div className="min-h-screen bg-gray-50">
      
      {/* 1. Add Header Here */}
      <AdminHeader />

      <main className="max-w-7xl mx-auto p-6 space-y-8">
        
        {/* Page Title & Refresh */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>

          <button
            onClick={fetchDashboard}
            className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition disabled:opacity-50 shadow-sm"
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            Error: {error}
          </div>
        )}

        {/* Stats Section */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <StatCard
            label="Total Students"
            value={loading ? 0 : data.totalStudents}
          />
          <StatCard
            label="Total Classes"
            value={loading ? 0 : data.totalClasses}
          />
          <StatCard
            label="Total Teachers"
            value={loading ? 0 : data.totalTeachers}
          />
        </div>

        {/* Quick Actions */}
        <section>
          <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
          <div className="flex flex-wrap gap-4">
            <QuickAction icon={Users} label="Manage Users" href="/admin/manageUsers" />
            <QuickAction icon={GraduationCap} label="Manage Students" href="/admin/manageStudents" />
            <QuickAction icon={BookOpenCheck} label="Manage Classes" href="/admin/manageClasses" />
            <QuickAction icon={Sliders} label="Set Weightages" href="/admin/weightage" />
            <QuickAction icon={BarChart2} label="Reports" href="/admin/reports" />
            <QuickAction icon={Trophy} label="Promotions" href="/admin/promotions" />
          </div>
        </section>

        {/* Notifications */}
        <section>
          <h3 className="text-lg font-bold text-gray-900 mb-4">Notifications</h3>

          {loading ? (
            <div className="space-y-3">
              <div className="h-20 rounded-xl bg-gray-200 animate-pulse" />
              <div className="h-20 rounded-xl bg-gray-200 animate-pulse" />
            </div>
          ) : data.notifications.length === 0 ? (
            <div className="p-8 bg-white border border-gray-200 rounded-xl text-center text-gray-500">
              No new notifications.
            </div>
          ) : (
            <div className="space-y-4">
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
      </main>
    </div>
  )
}