"use client";
import { useState } from "react";
import { api, useApi, State, Card, inr } from "@/components/ui";

// Three price lists (Retail / Wholesale / Bulk) side by side. Blank = that list uses the product's default rate.
export default function PriceLists() {
  const { data, err, loading, reload } = useApi<any>("/api/pricelists");
  const [edits, setEdits] = useState<Record<string, string>>({}), [names, setNames] = useState<Record<string, string>>({}), [search, setSearch] = useState(""), [msg, setMsg] = useState(""), [busy, setBusy] = useState(false);
  if (!data) return <State loading={loading} err={err} />;
  const { lists, products, rates } = data;
  const key = (l: number, p: number) => `${l}:${p}`;
  const val = (l: number, p: number) => edits[key(l, p)] ?? (rates[l]?.[p] ?? "");
  const dirty = Object.keys(edits).length + Object.keys(names).length;
  const rows = products.filter((p: any) => !search || (p.name + " " + (p.category || "")).toLowerCase().includes(search.toLowerCase()));
  function fillBlank(l: number) { const n = { ...edits }; for (const p of products) if (val(l, p.id) === "") n[key(l, p.id)] = String(p.rate); setEdits(n); }
  async function save() {
    setBusy(true); setMsg("");
    try {
      for (const l of lists) {
        const rs = Object.entries(edits).filter(([k]) => k.startsWith(l.id + ":")).map(([k, v]) => ({ product_id: Number(k.split(":")[1]), rate: v === "" ? null : Number(v) }));
        const nm = names[l.id]; if (!rs.length && !nm) continue;
        await api(`/api/pricelists/${l.id}`, "PUT", { rates: rs, name: nm });
      }
      setEdits({}); setNames({}); setMsg("Saved"); reload();
    } catch (e: any) { setMsg(e.message); } finally { setBusy(false); }
  }
  async function addList() { const name = prompt("New price list name (e.g. Dealer)"); if (!name) return; try { await api("/api/pricelists", "POST", { name }); reload(); } catch (e: any) { alert(e.message); } }
  async function delList(l: any) { if (!confirm(`Delete the "${l.name}" price list?\n${l.customers} customer(s) using it will fall back to default rates.`)) return; try { await api(`/api/pricelists/${l.id}`, "DELETE"); reload(); } catch (e: any) { alert(e.message); } }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2"><h1 className="text-xl font-bold">Price Lists</h1>
        <div className="flex gap-2"><button className="btn" onClick={addList}>+ Add list</button><button className="btn-primary" disabled={!dirty || busy} onClick={save}>{busy ? "Saving…" : `Save changes${dirty ? ` (${dirty})` : ""}`}</button></div></div>
      <p className="text-sm text-gray-500">Set a rate for each product in each list. Assign a list to a customer on the customer&apos;s page; invoices and the customer catalog then use that list automatically (a customer&apos;s own special price still wins). Leave a cell blank to use the product&apos;s default rate.</p>
      {msg && <div className="rounded-lg bg-primary-light text-primary text-sm p-3">{msg}</div>}
      <Card>
        <div className="w-full sm:w-64 mb-3"><input className="input" placeholder="Search product or category" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr>
          <th className="th">Product</th><th className="th text-right">Default</th>
          {lists.map((l: any) => <th key={l.id} className="th min-w-[150px]">
            <input className="input !min-h-0 !py-1 font-semibold normal-case" value={names[l.id] ?? l.name} onChange={e => setNames({ ...names, [l.id]: e.target.value })} />
            <div className="flex gap-1 mt-1 normal-case font-normal"><a className="text-xs text-primary underline" href={`/api/pdf/catalog/0?list=${l.id}`}>PDF</a><button className="text-xs text-primary underline" onClick={() => fillBlank(l.id)}>fill blanks</button><button className="text-xs text-red-600 underline" onClick={() => delList(l)}>delete</button></div>
            <div className="text-[10px] text-gray-400 normal-case font-normal">{l.customers} customer(s)</div></th>)}
        </tr></thead><tbody>{rows.map((p: any) => <tr key={p.id}>
          <td className="td font-medium">{p.name}<div className="text-xs text-gray-400">{p.category || ""} {p.unit && `· per ${p.unit}`}</div></td><td className="td text-right text-gray-500">{inr(p.rate)}</td>
          {lists.map((l: any) => <td key={l.id} className="td"><input className={`input !min-h-0 !py-1 w-28 ${edits[key(l.id, p.id)] !== undefined ? "!border-primary" : ""}`} type="number" step="any" min="0" placeholder={String(p.rate)} value={val(l.id, p.id)} onChange={e => setEdits({ ...edits, [key(l.id, p.id)]: e.target.value })} /></td>)}</tr>)}</tbody></table>
          {!rows.length && <div className="text-center text-sm text-gray-400 py-6">No products yet. Add products first in Products &amp; Catalog.</div>}</div>
      </Card>
    </div>
  );
}
