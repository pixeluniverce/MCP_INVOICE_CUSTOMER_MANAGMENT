"use client";
import { useState } from "react";
import { api, useApi, useDebounce, State, Card, Table, Badge, inr } from "@/components/ui";

const blank = { name: "", description: "", category: "", hsn: "", rate: "", unit: "Nos", gst_rate: "", active: true, show_in_catalog: true };

// Resize a picked photo to max 500px JPEG so the catalog loads fast
function readImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const rd = new FileReader();
    rd.onload = () => { const img = new Image(); img.onload = () => {
      const sc = Math.min(1, 500 / Math.max(img.width, img.height)), c = document.createElement("canvas"); c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
      const x = c.getContext("2d")!; x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height); resolve(c.toDataURL("image/jpeg", 0.8)); };
      img.onerror = () => reject(new Error("Could not read image")); img.src = String(rd.result); };
    rd.onerror = () => reject(new Error("Could not read image")); rd.readAsDataURL(file);
  });
}

export default function Products() {
  const [search, setSearch] = useState(""), ds = useDebounce(search), { data, err, loading, reload } = useApi<any>(`/api/products?search=${encodeURIComponent(ds)}`);
  const [f, setF] = useState<any>(null), [msg, setMsg] = useState(""), [img, setImg] = useState<string | null>(null); // img: undefined=unchanged, ""=remove, data=new
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  async function save() {
    setMsg(""); const payload: any = { ...f }; if (img !== null) payload.image = img;
    try { f.id ? await api(`/api/products/${f.id}`, "PUT", payload) : await api("/api/products", "POST", payload); setF(null); setImg(null); reload(); } catch (e: any) { setMsg(e.message); }
  }
  async function del(p: any) { if (!confirm(`Delete "${p.name}" from products and catalog?\nOld invoices keep their own copy of this item.`)) return; try { await api(`/api/products/${p.id}`, "DELETE"); reload(); } catch (e: any) { alert(e.message); } }
  async function pickImage(e: React.ChangeEvent<HTMLInputElement>) { const file = e.target.files?.[0]; if (!file) return; try { setImg(await readImage(file)); } catch (er: any) { setMsg(er.message); } }
  const I = (k: string, l: string, t = "text") => <div><label className="label">{l}</label><input className="input" type={t} value={f[k] ?? ""} onChange={set(k)} /></div>;
  const preview = img ? img : img === null && f?.id && f?.has_image ? `/api/products/${f.id}/image?v=${f.image_v}` : "";
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center"><h1 className="text-xl font-bold">Products &amp; Catalog</h1><button className="btn-primary" onClick={() => { setF({ ...blank }); setImg(null); setMsg(""); }}>+ Add Product</button></div>
      <p className="text-sm text-gray-500">Everything here can be used on invoices. Items marked <b>Show in customer catalog</b> appear in the customers&apos; portal with their own price.</p>
      {f && <Card title={f.id ? "Edit product" : "New product"}>
        <div className="grid sm:grid-cols-3 gap-3">{I("name", "Product name *")}{I("category", "Category (e.g. Cement, Blocks)")}{I("description", "Description")}{I("hsn", "HSN code")}{I("rate", "Default rate (₹)", "number")}{I("unit", "Unit")}{I("gst_rate", "Default GST % (total, optional)", "number")}</div>
        <div className="flex flex-wrap items-center gap-4 mt-3">
          <div className="h-24 w-24 border rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden">{preview ? <img src={preview} alt="" className="max-h-full max-w-full object-contain" /> : <span className="text-xs text-gray-400">No photo</span>}</div>
          <div className="space-y-2"><input type="file" accept="image/png,image/jpeg,image/webp" className="text-sm" onChange={pickImage} />{(preview) && <div><button className="btn-danger btn-sm" onClick={() => setImg("")}>Remove photo</button></div>}</div>
        </div>
        <div className="flex flex-wrap gap-5 mt-3 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={f.show_in_catalog !== false} onChange={set("show_in_catalog")} /> Show in customer catalog</label>{f.id && <label className="flex items-center gap-2"><input type="checkbox" checked={f.active} onChange={set("active")} /> Active</label>}</div>
        {msg && <div className="text-sm text-red-600 mt-2">{msg}</div>}<div className="flex gap-2 mt-3"><button className="btn-primary" onClick={save}>Save</button><button className="btn" onClick={() => setF(null)}>Cancel</button></div></Card>}
      <Card><div className="w-full sm:w-64 mb-3"><input className="input" placeholder="Search products" value={search} onChange={e => setSearch(e.target.value)} /></div><State loading={loading && !data} err={err} />
        <Table head={["", "Product", "Category", "Default rate", "Unit", "GST %", "Catalog", "Status", ""]} empty={!loading && !data?.rows.length}>{(data?.rows || []).map((p: any) => <tr key={p.id}>
          <td className="td">{p.has_image ? <img src={`/api/products/${p.id}/image?v=${p.image_v}`} alt="" className="h-10 w-10 object-cover rounded" /> : <div className="h-10 w-10 rounded bg-gray-100" />}</td>
          <td className="td font-medium">{p.name}<div className="text-xs text-gray-400 max-w-xs truncate">{p.description}</div></td><td className="td">{p.category || "-"}</td><td className="td text-right">{inr(p.rate)}</td><td className="td">{p.unit}</td><td className="td">{p.gst_rate ?? "-"}</td>
          <td className="td">{p.show_in_catalog ? "Visible" : <span className="text-gray-400">Hidden</span>}</td><td className="td"><Badge s={p.active ? "ACTIVE" : "REVERSED"} /></td>
          <td className="td space-x-1 text-right"><button className="btn btn-sm" onClick={() => { setF({ ...p, gst_rate: p.gst_rate ?? "", category: p.category ?? "" }); setImg(null); setMsg(""); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</button><button className="btn-danger btn-sm" onClick={() => del(p)}>Delete</button></td></tr>)}</Table></Card>
    </div>
  );
}
