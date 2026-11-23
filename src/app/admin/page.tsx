"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useApi, State, Card, Stat, inr, fdt, fdate, today } from "@/components/ui";

const RANGES = [["today", "Today"], ["yesterday", "Yesterday"], ["week", "This Week"], ["month", "This Month"], ["lastmonth", "Last Month"], ["year", "This Year"], ["custom", "Custom"]];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const compact = (v: number) => (v >= 100000 ? (v / 100000).toFixed(1) + "L" : v >= 1000 ? (v / 1000).toFixed(1) + "k" : String(Math.round(v)));
function last12() { const out: string[] = []; const n = new Date(Date.now() + 19800000); for (let i = 11; i >= 0; i--) out.push(new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth() - i, 1)).toISOString().slice(0, 7)); return out; }

export default function Dashboard() {
  const [r, setR] = useState("month"), [f, setF] = useState(""), [t, setT] = useState(""), [branch, setBranch] = useState(""), [ready, setReady] = useState(false);
  useEffect(() => { setBranch(localStorage.getItem("dashBranch") || ""); setReady(true); }, []);
  const { data: brs } = useApi<any>("/api/branches?active=1");
  const bq = branch ? `&branch=${branch}` : "";
  const { data: d, err, loading } = useApi<any>(ready ? `/api/dashboard?range=${r}${r === "custom" && f && t ? `&from=${f}&to=${t}` : ""}${bq}` : null);
  function chooseBranch(v: string) { setBranch(v); localStorage.setItem("dashBranch", v); }
  if (!d) return <State loading={loading || !ready} err={err} />;
  const months = last12(), mv: any = Object.fromEntries(d.monthly.map((x: any) => [x.m, x.v])), maxM = Math.max(1, ...months.map(m => mv[m] || 0));
  const mix: any = Object.fromEntries(d.mix.map((x: any) => [x.pay_status, x])), mixTotal = Math.max(1, d.mix.reduce((a: number, x: any) => a + x.v, 0));
  const sbars = [["Total Sales", d.sales, "bg-primary"], ["Total Received", d.received, "bg-green-500"], ["Total Outstanding", d.outstanding, "bg-orange-500"]] as const, maxS = Math.max(1, ...sbars.map(b => Math.abs(b[1] as number)));
  const maxO = Math.max(1, ...d.top.map((x: any) => x.outstanding));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end justify-between">
        <h1 className="text-xl font-bold">Dashboard{d.branch ? ` – ${d.branch.name}` : ""}</h1>
        <div className="w-full sm:w-56"><label className="label">Branch</label>
          <select className="input" value={branch} onChange={e => chooseBranch(e.target.value)}><option value="">All branches</option>{(brs?.rows || []).map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
      </div>
      <div className="flex flex-wrap gap-2 items-end">
        {RANGES.map(([k, l]) => <button key={k} className={r === k ? "btn-primary btn-sm" : "btn btn-sm"} onClick={() => setR(k)}>{l}</button>)}
        {r === "custom" && <><input className="input !w-auto" type="date" value={f} onChange={e => setF(e.target.value)} /><input className="input !w-auto" type="date" value={t} onChange={e => setT(e.target.value)} /></>}
        <span className="text-xs text-gray-500 ml-auto">{fdate(d.from)} – {fdate(d.to)}</span>
      </div>
      {d.branch && <div className="text-xs text-gray-500 bg-primary-light rounded-lg p-2">Showing <b>{d.branch.name}</b> only. Branch figures are based on invoices of this branch and the payments allocated to them. Opening balances and advance payments not linked to a bill are included only under “All branches”.</div>}
      <State err={err} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Total Sales (period)" value={inr(d.sales)} tone="blue" /><Stat label="Total Received (period)" value={inr(d.received)} tone="green" />
        <Stat label="Total Outstanding" value={inr(d.outstanding)} tone="red" href={d.branch ? `/admin/invoices?status=PENDING${bq}` : "/admin/outstanding"} /><Stat label="Received This Month" value={inr(d.received_month)} tone="green" />
        <Stat label={d.branch ? "Customers (this branch)" : "Total Customers"} value={d.customers} href="/admin/customers" /><Stat label="Total Invoices" value={d.invoices.total} href={`/admin/invoices?x=1${bq}`} />
        <Stat label="Paid Invoices" value={d.invoices.paid} tone="green" href={`/admin/invoices?status=PAID${bq}`} /><Stat label="Pending Invoices" value={d.invoices.pending} tone="red" href={`/admin/invoices?status=PENDING${bq}`} />
      </div>

      <CalendarCard branch={branch} />

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Monthly collection (click a month)">
          <div className="flex items-end gap-1 h-44">{months.map(m => { const v = mv[m] || 0; return (
            <Link key={m} href={`/admin/payments?month=${m}`} className="flex-1 flex flex-col items-center justify-end h-full group" title={`${m}: ${inr(v)}`}>
              <div className="text-[9px] text-gray-500 opacity-0 group-hover:opacity-100">{v ? Math.round(v / 1000) + "k" : ""}</div>
              <div className="w-full bg-green-500 group-hover:bg-green-600 rounded-t transition-all" style={{ height: `${Math.max(2, (v / maxM) * 100)}%` }} />
              <div className="text-[10px] text-gray-500 mt-1">{MONTHS[+m.slice(5) - 1]}</div></Link>); })}</div>
        </Card>
        <Card title="Sales, received & outstanding">
          <div className="space-y-4 pt-2">{sbars.map(([l, v, c]) => <div key={l}><div className="flex justify-between text-sm mb-1"><span>{l}</span><b>{inr(v)}</b></div><div className="h-3 bg-gray-100 rounded-full"><div className={`h-3 rounded-full ${c} transition-all`} style={{ width: `${(Math.abs(v as number) / maxS) * 100}%` }} /></div></div>)}</div>
        </Card>
        <Card title="Customers with outstanding (click to open)" right={<Link className="text-sm text-primary" href="/admin/outstanding">View all</Link>}>
          {!d.top.length && <div className="text-sm text-gray-400">No outstanding balances 🎉</div>}
          <div className="space-y-2">{d.top.map((c: any) => <Link key={c.id} href={`/admin/customers/${c.id}`} className="block"><div className="flex justify-between text-sm"><span className="truncate">{c.name}</span><b className="text-orange-600">{inr(c.outstanding)}</b></div><div className="h-2 bg-gray-100 rounded-full"><div className="h-2 rounded-full bg-orange-500" style={{ width: `${(c.outstanding / maxO) * 100}%` }} /></div></Link>)}</div>
        </Card>
        <Card title="Paid vs partially paid vs unpaid (click a section)">
          <div className="flex h-6 rounded-full overflow-hidden bg-gray-100">{([["PAID", "bg-green-500"], ["PARTIAL", "bg-orange-400"], ["UNPAID", "bg-red-500"]] as const).map(([k, c]) => mix[k] ? <Link key={k} href={`/admin/invoices?status=${k}${bq}`} className={c} style={{ width: `${(mix[k].v / mixTotal) * 100}%` }} title={k} /> : null)}</div>
          <div className="mt-3 space-y-1 text-sm">{([["PAID", "Paid", "bg-green-500"], ["PARTIAL", "Partially paid", "bg-orange-400"], ["UNPAID", "Unpaid", "bg-red-500"]] as const).map(([k, l, c]) => <Link key={k} href={`/admin/invoices?status=${k}${bq}`} className="flex items-center gap-2 hover:underline"><span className={`w-3 h-3 rounded-full ${c}`} />{l}: {inr(mix[k]?.v || 0)} ({mix[k]?.n || 0} invoices)</Link>)}</div>
        </Card>
      </div>
      <Card title="Recent activity">
        <ul className="divide-y text-sm">{d.recent.map((a: any, i: number) => <li key={i} className="py-2 flex justify-between gap-2"><span>{({ invoice: "🧾", customer: "👤", payment: "💰", whatsapp: "💬", challan: "🚚" } as any)[a.kind]} {a.text}</span><span className="text-gray-400 whitespace-nowrap">{fdt(a.at)}</span></li>)}</ul>
      </Card>
    </div>
  );
}

