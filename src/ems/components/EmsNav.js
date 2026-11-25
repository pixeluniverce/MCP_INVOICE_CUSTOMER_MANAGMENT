'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [['/admin/ems', 'Dashboard'], ['/admin/ems/employees', 'Employees'], ['/admin/ems/groups', 'Employee Groups'], ['/admin/ems/assign', 'Daily Groups & Attendance'], ['/admin/ems/items', 'Items & Rates'], ['/admin/ems/work', 'Daily Production'], ['/admin/ems/distribution', 'Earnings Distribution'], ['/admin/ems/advances', 'Advances'], ['/admin/ems/payments', 'Payments'], ['/admin/ems/reports', 'Reports & Settlement'], ['/admin/ems/settings', 'Settings'], ['/admin/ems/status', 'System status'], ['/admin/ems/import', 'Import old data']];

export default function EmsNav() {
  const path = usePathname();
  const on = (h) => (h === '/admin/ems' ? path === h : path.startsWith(h));
  return (
    <div className="no-print mb-4">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Employee Management System</div>
      <nav className="flex gap-1 overflow-x-auto border-b border-gray-200">
        {links.map(([h, l]) => (
          <Link key={h} href={h} className={`whitespace-nowrap rounded-t-md px-3 py-2 text-sm ${on(h) ? 'border-b-2 border-primary font-medium text-primary' : 'text-gray-600 hover:text-gray-900'}`}>{l}</Link>
        ))}
      </nav>
    </div>
  );
}
