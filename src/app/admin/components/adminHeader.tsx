'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminHeader() {
  const [userName, setUserName] = useState('Admin')
  const router = useRouter()

  useEffect(() => {
    // Get the user name from local storage
    try {
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        const userObj = JSON.parse(storedUser)
        // Use the name from the stored object, or fallback to 'Admin'
        if (userObj.name) setUserName(userObj.name)
      }
    } catch (e) {
      console.error("Could not load user name", e)
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('user') // 1. Clear session
    router.push('/')           // 2. Redirect to login
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          
          {/* Left: School Name / Brand */}
          <div className="flex items-center">
            <h1 className="text-lg font-bold text-gray-900">
              Khadija Kazi Ali Memorial High School
            </h1>
            <span className="ml-3 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
              Admin Panel
            </span>
          </div>

          {/* Right: User Profile & Logout */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-bold text-gray-900">{userName}</div>
                <div className="text-xs text-gray-500">Administrator</div>
              </div>
              <div className="h-9 w-9 rounded-full bg-gray-800 text-white flex items-center justify-center font-bold">
                {userName.charAt(0).toUpperCase()}
              </div>
            </div>

            <div className="h-6 w-px bg-gray-300 mx-2"></div>

            <button 
              onClick={handleLogout}
              className="text-sm font-medium text-red-600 hover:text-red-800 transition-colors"
            >
              Logout
            </button>
          </div>

        </div>
      </div>
    </header>
  )
}