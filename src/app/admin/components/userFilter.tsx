'use client'

import { useEffect, useState } from 'react'

export type UserFilters = {
  search: string
  role: 'All' | 'Admin' | 'Teacher'
}

export function UserFilter({
  onFilterChange,
}: {
  onFilterChange: (filters: UserFilters) => void
}) {
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<UserFilters['role']>('All')

  // Debounce search changes to avoid re-filtering on every keystroke
  const debouncedSearch = useDebouncedValue(search, 250)

  useEffect(() => {
    onFilterChange({
      search: debouncedSearch,
      role,
    })
  }, [debouncedSearch, role, onFilterChange])

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="w-full sm:max-w-xl">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users"
          className="w-full h-11 px-4 rounded-xl bg-gray-100 text-sm focus:outline-blue-500"
        />
      </div>

      <div className="w-full sm:w-48">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as UserFilters['role'])}
          className="w-full h-11 px-4 rounded-xl bg-gray-100 text-sm text-gray-700 focus:outline-blue-500"
        >
          <option value="All">Role</option>
          <option value="Admin">Admin</option>
          <option value="Teacher">Teacher</option>
        </select>
      </div>
    </div>
  )
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(id)
  }, [value, delayMs])

  return debounced
}
