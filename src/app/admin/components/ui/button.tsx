import Link from "next/link";

type ButtonProps = {
  label: string;
  href?: string;
};

export const Button = ({ label, href }: ButtonProps) => {
  const className = 'px-4 py-2 bg-gray-200 text-sm rounded-md hover:bg-gray-300 transition';

  if (href) {
    return (
      <Link href={href}>
        <span className={className}>{label}</span>
      </Link>
    );
  }
  return (
    <button
      className={className}
    >
      {label}
    </button>
  );
};
