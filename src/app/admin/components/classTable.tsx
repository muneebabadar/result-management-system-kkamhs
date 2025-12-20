// File: app/admin/components/classTable.tsx

type Class = {
  id: number;
  className: string;  // e.g., "9"
  section: string;    // e.g., "A"
  teacher: string;
  students: number;
};

type ClassTableProps = {
  classes: Class[];
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onAssignTeacher: (id: number) => void;
};

export const ClassTable = ({
  classes,
  onEdit,
  onDelete,
  onAssignTeacher,
}: ClassTableProps) => {
  return (
    <div className="overflow-x-auto border rounded-md bg-white">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-100 text-gray-700 text-left">
          <tr>
            <th className="px-6 py-3">Class</th>
            <th className="px-6 py-3">Section</th>
            <th className="px-6 py-3">Assigned Teacher</th>
            <th className="px-6 py-3">Student Count</th>
            <th className="px-6 py-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {classes.map((cls) => (
            <tr key={cls.id} className="hover:bg-gray-50">
              <td className="px-6 py-4">{cls.className}</td>
              <td className="px-6 py-4">{cls.section}</td>
              <td className="px-6 py-4 text-blue-600 cursor-pointer hover:underline">
                {cls.teacher}
              </td>
              <td className="px-6 py-4">{cls.students}</td>
              <td className="px-6 py-4 space-x-2">
                <button
                  onClick={() => onEdit(cls.id)}
                  className="text-blue-600 hover:underline"
                >
                  Edit
                </button>
                <span className="text-gray-400">|</span>
                <button
                  onClick={() => onDelete(cls.id)}
                  className="text-red-600 hover:underline"
                >
                  Delete
                </button>
                <span className="text-gray-400">|</span>
                <button
                  onClick={() => onAssignTeacher(cls.id)}
                  className="text-blue-600 hover:underline"
                >
                  Assign Teacher
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
