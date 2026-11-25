import ImportForm from '@/ems/components/ImportForm';
import { Head } from '@/ems/components/ui';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export default function ImportPage() {
  return (
    <>
      <Head t="Import old employee data" />
      <div className="card mb-4 text-sm text-gray-600 space-y-2">
        <p>Use this once to bring the data from your <b>old Employee Management System</b> into this combined app.</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Open your <b>old</b> project&apos;s database (Neon dashboard → old project → <b>Connect</b>, or Vercel → old project → Settings → Environment Variables → <code>DATABASE_URL</code>).</li>
          <li>Copy the connection string and paste it below. It is used only for this import and is <b>not saved</b>.</li>
          <li>Click <b>Import old data</b>. Everything is copied in one step. If anything fails, nothing is changed.</li>
          <li>Check the comparison table that appears, then open Employees and Reports to confirm.</li>
        </ol>
        <p>Your old database is only read. It is never changed or deleted, so you can keep it as a backup.</p>
      </div>
      <ImportForm />
    </>
  );
}
