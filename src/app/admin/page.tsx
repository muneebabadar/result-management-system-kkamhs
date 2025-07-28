'use client'
import { authConfig } from '../../../auth.config'
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

export default function AdminDashboard() {
  // TODO: Replace with real data from your DB
  const totalStudents = 450
  const totalClasses = 15
  const totalTeachers = 25

  return (
    <div className="p-6 space-y-8">
      {/* Page Title */}
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Students" value={totalStudents} />
        <StatCard label="Total Classes" value={totalClasses} />
        <StatCard label="Total Teachers" value={totalTeachers} />
      </div>

      {/* Quick Actions */}
      <section>
        <h2 className="font-semibold text-gray-800 mb-3">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <QuickAction icon={Users} label="Manage Users" href="/admin/users" />
          <QuickAction icon={GraduationCap} label="Manage Students" href="/admin/students" />
          <QuickAction icon={BookOpenCheck} label="Manage Classes" href="/admin/classes" />
          <QuickAction icon={BarChart2} label="Reports" href="/admin/reports" />
          <QuickAction icon={Trophy} label="Promotions" href="/admin/promotions" />
        </div>
      </section>

      {/* Notifications */}
      <section>
        <h2 className="font-semibold text-gray-800 mb-3">Notifications</h2>
        <div className="space-y-3">
          {/* TODO: Replace with dynamic notifications from DB */}
          <Notification
            title="Student Registration"
            description="New student registration completed."
          />
          <Notification
            title="Class Schedule Update"
            description="Class schedule updated for grade 10."
          />
        </div>
      </section>
    </div>
  )
}
