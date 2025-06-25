type UserFilterProps = {
  onFilterChange: (filter: string) => void;
};

export const UserFilter = ({ onFilterChange }: UserFilterProps) => {
  return (
    <div className="flex gap-4 items-center">
      <input
        type="text"
        placeholder="Search users"
        className="w-full max-w-md h-10 px-4 rounded-md bg-gray-100 border border-gray-200 focus:outline-none"
        onChange={(e) => onFilterChange(e.target.value)}
      />
      <select
        onChange={(e) => onFilterChange(e.target.value)}
        className="h-10 px-3 rounded-md bg-gray-100 border border-gray-200"
      >
        <option value="">Role</option>
        <option value="Admin">Admin</option>
        <option value="Teacher">Teacher</option>
      </select>
    </div>
  );
};
