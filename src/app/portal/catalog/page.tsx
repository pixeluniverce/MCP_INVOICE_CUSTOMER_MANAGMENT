"use client";
import { useState } from "react";
import { useApi, State, Card, inr } from "@/components/ui";

export default function Catalog() {
  const { data, err, loading } = useApi<any>("/api/catalog");
  const [search, setSearch] = useState(""), [cat, setCat] = useState("");
  if (!data) return <State loading={loading} err={err} />;
  const cats = Array.from(new Set(data.rows.map((r: any) => r.category).filter(Boolean))) as string[];
  const rows = data.rows.filter((r: any) => (!cat || r.category === cat) && (!search || (r.name + " " + (r.description || "")).toLowerCase().includes(search.toLowerCase())));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2"><h1 className="text-xl font-bold">Product Catalog</h1><a className="btn" href="/api/pdf/catalog/0">Download PDF</a></div>
      <div className="flex flex-wrap gap-2 items-end">
        <div className="w-full sm:w-64"><input className="input" placeholder="Search products" value={search} onChange={e => setSearch(e.target.value)} /></div>
        {cats.length > 0 && <div className="flex flex-wrap gap-2"><button className={!cat ? "btn-primary btn-sm" : "btn btn-sm"} onClick={() => setCat("")}>All</button>{cats.map(c => <button key={c} className={cat === c ? "btn-primary btn-sm" : "btn btn-sm"} onClick={() => setCat(c)}>{c}</button>)}</div>}
      </div>
      {!rows.length && <Card><div className="text-center text-sm text-gray-400 py-6">No items to show.</div></Card>}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">{rows.map((r: any) => (
        <div key={r.id} className="card !p-0 overflow-hidden flex flex-col">
          <div className="h-36 bg-gray-50 flex items-center justify-center">{r.has_image ? <img src={`/api/products/${r.id}/image?v=${r.image_v}`} alt={r.name} loading="lazy" className="h-full w-full object-cover" /> : <span className="text-4xl">📦</span>}</div>
          <div className="p-3 flex-1 flex flex-col"><div className="font-semibold leading-tight">{r.name}</div>{r.category && <div className="text-[11px] text-gray-400">{r.category}</div>}
            {r.description && <div className="text-xs text-gray-500 mt-1 line-clamp-3">{r.description}</div>}
            <div className="mt-auto pt-2">{data.show_prices && r.price != null ? <div className="font-bold text-primary">{inr(r.price)} <span className="text-xs font-normal text-gray-500">/ {r.unit}</span></div> : <div className="text-xs text-gray-500">Per {r.unit}</div>}</div></div>
        </div>))}</div>
    </div>
  );
}
