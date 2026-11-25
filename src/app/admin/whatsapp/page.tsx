"use client";
import { useEffect, useState } from "react";
import { api, useApi, State, Card, Table, Badge, Pager, fdt } from "@/components/ui";
export default function WhatsApp() {
  const [page, setPage] = useState(1), [status, setStatus] = useState(""), { data, err, loading, reload } = useApi<any>(`/api/whatsapp/messages?page=${page}&status=${status}`);
  async function retry(id: number) { try { await api(`/api/whatsapp/retry/${id}`, "POST"); } catch (e: any) { alert(e.message); } reload(); }
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">WhatsApp</h1>
      <DeviceCard />
      <h2 className="text-lg font-semibold">Message history</h2>
      <Card>
        <div className="mb-3 w-48"><label className="label">Status</label><select className="input" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="">All</option>{["PENDING", "SENT", "DELIVERED", "READ", "FAILED"].map(s => <option key={s}>{s}</option>)}</select></div>
        <p className="text-xs text-gray-500 mb-2">“Sent” means WhatsApp accepted the message. Delivered / Read appear only after WhatsApp confirms them through the webhook.</p>
        <State loading={loading && !data} err={err} />
        <Table head={["Customer", "Mobile", "Type", "Reference", "Date & time", "Status", "Sent by", ""]} empty={!loading && !data?.rows.length}>{(data?.rows || []).map((m: any) => <tr key={m.id}><td className="td">{m.customer_name}</td><td className="td">{m.mobile}</td><td className="td capitalize">{m.type}</td><td className="td">{m.ref_label || "-"}</td><td className="td">{fdt(m.created_at)}</td>
          <td className="td"><Badge s={m.status} />{m.error && <div className="text-xs text-red-600 max-w-xs truncate whitespace-normal" title={m.error}>{m.error}</div>}</td><td className="td">{m.sent_by_name}</td><td className="td">{m.status === "FAILED" && <button className="btn btn-sm" onClick={() => retry(m.id)}>Retry</button>}</td></tr>)}</Table>
        <Pager page={page} total={data?.total || 0} onPage={setPage} /></Card>
    </div>
  );
}

// Shows the linked-phone connection (QR code to scan, or "Connected"). Only appears in Linked phone mode.
function DeviceCard() {
  const { data, reload } = useApi<any>("/api/whatsapp/device");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data?.mode !== "device" || data.state === "open") return; const t = setInterval(reload, 4000); return () => clearInterval(t); }, [data?.mode, data?.state]);
  if (!data) return null;
  if (data.mode !== "device") return <Card title="Sending method"><p className="text-sm text-gray-600">Messages are sent with the official WhatsApp Business Cloud API. To send from your own linked phone instead, choose <b>Linked phone</b> in Settings → WhatsApp sending method.</p></Card>;
  async function logout() { if (!confirm("Unlink your phone from this app?")) return; setBusy(true); try { await api("/api/whatsapp/device", "POST", { action: "logout" }); } catch (e: any) { alert(e.message); } setBusy(false); reload(); }
  return (
    <Card title="Linked phone (WhatsApp Web style)" right={<button className="btn btn-sm" onClick={reload}>Refresh</button>}>
      {data.state === "open" && <div className="flex flex-wrap items-center gap-3"><Badge s="DELIVERED" /><span className="text-sm">Connected as <b>+{data.phone}</b>. Invoices, receipts, reminders, statements, challans and the catalog are sent from this number.</span><button className="btn-danger btn-sm" disabled={busy} onClick={logout}>Unlink phone</button></div>}
      {data.state === "qr" && data.qr && <div className="flex flex-wrap gap-6 items-center"><img src={data.qr} alt="QR" className="h-56 w-56 border rounded-xl bg-white p-2" /><ol className="text-sm text-gray-600 list-decimal pl-5 space-y-1"><li>Open WhatsApp on your phone</li><li>Go to <b>Settings → Linked devices</b></li><li>Tap <b>Link a device</b> and scan this code</li><li>This page updates by itself when connected</li></ol></div>}
      {(data.state === "connecting" || data.state === "starting" || data.state === "closed") && <div className="text-sm text-gray-600">Connecting… (status: {data.state}). If this stays for more than a minute, check that the linked-phone service is running.</div>}
      {data.state === "unreachable" && <div className="text-sm text-red-600">{data.error}</div>}
    </Card>
  );
}
