'use client';
import { useState } from 'react';
import { importOldEms } from '@/ems/import';
import { inr } from '@/ems/lib/fmt';

export default function ImportForm() {
  const [busy, setBusy] = useState(false), [res, setRes] = useState(null);
  async function submit(e) {
    e.preventDefault(); if (busy) return;
    setBusy(true); setRes(null);
    try { setRes(await importOldEms(new FormData(e.currentTarget))); } catch (er) { setRes({ ok: false, msg: er.message }); }
    setBusy(false);
  }
  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="card space-y-3">
        <div><label className="label">OLD database connection string</label>
          <input name="url" type="password" required className="input" placeholder="postgresql://user:password@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require" autoComplete="off" /></div>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="agree" className="mt-1" /> <span>I understand this copies all employee data (employees, groups, items, production, earnings, advances, payments, periods and history) from the old database into this app.</span></label>
        <div><label className="label">Only if this app already has employee data you want to REPLACE: type REPLACE</label><input name="replace" className="input max-w-xs" autoComplete="off" /></div>
        <button className="btn-primary" disabled={busy}>{busy ? 'Importing… please wait' : 'Import old data'}</button>
      </form>
      {res && !res.ok && <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">{res.msg}</div>}
      {res?.ok && (
        <div className="card space-y-3">
          <div className={`rounded-lg p-3 text-sm ${res.same ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-800'}`}>{res.same ? 'Import complete. Totals match the old database.' : 'Import complete, but the totals differ. Please check the numbers below.'}</div>
          <table className="tbl"><thead><tr><th>Table</th><th>Rows in old database</th><th>Rows now in this app</th></tr></thead>
            <tbody>{res.rows.map((r) => (<tr key={r.t}><td>{r.t}</td><td>{r.old}</td><td>{r.now}</td></tr>))}</tbody></table>
          <table className="tbl"><thead><tr><th>Check</th><th>Old database</th><th>This app</th></tr></thead>
            <tbody>
              <tr><td>Total earnings (finalized)</td><td>{inr(res.srcTotals.earned)}</td><td>{inr(res.dstTotals.earned)}</td></tr>
              <tr><td>Total advances</td><td>{inr(res.srcTotals.adv)}</td><td>{inr(res.dstTotals.adv)}</td></tr>
              <tr><td>Total payments</td><td>{inr(res.srcTotals.paid)}</td><td>{inr(res.dstTotals.paid)}</td></tr>
            </tbody></table>
          {res.notes.map((n) => <p key={n} className="text-xs text-gray-500">{n}</p>)}
        </div>
      )}
    </div>
  );
}
