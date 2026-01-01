// type StudentFilterProps = {
//   onFilterChange: (key: 'name' | 'classId' | 'sectionId', value: string) => void
// }

// export function StudentFilter({ onFilterChange }: StudentFilterProps) {
//   return (
//     <div className="flex gap-4">
//       <input
//         placeholder="Search name"
//         onChange={(e) => onFilterChange('name', e.target.value)}
//         className="border px-3 py-2 rounded"
//       />

//       <input
//         placeholder="Class"
//         onChange={(e) => onFilterChange('classId', e.target.value)}
//         className="border px-3 py-2 rounded"
//       />

//       <input
//         placeholder="Section"
//         onChange={(e) => onFilterChange('sectionId', e.target.value)}
//         className="border px-3 py-2 rounded"
//       />
//     </div>
//   )
// }


type StudentFilterProps = {
  classes: { id: number; name: string }[]
  sections: { id: number; name: string }[]
  onFilterChange: (
    key: 'name' | 'classId' | 'sectionId',
    value: string
  ) => void
}

export function StudentFilter({
  classes,
  sections,
  onFilterChange,
}: StudentFilterProps) {
  return (
    <div className="flex flex-wrap gap-4">
      {/* Name search */}
      <input
        placeholder="Search name"
        onChange={(e) => onFilterChange('name', e.target.value)}
        className="border px-3 py-2 rounded"
      />

      {/* Class dropdown */}
      <select
        onChange={(e) => onFilterChange('classId', e.target.value)}
        className="border px-3 py-2 rounded"
      >
        <option value="">All Classes</option>
        {classes.map((c) => (
          <option key={c.id} value={c.name}>
            {c.name}
          </option>
        ))}
      </select>

      {/* Section dropdown */}
      <select
        onChange={(e) => onFilterChange('sectionId', e.target.value)}
        className="border px-3 py-2 rounded"
      >
        <option value="">All Sections</option>
        {sections.map((s) => (
          <option key={s.id} value={s.name}>
            {s.name}
          </option>
        ))}
      </select>
    </div>
  )
}
