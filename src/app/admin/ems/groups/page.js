import { sql, inr } from '@/ems/lib/db';
import { addGroup, updateGroup, toggleGroup } from '@/ems/actions';
import { Head } from '@/ems/components/ui';

export default async function Groups() {
  const groups = await sql`select g.*, coalesce((select string_agg(e.name, ', ' order by e.name) from employees e where e.perm_group_id=g.id and e.active),'') members,
    coalesce((select sum(x.share) from employee_daily_distributions x join daily_groups d on d.id=x.daily_group_id where d.perm_group_id=g.id),0) earned
    from employee_groups g order by g.name`;
  return (
    <>
      <Head t="Employee groups" />
      <p className="mb-4 text-sm text-gray-600">Permanent groups are for reference and quick set-up. Actual daily work and earnings use the <b>Daily Groups &amp; Attendance</b> page, where you can move employees freely.</p>
      <form action={addGroup} className="card mb-4 grid gap-3 md:grid-cols-3">
        <div><label className="label">Group name</label><input name="name" required className="input" placeholder="Group A" /></div>
        <div className="md:col-span-2"><label className="label">Description</label><input name="description" className="input" /></div>
        <div><button className="btn-primary">Create group</button></div>
      </form>
      <div className="space-y-3">
        {groups.map((g) => (
          <div key={g.id} className={`card ${g.active ? '' : 'opacity-60'}`}>
            <form action={updateGroup} className="flex flex-wrap gap-2">
              <input type="hidden" name="id" value={g.id} />
              <input name="name" defaultValue={g.name} className="input max-w-[14rem]" />
              <input name="description" defaultValue={g.description || ''} className="input max-w-sm" placeholder="Description" />
              <button className="btn">Save</button>
            </form>
            <p className="mt-2 text-sm text-gray-600">Members: {g.members || 'none (set a permanent group on the employee profile)'}</p>
            <p className="text-sm text-gray-600">Earnings from daily groups copied from this group: {inr(g.earned)}</p>
            <form action={toggleGroup} className="mt-1"><input type="hidden" name="id" value={g.id} /><button className="text-sm text-primary">{g.active ? 'Archive group' : 'Reactivate group'}</button></form>
          </div>
        ))}
        {!groups.length && <p className="text-sm text-gray-500">No groups yet.</p>}
      </div>
    </>
  );
}

export const dynamic = 'force-dynamic';
