type Student = {
  id: number;
  name: string;
  class: string;
  section: string;
  parentPhone: string;
};

type StudentTableProps = {
  students: Student[];
  onView: (id: number) => void;
};

export const StudentTable = ({ students, onView }: StudentTableProps) => {
  return (
    <div className="overflow-x-auto border rounded-md bg-white">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-100 text-gray-700 text-left">
          <tr>
            <th className="px-6 py-3">Name</th>
            <th className="px-6 py-3">Class</th>
            <th className="px-6 py-3">Section</th>
            <th className="px-6 py-3">Parent's Phone</th>
            <th className="px-6 py-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {students.map((student) => (
            <tr key={student.id} className="hover:bg-gray-50">
              <td className="px-6 py-4">{student.name}</td>
              <td className="px-6 py-4">{student.class}</td>
              <td className="px-6 py-4">{student.section}</td>
              <td className="px-6 py-4">{student.parentPhone}</td>
              <td className="px-6 py-4">
                <button
                  onClick={() => onView(student.id)}
                  className="text-blue-600 hover:underline"
                >
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
