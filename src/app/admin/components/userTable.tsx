type User = {
  id: number;
  name: string;
  role: string;
  status: string;
};

type UserTableProps = {
  users: User[];
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
};

export const UserTable = ({ users, onEdit, onDelete }: UserTableProps) => {
  return (
    <div className="overflow-x-auto border rounded-md bg-white">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-100 text-gray-700 text-left">
          <tr>
            <th className="px-6 py-3">Name</th>
            <th className="px-6 py-3">Role</th>
            <th className="px-6 py-3">Status</th>
            <th className="px-6 py-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-gray-50">
              <td className="px-6 py-4">{user.name}</td>
              <td className="px-6 py-4 text-blue-600 cursor-pointer hover:underline">
                {user.role}
              </td>
              <td className="px-6 py-4">
                <span className="bg-gray-100 px-3 py-1 rounded-md text-gray-800">
                  {user.status}
                </span>
              </td>
              <td className="px-6 py-4 space-x-2">
                <button
                  onClick={() => onEdit(user.id)}
                  className="text-blue-600 hover:underline"
                >
                  Edit
                </button>
                <span className="text-gray-400">|</span>
                <button
                  onClick={() => onDelete(user.id)}
                  className="text-red-600 hover:underline"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
