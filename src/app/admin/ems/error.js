'use client';
export default function Err({ reset }) {
  return (
    <div className="card max-w-xl">
      <h1 className="mb-2 text-lg font-semibold text-red-700">This page could not load</h1>
      <p className="text-sm text-gray-700">Most often the employee tables are missing (run neon-update.sql in Neon) or you are not logged in as admin. Open <a className="text-primary underline" href="/admin/ems/status">/status</a> to see exactly what is failing.</p>
      <button className="btn-primary mt-4" onClick={() => reset()}>Try again</button>
    </div>
  );
}
