'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminSidebar from './components/adminSidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    // 1. Get user data from local storage
    const storedUser = localStorage.getItem('user')

    if (!storedUser) {
      // If no user is found, redirect to Login immediately
      router.push('/')
    } else {
      try {
        const user = JSON.parse(storedUser)
        
        // 2. Check if the user is actually an ADMIN
        if (user.role !== 'admin') {
          // If they are a teacher/student trying to sneak in, kick them out
          router.push('/') 
        } else {
          // 3. Success! Allow them to see the page
          setIsAuthorized(true)
        }
      } catch (error) {
        // If data is corrupted, force login
        localStorage.removeItem('user')
        router.push('/')
      }
    }
  }, [router])

  // 4. Loading State
  // This prevents the Admin UI from flashing on the screen before we verify the user
  if (!isAuthorized) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-gray-500 font-medium animate-pulse">
          Verifying secure access...
        </div>
      </div>
    )
  }

  // 5. Render the actual Admin Layout once authorized
  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <main className="ml-64 p-6 w-full">
        {children}
      </main>
    </div>
  )
}