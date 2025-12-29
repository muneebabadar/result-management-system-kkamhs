'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function TeacherHeader() {
  const [userName, setUserName] = useState('Teacher')

  useEffect(() => {
    // Get the user name from local storage
    try {
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        const userObj = JSON.parse(storedUser)
        // Use the name from the stored object, or fallback to 'Teacher'
        if (userObj.name) setUserName(userObj.name)
      }
    } catch (e) {
      console.error("Could not load user name", e)
    }
  }, [])

  const navLinks = [
    { name: 'Dashboard', href: '/teacher' },
    { name: 'Classes', href: '/teacher' }, // Pointing to same page for now
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
          <div className="flex-shrink-0 flex items-center">
            <h1 className="text-lg font-bold text-gray-900 tracking-tight">
              Khadija Kazi Ali Memorial High School
            </h1>
          </div>

          {/* Right: Navigation & Profile */}
          <div className="flex items-center space-x-8">
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

            {/* Profile Section */}
            <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
              {/* Name Display */}
              <span className="text-sm font-bold text-gray-800 hidden sm:block">
                {userName}
              </span>
              
              {/* Avatar Image */}
              <div className="h-10 w-10 rounded-full overflow-hidden border-2 border-gray-100 relative">
                {/* You can replace this src with your actual avatar URL or a user.avatar property */}
                <img 
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" 
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>

        </div>
      </div>
    </header>
  )
}