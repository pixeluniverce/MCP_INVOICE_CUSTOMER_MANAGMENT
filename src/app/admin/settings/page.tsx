"use client";
import { useEffect, useState } from "react";
import { api, useApi, State, Card } from "@/components/ui";
export default function Settings() {
  const { data, err, loading, reload } = useApi<any>("/api/settings");
  const [f, setF] = useState<any>(null), [msg, setMsg] = useState(""), [busy, setBusy] = useState(false), [origin, setOrigin] = useState("");
  useEffect(() => { if (data) setF({ ...data, wa_token: "", wa_verify_token: "", wa_app_secret: "" }); setOrigin(window.location.origin); }, [data]);
  if (!f) return <State loading={loading} err={err} />;
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const I = (k: string, l: string, t = "text", ph = "") => <div><label className="label">{l}</label><input className="input" type={t} value={f[k] ?? ""} onChange={set(k)} placeholder={ph} /></div>;
  async function save() { setBusy(true); setMsg(""); try { await api("/api/settings", "PUT", f); setMsg("Settings saved"); reload(); } catch (e: any) { setMsg(e.message); } finally { setBusy(false); } }
  async function test() { setMsg("Testing…"); try { await api("/api/settings", "PUT", f); const j = await api("/api/settings/wa-test", "POST"); setMsg(`Connected: ${j.info.verified_name || ""} ${j.info.display_phone_number || ""}`); reload(); } catch (e: any) { setMsg("Connection failed: " + e.message); } }
  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex justify-between items-center"><h1 className="text-xl font-bold">Settings</h1><button className="btn-primary" disabled={busy} onClick={save}>Save all settings</button></div>
      {msg && <div className="rounded-lg bg-blue-50 text-blue-800 text-sm p-3">{msg}</div>}
      <LogoCard f={f} setF={setF} />
      <BranchesCard />
      <Card title="Company details"><div className="grid sm:grid-cols-2 gap-3">{I("name", "Company name")}{I("mobile", "Mobile")}{I("address", "Address")}{I("email", "Email")}{I("gstin", "GSTIN")}{I("state", "State")}{I("state_code", "State code")}</div></Card>
      <Card title="Invoice settings"><div className="grid sm:grid-cols-3 gap-3">{I("invoice_prefix", "Invoice prefix")}{I("next_invoice", "Next invoice number", "number")}{I("payment_terms", "Payment terms")}</div><p className="text-xs text-gray-500 mt-2">Invoice numbers are generated automatically and safely (no duplicates).</p></Card>
      <Card title="GST defaults (used for new invoices only)">
        <label className="flex items-center gap-2 mb-3"><input type="checkbox" checked={!!f.gst_enabled} onChange={set("gst_enabled")} /> Enable GST by default</label>
        <div className="grid sm:grid-cols-4 gap-3"><div><label className="label">Default type</label><select className="input" value={f.gst_type} onChange={set("gst_type")}><option value="CGST_SGST">CGST + SGST</option><option value="IGST">IGST</option></select></div>{I("cgst", "CGST %", "number")}{I("sgst", "SGST %", "number")}{I("igst", "IGST %", "number")}</div></Card>
      <Card title="WhatsApp Business Cloud API">
        <div className="grid sm:grid-cols-2 gap-3">{I("wa_phone", "Business phone number")}{I("wa_phone_id", "Phone Number ID")}{I("wa_waba_id", "WhatsApp Business Account ID")}{I("wa_api_version", "API version", "text", "v21.0")}
          {I("wa_token", "Meta access token", "password", f.wa_token_set ? "•••••• saved (leave blank to keep)" : "Paste permanent token")}{I("wa_verify_token", "Webhook verify token", "password", f.wa_verify_token_set ? "•••••• saved" : "Any secret string you choose")}
          {I("wa_app_secret", "Meta App Secret (verifies webhook signatures)", "password", f.wa_app_secret_set ? "•••••• saved" : "Recommended")}{I("wa_template_name", "Approved template name (optional)")}{I("wa_template_lang", "Template language", "text", "en")}</div>
        <div className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3 mt-3 space-y-1"><div>Webhook URL for Meta: <b>{origin}/api/whatsapp/webhook</b> (subscribe to “messages”).</div><div>Without a template, WhatsApp only delivers PDFs to customers who messaged your number in the last 24 hours. For other customers, create an approved template with a DOCUMENT header and one body variable and enter its name above.</div><div>Tokens are stored server-side only and never sent to the browser. You can instead set the WHATSAPP_TOKEN environment variable in Vercel.</div></div>
        <button className="btn mt-3" onClick={test}>Save & test connection</button></Card>
    </div>
  );
}

