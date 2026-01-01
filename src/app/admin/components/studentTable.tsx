export type StudentForTable = {
  id: number
  name: string
  class: string
  section: string
  parentPhone: string
}

type StudentTableProps = {
  students: StudentForTable[]
  onEdit: (id: number) => void
  onDelete: (id: number) => void
}

export function StudentTable({ students, onEdit, onDelete }: StudentTableProps) {
  return (
    <table className="w-full border rounded overflow-hidden">
      <thead>
        <tr className="bg-gray-100 text-left">
          <th className="p-3">Name</th>
          <th className="p-3">Class</th>
          <th className="p-3">Section</th>
          <th className="p-3">Contact</th>
          <th className="p-3">Actions</th>
        </tr>
      </thead>

      <tbody>
        {students.map((s) => (
          <tr key={s.id} className="border-t">
            <td className="p-3">{s.name}</td>
            <td className="p-3">{s.class}</td>
            <td className="p-3">{s.section}</td>
            <td className="p-3">{s.parentPhone}</td>
            <td className="p-3 space-x-3">
              <button
                onClick={() => onEdit(s.id)}
                className="text-blue-600 hover:underline"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(s.id)}
                className="text-red-600 hover:underline"
              >
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
