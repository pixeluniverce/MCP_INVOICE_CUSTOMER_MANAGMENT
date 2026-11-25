"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, useApi, useDebounce, State, Card, inr, today } from "./ui";
import { calcInvoice } from "@/lib/calc";
import { MODES } from "./views";

const blankItem = { name: "", description: "", hsn: "", qty: 1, unit: "Nos", rate: "", discount: 0, gst_rate: "" };

// Click to open, search inside, click a customer to select.
function CustomerPicker({ value, onChange, disabled }: { value: any; onChange: (c: any) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false), [s, setS] = useState(""), ds = useDebounce(s), ref = useRef<HTMLDivElement>(null);
  const { data, loading } = useApi<any>(open ? `/api/customers?size=30&search=${encodeURIComponent(ds)}` : null);
  useEffect(() => { const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);
  return (
    <div className="relative" ref={ref}>
      <button type="button" disabled={disabled} className="input text-left flex justify-between items-center gap-2" onClick={() => setOpen(!open)}>
        <span className={value ? "truncate" : "text-gray-400"}>{value ? `${value.name} · ${value.mobile}` : "Select customer"}</span><span className="text-gray-400">▾</span>
      </button>
      {open && <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg p-2">
        <input autoFocus className="input" placeholder="Search by name or mobile…" value={s} onChange={e => setS(e.target.value)} />
        <div className="mt-2 max-h-64 overflow-y-auto divide-y">
          {loading && !data && <div className="p-3 text-sm text-gray-400">Loading…</div>}
          {(data?.rows || []).filter((c: any) => c.active).map((c: any) => (
            <button type="button" key={c.id} className="w-full text-left px-3 py-2 hover:bg-primary-light text-sm" onClick={() => { onChange(c); setOpen(false); setS(""); }}>
              {c.name} <span className="text-gray-400">· {c.mobile}</span>{c.outstanding > 0.004 && <span className="text-orange-600 text-xs ml-1">due {inr(c.outstanding)}</span>}
            </button>))}
          {data && !data.rows.length && <div className="p-3 text-sm text-gray-400">No customer found</div>}
        </div>
      </div>}
    </div>
  );
}

export default function InvoiceForm({ id }: { id?: string }) {
  const router = useRouter(), editing = !!id;
  const { data: st } = useApi<any>("/api/settings");
  const { data: prods } = useApi<any>("/api/products?active=1");
  const { data: brs } = useApi<any>("/api/branches?active=1");
  const { data: ex } = useApi<any>(id ? `/api/invoices/${id}` : null);
  const [cust, setCust] = useState<any>(null), [prices, setPrices] = useState<any>({}), [priceSrc, setPriceSrc] = useState<any>({}), [savePrices, setSavePrices] = useState(false), [branchId, setBranchId] = useState(""), [reason, setReason] = useState("");
  const [f, setF] = useState<any>({ date: today(), due_date: "", place_of_supply: "", gst_enabled: false, gst_type: "CGST_SGST", cgst: 9, sgst: 9, igst: 18, other_charges: 0, other_label: "", less_amount: "", less_label: "", notes: "" });
  const [items, setItems] = useState<any[]>([{ ...blankItem }]);
  const [pay, setPay] = useState<any>({ amount: "", date: today(), mode: "Cash", reference: "" });
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false), loaded = useRef(false), [showLogo, setShowLogo] = useState(true), [showSig, setShowSig] = useState(false), [showBank, setShowBank] = useState(false), [invoiceNo, setInvoiceNo] = useState(""), bankTouched = useRef(false);
  useEffect(() => { if (!editing && !bankTouched.current) setShowBank(!!f.gst_enabled); }, [f.gst_enabled]);

  // defaults for a NEW invoice
  useEffect(() => { if (st && !id) { setShowLogo(st.inv_show_logo !== false); setShowSig(!!st.inv_show_signature); } if (st && !id) setF((x: any) => ({ ...x, gst_enabled: !!st.gst_enabled, gst_type: st.gst_type || "CGST_SGST", cgst: st.cgst ?? 9, sgst: st.sgst ?? 9, igst: st.igst ?? 18 })); }, [st]);
  useEffect(() => { if (!id) { const cid = sessionStorage.getItem("newInvoiceCustomer"); if (cid) { sessionStorage.removeItem("newInvoiceCustomer"); api(`/api/customers/${cid}`).then(pick).catch(() => {}); } } }, []);
  useEffect(() => { if (brs?.rows.length && !branchId) { const last = localStorage.getItem("branchId"); setBranchId(String(brs.rows.find((b: any) => String(b.id) === last)?.id || brs.rows[0].id)); } }, [brs]);
  // load an EXISTING invoice for editing
  useEffect(() => {
    if (!id || !ex || !st || loaded.current) return; loaded.current = true;
    const inv = ex.invoice, its = ex.items, base = its[0] || {}, cg = inv.gst_enabled && inv.gst_type === "CGST_SGST", ig = inv.gst_enabled && inv.gst_type === "IGST";
    setCust({ id: inv.customer_id, name: inv.customer_name, mobile: inv.mobile });
    if (inv.branch_id) setBranchId(String(inv.branch_id));
    setShowLogo(inv.show_logo ?? st.inv_show_logo !== false); setShowSig(inv.show_signature ?? !!st.inv_show_signature); setShowBank(inv.show_bank ?? inv.gst_enabled); setInvoiceNo(inv.number); bankTouched.current = true;
    setF({ date: inv.date, due_date: inv.due_date || "", place_of_supply: inv.place_of_supply || "", gst_enabled: inv.gst_enabled, gst_type: inv.gst_enabled ? inv.gst_type : st.gst_type || "CGST_SGST",
      cgst: cg ? base.cgst_rate : st.cgst ?? 9, sgst: cg ? base.sgst_rate : st.sgst ?? 9, igst: ig ? base.igst_rate : st.igst ?? 18, other_charges: inv.other_charges || 0, other_label: inv.other_label || "",
      less_amount: inv.less_amount || "", less_label: inv.less_label || "", notes: inv.notes || "" });
    setItems(its.map((x: any) => { const same = x.cgst_rate === base.cgst_rate && x.sgst_rate === base.sgst_rate && x.igst_rate === base.igst_rate;
      return { name: x.name, description: x.description || "", hsn: x.hsn || "", qty: x.qty, unit: x.unit || "Nos", rate: x.rate, discount: x.discount, gst_rate: inv.gst_enabled && !same ? x.cgst_rate + x.sgst_rate + x.igst_rate : "" }; }));
  }, [ex, st]);
  useEffect(() => {
    if (!cust) { setPrices({}); return; }
    api(`/api/customers/${cust.id}/prices`).then(j => { const m: any = {}, src: any = {}; Object.entries(j.tier?.rates || {}).forEach(([k, v]) => { m[k] = v; src[k] = j.tier.list_name; }); j.rows.forEach((r: any) => { m[r.product_id] = r.rate; src[r.product_id] = "Customer"; }); setPrices(m); setPriceSrc(src); if (!editing) setItems(its => its.map(it => it.product_id && m[it.product_id] != null ? { ...it, rate: m[it.product_id] } : it)); }).catch(() => {});
  }, [cust]);

  function pick(c: any) { setCust(c); if (!editing) setF((x: any) => ({ ...x, place_of_supply: c.state || x.place_of_supply })); }
  const setI = (n: number, k: string, v: any) => setItems(items.map((it, i) => i === n ? { ...it, [k]: v } : it));
  function chooseProduct(n: number, pid: string) {
    const p = prods?.rows.find((x: any) => String(x.id) === pid); if (!p) return;
    setItems(items.map((it, i) => i === n ? { ...it, name: p.name, description: p.description || "", hsn: p.hsn || "", product_id: p.id, rate: prices[p.id] ?? p.rate, unit: p.unit, gst_rate: p.gst_rate ?? "" } : it));
  }
  const calc = useMemo(() => { try { return calcInvoice({ ...f, cgst: +f.cgst, sgst: +f.sgst, igst: +f.igst, other_charges: +f.other_charges || 0, less_amount: +f.less_amount || 0, items }); } catch { return null; } }, [f, items]);
  const paidNow = Math.max(0, Number(pay.amount) || 0), alreadyPaid = ex?.invoice?.paid || 0;
  const balance = calc ? calc.grand_total - (editing ? alreadyPaid : paidNow) : 0;

  async function submit(override = false) {
    if (!cust) return setErr("Select a customer"); setBusy(true); setErr("");
    try {
      const payload = { ...f, customer_id: cust.id, items, override_tax_type: override, branch_id: branchId, save_prices: savePrices, show_logo: showLogo, show_signature: showSig, show_bank: showBank, invoice_number: invoiceNo };
      const j = editing ? await api(`/api/invoices/${id}`, "PUT", { ...payload, reason }) : await api("/api/invoices", "POST", { ...payload, payment: paidNow > 0 ? pay : null });
      localStorage.setItem("branchId", branchId);
      router.push(`/admin/invoices/${editing ? id : j.id}`);
    } catch (e: any) {
      if (e.code === "TAX_TYPE" && confirm(e.message)) return submit(true);
      setErr(e.message);
    } finally { setBusy(false); }
  }
  const F = (k: string, label: string, type = "text", extra: any = {}) => <div><label className="label">{label}</label><input className="input" type={type} value={f[k] ?? ""} onChange={e => setF({ ...f, [k]: e.target.value })} {...extra} /></div>;
  if (!st || (editing && !ex)) return <State loading />;
  return (
    <div className="space-y-4 max-w-5xl">
      <h1 className="text-xl font-bold">{editing ? `Edit Invoice ${ex.invoice.number}` : "New Invoice"}</h1>
      {editing && <div className="rounded-lg bg-yellow-50 text-yellow-800 text-sm p-3">Editing a saved invoice. The previous version is kept in the invoice&apos;s edit history. {alreadyPaid > 0 && <>Already paid on this invoice: <b>{inr(alreadyPaid)}</b>.</>}</div>}
      <Card title="Customer & branch">
        <div className="grid sm:grid-cols-2 gap-3">
          <div><label className="label">Customer {editing && "(cannot be changed)"}</label><CustomerPicker value={cust} onChange={pick} disabled={editing} /></div>
          <div><label className="label">Branch</label><select className="input" value={branchId} onChange={e => setBranchId(e.target.value)}>{(brs?.rows || []).map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
        </div>
      </Card>
      <Card title="Invoice details"><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3"><div><label className="label">Invoice number {editing ? "" : "(blank = automatic)"}</label><input className="input" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} placeholder="e.g. GST/2026/001" /></div>{F("date", "Invoice date", "date")}{F("due_date", "Due date", "date")}{F("place_of_supply", "Place of supply (state)")}</div></Card>
      <Card title="Products">
        <div className="space-y-3">{items.map((it, n) => (
          <div key={n} className="border rounded-xl p-3 space-y-2 bg-gray-50">
            <div className="grid sm:grid-cols-4 gap-2">
              <div className="sm:col-span-2"><label className="label">Product</label><input className="input" list="plist" value={it.name} onChange={e => { const v = e.target.value; const m = prods?.rows.find((p: any) => p.name === v); if (m) chooseProduct(n, String(m.id)); else setItems(items.map((x, i) => i === n ? { ...x, name: v, product_id: null } : x)); }} placeholder="Type or pick a saved product" /></div>
              <div><label className="label">HSN</label><input className="input" value={it.hsn} onChange={e => setI(n, "hsn", e.target.value)} /></div>
              <div><label className="label">Description</label><input className="input" value={it.description} onChange={e => setI(n, "description", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
              <div><label className="label">Qty</label><input className="input" type="number" step="any" value={it.qty} onChange={e => setI(n, "qty", e.target.value)} /></div>
              <div><label className="label">Unit</label><input className="input" value={it.unit} onChange={e => setI(n, "unit", e.target.value)} /></div>
              <div><label className="label">Rate</label><input className="input" type="number" step="any" value={it.rate} onChange={e => setI(n, "rate", e.target.value)} />{it.product_id && prices[it.product_id] != null && <div className="text-[10px] text-primary mt-0.5">{priceSrc[it.product_id] || "Customer"} price{Number(it.rate) !== prices[it.product_id] ? " (changed)" : ""}</div>}</div>
              <div><label className="label">Discount ₹</label><input className="input" type="number" step="any" value={it.discount} onChange={e => setI(n, "discount", e.target.value)} /></div>
              {f.gst_enabled && <div><label className="label">GST % (optional override)</label><input className="input" type="number" step="any" value={it.gst_rate} onChange={e => setI(n, "gst_rate", e.target.value)} placeholder="default" /></div>}
              <div className="flex items-end justify-between"><div className="text-sm font-medium">{inr((Number(it.qty) || 0) * (Number(it.rate) || 0) - (Number(it.discount) || 0))}</div>{items.length > 1 && <button className="btn-danger btn-sm" onClick={() => setItems(items.filter((_, i) => i !== n))}>Remove</button>}</div>
            </div>
          </div>))}</div>
        <datalist id="plist">{(prods?.rows || []).map((p: any) => <option key={p.id} value={p.name} />)}</datalist>
        <button className="btn mt-3" onClick={() => setItems([...items, { ...blankItem }])}>+ Add row</button>
        {cust && <label className="flex items-center gap-2 text-sm mt-3"><input type="checkbox" checked={savePrices} onChange={e => setSavePrices(e.target.checked)} /> Save these rates as {cust.name}&apos;s special prices</label>}
      </Card>
      <Card title="Print options for this invoice">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showLogo} onChange={e => setShowLogo(e.target.checked)} /> Show my logo on this invoice {!st.logo && <span className="text-xs text-gray-400">(upload a logo in Settings first)</span>}</label>
        <label className="flex items-center gap-2 text-sm mt-2"><input type="checkbox" checked={showSig} onChange={e => setShowSig(e.target.checked)} /> Show my signature on this invoice {!st.signature && <span className="text-xs text-gray-400">(upload a signature in Settings first)</span>}</label>
        <label className="flex items-center gap-2 text-sm mt-2"><input type="checkbox" checked={showBank} onChange={e => { setShowBank(e.target.checked); bankTouched.current = true; }} /> Show bank details on this invoice {!st.bank_account_no && !st.bank_upi && <span className="text-xs text-gray-400">(add bank details in Settings first)</span>}</label>
      </Card>
      <Card title="GST">
        <label className="flex items-center gap-2 font-medium"><input type="checkbox" checked={f.gst_enabled} onChange={e => setF({ ...f, gst_enabled: e.target.checked })} /> Enable GST</label>
        {f.gst_enabled && <div className="mt-3 space-y-3">
          <div className="flex gap-4 text-sm"><label className="flex items-center gap-1"><input type="radio" checked={f.gst_type === "CGST_SGST"} onChange={() => setF({ ...f, gst_type: "CGST_SGST" })} /> CGST + SGST</label><label className="flex items-center gap-1"><input type="radio" checked={f.gst_type === "IGST"} onChange={() => setF({ ...f, gst_type: "IGST" })} /> IGST</label></div>
          {f.gst_type === "CGST_SGST" ? <div className="grid grid-cols-2 gap-3 max-w-sm">{F("cgst", "CGST %", "number", { step: "any" })}{F("sgst", "SGST %", "number", { step: "any" })}</div> : <div className="max-w-[10rem]">{F("igst", "IGST %", "number", { step: "any" })}</div>}
          <p className="text-xs text-gray-500">Any percentage is allowed. Rates are saved on this invoice, so changing defaults later never alters old invoices.</p></div>}
      </Card>
      <Card title="Extra charges, less / deduction & notes">
        <div className="grid sm:grid-cols-2 gap-3">{F("other_label", "Additional charge label (e.g. Transport)")}{F("other_charges", "Additional charges ₹ (added)", "number", { step: "any" })}</div>
        <div className="grid sm:grid-cols-2 gap-3 mt-3 rounded-xl bg-red-50 p-3">{F("less_label", "Less / deduction label (e.g. Rent, Discount)")}{F("less_amount", "Less amount ₹ (subtracted from total)", "number", { step: "any" })}</div>
        <div className="mt-3">{F("notes", "Notes")}</div>
      </Card>
      {!editing && <Card title="Initial payment (optional)">
        <div className="grid sm:grid-cols-4 gap-3"><div><label className="label">Initial payment ₹</label><input className="input" type="number" step="any" value={pay.amount} onChange={e => setPay({ ...pay, amount: e.target.value })} /></div>
          <div><label className="label">Payment date</label><input className="input" type="date" value={pay.date} onChange={e => setPay({ ...pay, date: e.target.value })} /></div>
          <div><label className="label">Mode</label><select className="input" value={pay.mode} onChange={e => setPay({ ...pay, mode: e.target.value })}>{MODES.map(m => <option key={m}>{m}</option>)}</select></div>
          <div><label className="label">Reference no.</label><input className="input" value={pay.reference} onChange={e => setPay({ ...pay, reference: e.target.value })} /></div></div>
      </Card>}
      <Card>
        {calc ? <div className="ml-auto max-w-xs text-sm space-y-1">
          <div className="flex justify-between"><span>Taxable amount</span><span>{inr(calc.taxable_total)}</span></div>
          {f.gst_enabled && calc.gst_type === "CGST_SGST" && <><div className="flex justify-between"><span>CGST</span><span>{inr(calc.cgst_total)}</span></div><div className="flex justify-between"><span>SGST</span><span>{inr(calc.sgst_total)}</span></div></>}
          {f.gst_enabled && calc.gst_type === "IGST" && <div className="flex justify-between"><span>IGST</span><span>{inr(calc.igst_total)}</span></div>}
          {calc.other_charges > 0 && <div className="flex justify-between"><span>{f.other_label || "Additional charges"}</span><span>{inr(calc.other_charges)}</span></div>}
          <div className="flex justify-between border-t pt-1"><span>Gross total</span><span>{inr(calc.gross_total)}</span></div>
          {calc.less_amount > 0 && <div className="flex justify-between text-red-600"><span>Less: {f.less_label || "Discount"}</span><span>- {inr(calc.less_amount)}</span></div>}
          <div className="flex justify-between font-bold text-base border-t pt-1"><span>Total payable</span><span>{inr(calc.grand_total)}</span></div>
          {(editing ? alreadyPaid : paidNow) > 0 && <div className="flex justify-between text-green-600"><span>{editing ? "Already paid" : "Paid now"}</span><span>{inr(editing ? alreadyPaid : paidNow)}</span></div>}
          <div className="flex justify-between font-semibold text-orange-600"><span>Balance</span><span>{inr(balance)}</span></div></div> : <div className="text-sm text-gray-400 text-right">Fill product name, quantity and rate to see totals</div>}
        {editing && <div className="mt-3"><label className="label">Reason for this edit *</label><input className="input" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Rent deduction added / rate corrected" /></div>}
        {err && <div className="text-sm text-red-600 bg-red-50 rounded-lg p-2 mt-3">{err}</div>}
        <div className="flex justify-end gap-2 mt-3">{editing && <button className="btn" onClick={() => router.push(`/admin/invoices/${id}`)}>Cancel</button>}<button className="btn-primary w-full sm:w-auto" disabled={busy} onClick={() => submit()}>{busy ? "Saving…" : editing ? "Save changes" : "Save Invoice"}</button></div>
      </Card>
    </div>
  );
}