// Month calendar: invoice count per day; click a date to see that day's invoices and net selling value.
function CalendarCard({ branch }: { branch: string }) {
  const [month, setMonth] = useState(today().slice(0, 7)), [sel, setSel] = useState(today());
  const bq = branch ? `&branch=${branch}` : "";
  const { data: cal } = useApi<any>(`/api/dashboard/calendar?month=${month}${bq}`);
  const { data: day, loading: dl } = useApi<any>(sel ? `/api/dashboard/calendar?date=${sel}${bq}` : null);
  const [y, m] = month.split("-").map(Number), startDow = new Date(Date.UTC(y, m - 1, 1)).getUTCDay(), dim = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const map: any = Object.fromEntries((cal?.days || []).map((x: any) => [x.date, x]));
  const cells: (number | null)[] = [...Array(startDow).fill(null), ...Array.from({ length: dim }, (_, i) => i + 1)];
  const shift = (n: number) => setMonth(new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7));
  const ds = (d: number) => `${month}-${String(d).padStart(2, "0")}`;
  return (
    <Card title="Sales calendar" right={<div className="flex items-center gap-1"><button className="btn btn-sm" onClick={() => shift(-1)}>‹</button><span className="text-sm font-medium w-36 text-center">{MONTH_FULL[m - 1]} {y}</span><button className="btn btn-sm" onClick={() => shift(1)}>›</button><button className="btn btn-sm" onClick={() => { setMonth(today().slice(0, 7)); setSel(today()); }}>Today</button></div>}>
      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-gray-500 mb-1">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(w => <div key={w}>{w}</div>)}</div>
          <div className="grid grid-cols-7 gap-1">{cells.map((c, i) => {
            if (!c) return <div key={i} />;
            const k = ds(c), x = map[k], isSel = sel === k, isToday = today() === k;
            return (
              <button key={i} onClick={() => setSel(k)} className={`h-14 sm:h-16 rounded-lg border p-1 text-left flex flex-col justify-between transition ${isSel ? "border-primary bg-primary-light" : "border-gray-200 hover:bg-gray-50"} ${isToday ? "ring-2 ring-primary" : ""}`}>
                <div className="flex justify-between items-start"><span className="text-xs font-medium">{c}</span>{x?.invoices > 0 && <span className="text-[10px] leading-none rounded px-1 py-0.5 bg-primary" style={{ color: "var(--on-primary)" }}>{x.invoices}</span>}</div>
                {x?.sales > 0 && <div className="hidden sm:block text-[10px] text-gray-500 truncate">₹{compact(x.sales)}</div>}
              </button>);
          })}</div>
          <div className="text-[11px] text-gray-500 mt-2">The small number on a date is the count of invoices; the amount is the net selling value.</div>
        </div>
        <div className="lg:col-span-2 border-t lg:border-t-0 lg:border-l border-gray-200 pt-3 lg:pt-0 lg:pl-4">
          <div className="font-semibold mb-2">{fdate(sel)}</div>
          {dl && !day && <div className="text-sm text-gray-400">Loading…</div>}
          {day && <>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="rounded-lg bg-primary-light p-2"><div className="text-[11px] text-gray-500">Invoices</div><div className="font-bold">{day.count}</div></div>
              <div className="rounded-lg bg-primary-light p-2"><div className="text-[11px] text-gray-500">Net selling value</div><div className="font-bold text-sm">{inr(day.net)}</div></div>
              <div className="rounded-lg bg-primary-light p-2"><div className="text-[11px] text-gray-500">Received</div><div className="font-bold text-sm text-green-600">{inr(day.received)}</div></div>
            </div>
            {day.less > 0 && <div className="text-xs text-gray-500 mb-2">Gross {inr(day.gross)} − Less {inr(day.less)} = Net {inr(day.net)}</div>}
            {!day.count && <div className="text-sm text-gray-400">No invoices on this day.</div>}
            <div className="divide-y text-sm max-h-60 overflow-y-auto">{day.invoices.map((i: any) => <Link key={i.id} href={`/admin/invoices/${i.id}`} className="flex justify-between gap-2 py-2 hover:underline"><span className="truncate"><b>{i.number}</b> · {i.customer_name}{i.branch && !branch ? <span className="text-xs text-gray-400"> · {i.branch}</span> : null}</span><span className="whitespace-nowrap">{inr(i.grand_total)}</span></Link>)}</div>
          </>}
        </div>
      </div>
    </Card>
  );
}
