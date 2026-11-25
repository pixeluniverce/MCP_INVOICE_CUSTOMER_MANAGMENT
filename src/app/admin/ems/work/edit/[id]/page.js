import Link from 'next/link';
import { notFound } from 'next/navigation';
import { sql } from '@/ems/lib/db';
import { Head } from '@/ems/components/ui';
import WorkForm from '@/ems/components/WorkForm';

export default async function EditBatch({ params }) {
  const id = +params.id;
  const [b] = await sql`select b.id, b.notes, g.name gname, g.finalized, g.work_date::text d from production_batches b join daily_groups g on g.id=b.daily_group_id where b.id=${id}`;
  if (!b) notFound();
  const [lines, items] = await Promise.all([
    sql`select it.code, it.name, i.qty::float qty from production_batch_items i join items it on it.id=i.item_id where i.batch_id=${id} order by i.id`,
    sql`select id, code, name, rate::float rate from items order by code`,
  ]);
  return (
    <>
      <Head t="Edit production"><Link href={`/admin/ems/work?d=${b.d}`} className="btn">Back</Link></Head>
      {b.finalized ? (
        <div className="card text-sm text-gray-700">This group is finalized and locked. To correct it, open <Link className="text-primary underline" href={`/admin/ems/distribution?d=${b.d}`}>Earnings Distribution</Link>, click <b>Reopen (admin correction)</b>, edit the production here, then finalize again.</div>
      ) : (
        <WorkForm items={items} batch={{ id: b.id, gname: b.gname, date: b.d, notes: b.notes, rows: lines.map((l) => ({ q: `${l.code} – ${l.name}`, qty: String(l.qty) })) }} />
      )}
      <p className="mt-3 text-xs text-gray-500">Items that were already in this batch keep their saved rate. Newly added items use today's current rate.</p>
    </>
  );
}

export const dynamic = 'force-dynamic';
