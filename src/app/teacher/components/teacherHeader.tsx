'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function TeacherHeader() {
  const [userName, setUserName] = useState('Teacher')
  const router = useRouter()

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        const userObj = JSON.parse(storedUser)
        if (userObj.name) setUserName(userObj.name)
      }
    } catch (e) {
      console.error("Could not load user name", e)
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('user')
    router.push('/') // Redirect to login
  }

  const navLinks = [
    { name: 'Dashboard', href: '/teacher' },
    { name: 'Classes', href: '/teacher' },
    { name: 'Students', href: '#' },
    { name: 'Results', href: '#' },
    { name: 'Reports', href: '#' },
    { name: 'Settings', href: '#' },
  ]

  return (
    <header className="bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          
          {/* Left: School Name */}
          <div className="flex-shrink-0 flex items-center gap-3">
            <h1 className="text-lg font-bold text-gray-900 tracking-tight">
              Khadija Kazi Ali Memorial High School
            </h1>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
              Teacher Portal
            </span>
          </div>

          {/* Right: Navigation & Profile */}
          <div className="flex items-center space-x-6">
            
            {/* Nav Links */}
            <nav className="hidden md:flex space-x-6">
              {navLinks.map((link) => (
                <Link 
                  key={link.name}
                  href={link.href} 
                  className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
                >
                  {link.name}
                </Link>
              ))}
            </nav>

            {/* Profile & Logout Section */}
            <div className="flex items-center gap-4 pl-6 border-l border-gray-200">
              
              {/* Profile Info */}
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-bold text-gray-900">{userName}</div>
                  <div className="text-xs text-gray-500">Teacher</div>
                </div>
                {/* Avatar */}
                <div className="h-9 w-9 rounded-full bg-gray-800 text-white flex items-center justify-center font-bold border border-gray-200">
                   {userName.charAt(0).toUpperCase()}
                </div>
              </div>

              {/* Vertical Separator */}
              <div className="h-6 w-px bg-gray-300 mx-1"></div>

              {/* Logout Button */}
              <button 
                onClick={handleLogout}
                className="text-sm font-medium text-red-600 hover:text-red-800 transition-colors"
              >
                Logout
              </button>
            </div>

          </div>

        </div>
      </div>
    </header>
  )
}