function BranchesCard() {
  const { data, err, loading, reload } = useApi<any>("/api/branches");
  const [f, setF] = useState<any>(null), [msg, setMsg] = useState("");
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  async function save() { setMsg(""); try { f.id ? await api(`/api/branches/${f.id}`, "PUT", f) : await api("/api/branches", "POST", f); setF(null); reload(); } catch (e: any) { setMsg(e.message); } }
  return (
    <Card title="Branches" right={<button className="btn btn-sm" onClick={() => setF({ name: "", address: "", mobile: "", gstin: "", active: true })}>+ Add branch</button>}>
      <State loading={loading && !data} err={err} />
      <div className="divide-y">{(data?.rows || []).map((b: any) => <div key={b.id} className="py-2 flex items-center justify-between gap-2 text-sm"><div><b>{b.name}</b>{!b.active && <span className="text-xs text-gray-400"> (inactive)</span>}<div className="text-gray-500">{b.address || "No address"}{b.gstin ? ` · GSTIN ${b.gstin}` : ""}</div></div><button className="btn btn-sm" onClick={() => setF({ ...b })}>Edit</button></div>)}</div>
      {f && <div className="mt-3 border-t pt-3 space-y-3"><div className="grid sm:grid-cols-2 gap-3">
        <div><label className="label">Branch name *</label><input className="input" value={f.name} onChange={set("name")} /></div><div><label className="label">Address (shown on this branch&apos;s invoices)</label><input className="input" value={f.address ?? ""} onChange={set("address")} /></div>
        <div><label className="label">Mobile</label><input className="input" value={f.mobile ?? ""} onChange={set("mobile")} /></div><div><label className="label">GSTIN (if different)</label><input className="input" value={f.gstin ?? ""} onChange={set("gstin")} /></div></div>
        {f.id && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.active} onChange={set("active")} /> Active</label>}
        {msg && <div className="text-sm text-red-600">{msg}</div>}<div className="flex gap-2"><button className="btn-primary" onClick={save}>Save branch</button><button className="btn" onClick={() => setF(null)}>Cancel</button></div></div>}
    </Card>
  );
}

function LogoCard({ f, setF }: { f: any; setF: (v: any) => void }) {
  const [msg, setMsg] = useState("");
  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return; setMsg("");
    if (!/^image\/(png|jpeg)$/.test(file.type)) return setMsg("Please choose a PNG or JPG image");
    const rd = new FileReader();
    rd.onload = () => {
      const img = new Image();
      img.onload = () => {
        const sc = Math.min(1, 400 / Math.max(img.width, img.height)), c = document.createElement("canvas");
        c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc); c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
        let out = c.toDataURL("image/png"); if (out.length > 700000) out = c.toDataURL("image/jpeg", 0.85);
        if (out.length > 780000) return setMsg("Image is too large. Use a smaller logo.");
        setF({ ...f, logo: out }); setMsg("Logo selected. Click “Save all settings” to apply it.");
      };
      img.src = String(rd.result);
    };
    rd.readAsDataURL(file);
  }
  return (
    <Card title="Company logo">
      <div className="flex flex-wrap items-center gap-4">
        <div className="h-20 w-40 border rounded-xl flex items-center justify-center bg-gray-50 overflow-hidden">{f.logo ? <img src={f.logo} alt="Logo" className="max-h-full max-w-full object-contain" /> : <span className="text-xs text-gray-400">No logo</span>}</div>
        <div className="space-y-2"><input type="file" accept="image/png,image/jpeg" onChange={onFile} className="text-sm" />{f.logo && <div><button className="btn-danger btn-sm" onClick={() => setF({ ...f, logo: "" })}>Remove logo</button></div>}</div>
      </div>
      <p className="text-xs text-gray-500 mt-2">PNG or JPG. Shown in the menu, login page, invoice page and on every PDF (invoice, receipt, statement, challan). A transparent PNG works best.</p>
      {msg && <div className="text-sm text-blue-700 mt-2">{msg}</div>}
    </Card>
  );
}
