'use client'

import { useEffect, useState } from 'react'

export type ClassFilters = {
  search: string
  classId: string
  sectionId: string
}

export function ClassFilter({
  classOptions,
  sectionOptions,
  onFilterChange,
}: {
  classOptions: { id: number; name: string }[]
  sectionOptions: { id: number; name: string }[]
  onFilterChange: (filters: ClassFilters) => void
}) {
  const [search, setSearch] = useState('')
  const [classId, setClassId] = useState('')
  const [sectionId, setSectionId] = useState('')

  const debouncedSearch = useDebouncedValue(search, 250)

  useEffect(() => {
    onFilterChange({
      search: debouncedSearch,
      classId,
      sectionId,
    })
  }, [debouncedSearch, classId, sectionId, onFilterChange])

  return (
    <div className="flex gap-4 items-center flex-wrap">
      <input
        type="text"
        placeholder="Search teacher"
        className="w-full max-w-md h-10 px-4 rounded-md bg-gray-100 border border-gray-200 focus:outline-none"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <select
        value={classId}
        onChange={(e) => setClassId(e.target.value)}
        className="h-10 px-3 rounded-md bg-gray-100 border border-gray-200"
      >
        <option value="">Class</option>
        {classOptions.map((c) => (
          <option key={c.id} value={String(c.id)}>
            {c.name}
          </option>
        ))}
      </select>

      <select
        value={sectionId}
        onChange={(e) => setSectionId(e.target.value)}
        className="h-10 px-3 rounded-md bg-gray-100 border border-gray-200"
      >
        <option value="">Section</option>
        {sectionOptions.map((s) => (
          <option key={s.id} value={String(s.id)}>
            {s.name}
          </option>
        ))}
      </select>
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
