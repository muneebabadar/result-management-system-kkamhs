type StudentFilterProps = {
  onFilterChange: (filter: string) => void;
};

export const StudentFilter = ({ onFilterChange }: StudentFilterProps) => {
  return (
    <div className="flex gap-4 items-center">
      <input
        type="text"
        placeholder="Search students"
        className="w-full max-w-md h-10 px-4 rounded-md bg-gray-100 border border-gray-200 focus:outline-none"
        onChange={(e) => onFilterChange(e.target.value)}
      />
      <select
        onChange={(e) => onFilterChange(e.target.value)}
        className="h-10 px-3 rounded-md bg-gray-100 border border-gray-200"
      >
        <option value="">Class</option>
        <option value="5">5</option>
        <option value="6">6</option>
        <option value="7">7</option>
      </select>
      <select
        onChange={(e) => onFilterChange(e.target.value)}
        className="h-10 px-3 rounded-md bg-gray-100 border border-gray-200"
      >
        <option value="">Section</option>
        <option value="A">A</option>
        <option value="B">B</option>
        <option value="C">C</option>
      </select>
    </div>
  );
};
