'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpenCheck,
  BarChart2,
  ArrowUpRight,
  Settings,
} from 'lucide-react'

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/admin' },
  { label: 'Manage Users', icon: Users, href: '/admin/manageUsers' },
  { label: 'Manage Students', icon: GraduationCap, href: '/admin/manageStudents' },
  { label: 'Manage Classes', icon: BookOpenCheck, href: '/admin/manageClasses' },
  { label: 'Reports', icon: BarChart2, href: '/admin/reports' },
  { label: 'Promotions', icon: ArrowUpRight, href: '/admin/promotions' },
  { label: 'Settings', icon: Settings, href: '/admin/settings' },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="h-screen w-64 bg-gray-100 rounded-r-2xl shadow-sm p-4 fixed">
        {/* School Name */}
        <p className="text-gray-800 font-semibold text-sm mb-6 truncate">
            Khadija Kazi Ali Memorial High School
        </p>
        <nav className="space-y-2">
            {navItems.map(({ label, icon: Icon, href }) => (
            <Link
                key={label}
                href={href}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors hover:bg-gray-200 ${
                pathname === href ? 'bg-gray-300 font-medium' : ''
                }`}
            >
                <Icon className="h-5 w-5 text-gray-700" />
                <span className="text-gray-800">{label}</span>
            </Link>
            ))}
        </nav>
    </aside>
  )
}
