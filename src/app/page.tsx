// File: app/page.tsx
import { neon } from '@neondatabase/serverless';

export default function Page() {
  async function create(formData: FormData) {
    'use server';

    const sql = neon(process.env.DATABASE_URL!);

    const name = formData.get('name') as string;
    const value = parseFloat(formData.get('value') as string);

    if (!name || isNaN(value)) return;

    await sql`
      INSERT INTO playing_with_neon (name, value)
      VALUES (${name}, ${value})
    `;
  }

  return (
    <form action={create} className="flex flex-col gap-2 p-4">
      <input
        type="text"
        placeholder="Enter a name"
        name="name"
        className="border p-2 rounded"
      />
      <input
        type="number"
        step="any"
        placeholder="Enter a value"
        name="value"
        className="border p-2 rounded"
      />
      <button type="submit" className="bg-blue-500 text-white p-2 rounded">
        Submit
      </button>
    </form>
  );
}
