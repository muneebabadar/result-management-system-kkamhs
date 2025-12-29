'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    const storedUser = localStorage.getItem('user')

    if (!storedUser) {
      router.push('/')
    } else {
      const user = JSON.parse(storedUser)
      // Check if role is teacher (or admin can view teacher pages too?)
      if (user.role !== 'teacher' && user.role !== 'admin') {
         router.push('/') 
      } else {
         setIsAuthorized(true)
      }
    }
  }, [router])

  if (!isAuthorized) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-gray-500">Verifying access...</div>
      </div>
    )
  }

  return <>{children}</>
}