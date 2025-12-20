// File: app/admin/components/classFilter.tsx

type Class = {
  id: number;
  className: string;
  section: string;
  teacher: string;
  students: number;
};

type ClassFilterProps = {
  classes: Class[];
  onFilterChange: (filter: { search: string; className: string; section: string }) => void;
};

export const ClassFilter = ({ classes, onFilterChange }: ClassFilterProps) => {
  const classOptions = Array.from(new Set(classes.map((cls) => cls.className)));
  const sectionOptions = Array.from(new Set(classes.map((cls) => cls.section)));

  const handleSearchChange = (search: string) => {
    onFilterChange({ search, className: '', section: '' });
  };

  const handleClassChange = (className: string) => {
    onFilterChange({ search: '', className, section: '' });
  };

  const handleSectionChange = (section: string) => {
    onFilterChange({ search: '', className: '', section });
  };

  return (
    <div className="flex gap-4 items-center">
      {/* Search by teacher */}
      <input
        type="text"
        placeholder="Search teacher"
        className="w-full max-w-md h-10 px-4 rounded-md bg-gray-100 border border-gray-200 focus:outline-none"
        onChange={(e) => handleSearchChange(e.target.value)}
      />

      {/* Filter by class */}
      <select
        onChange={(e) => handleClassChange(e.target.value)}
        className="h-10 px-3 rounded-md bg-gray-100 border border-gray-200"
      >
        <option value="">Class</option>
        {classOptions.map((className, idx) => (
          <option key={idx} value={className}>
            {className}
          </option>
        ))}
      </select>

      {/* Filter by section */}
      <select
        onChange={(e) => handleSectionChange(e.target.value)}
        className="h-10 px-3 rounded-md bg-gray-100 border border-gray-200"
      >
        <option value="">Section</option>
        {sectionOptions.map((section, idx) => (
          <option key={idx} value={section}>
            {section}
          </option>
        ))}
      </select>
    </div>
  );
};
