import { tx } from "@/lib/db";
import { route, body, num, isDate, HttpError, log } from "@/lib/api";
import { getInvoice, publicSettings } from "@/lib/data";
import { calcInvoice } from "@/lib/calc";

export const GET = route(["admin", "customer"], async (_r, { s, params }) => {
  const d = await getInvoice(Number(params.id), s.role === "customer" ? s.customerId : null);
  const { name, address, mobile, email, gstin, state, state_code, payment_terms } = (await publicSettings()) as any;
  return { ...d, company: { name, address, mobile, email, gstin, state, state_code, payment_terms } };
});

// Edit a saved invoice. The previous version is stored in invoice_revisions (audit history).
export const PUT = route(["admin"], async (req, { s, params }) => {
  const b = await body(req); const id = Number(params.id);
  if (String(b.reason || "").trim().length < 3) throw new HttpError(400, "Enter a reason for this edit");
  if (!isDate(b.date)) throw new HttpError(400, "Invoice date is required");
  if (b.due_date && !isDate(b.due_date)) throw new HttpError(400, "Invalid due date");
  const calc = calcInvoice({ gst_enabled: !!b.gst_enabled, gst_type: b.gst_type, cgst: num(b.cgst), sgst: num(b.sgst), igst: num(b.igst), other_charges: num(b.other_charges), less_amount: num(b.less_amount), items: b.items });
  return await tx(async (c) => {
    const cur = (await c.query("SELECT * FROM invoices WHERE id=$1 AND status='ACTIVE' FOR UPDATE", [id])).rows[0];
    if (!cur) throw new HttpError(404, "Invoice not found");
    const paid = Number((await c.query(`SELECT COALESCE(SUM(pa.amount),0) v FROM payment_allocations pa JOIN payments p ON p.id=pa.payment_id AND p.status='ACTIVE' WHERE pa.invoice_id=$1`, [id])).rows[0].v);
    if (calc.grand_total < paid - 0.004) throw new HttpError(400, `₹${paid} is already paid on this invoice, so the new total (₹${calc.grand_total}) cannot be lower. Reverse or reduce the payment first.`);
    const br = (await c.query("SELECT * FROM branches WHERE id=$1 AND active", [Number(b.branch_id)])).rows[0];
    if (!br) throw new HttpError(400, "Select a branch");
    const co = (await c.query("SELECT state FROM company_settings WHERE id=1")).rows[0];
    if (b.gst_enabled && co?.state && b.place_of_supply && !b.override_tax_type) {
      const same = co.state.trim().toLowerCase() === String(b.place_of_supply).trim().toLowerCase();
      if (same && calc.gst_type === "IGST") throw new HttpError(409, `Place of supply (${b.place_of_supply}) is the same state as the company (${co.state}). Intra-state sales normally use CGST + SGST. Continue with IGST anyway?`, "TAX_TYPE");
      if (!same && calc.gst_type === "CGST_SGST") throw new HttpError(409, `Place of supply (${b.place_of_supply}) differs from company state (${co.state}). Inter-state sales normally use IGST. Continue with CGST + SGST anyway?`, "TAX_TYPE");
    }
    const old = (await c.query("SELECT * FROM invoice_items WHERE invoice_id=$1 ORDER BY id", [id])).rows;
    await c.query("INSERT INTO invoice_revisions(invoice_id,edited_by,reason,snapshot,before_total,after_total) VALUES($1,$2,$3,$4,$5,$6)", [id, s.uid, b.reason.trim(), JSON.stringify({ invoice: cur, items: old }), cur.grand_total, calc.grand_total]);
    await c.query(`UPDATE invoices SET date=$1,due_date=$2,place_of_supply=$3,gst_enabled=$4,gst_type=$5,subtotal=$6,discount_total=$7,taxable_total=$8,cgst_total=$9,sgst_total=$10,igst_total=$11,
      other_charges=$12,other_label=$13,grand_total=$14,notes=$15,branch_id=$16,branch_snapshot=$17,gross_total=$18,less_amount=$19,less_label=$20 WHERE id=$21`,
      [b.date, b.due_date || null, b.place_of_supply || null, !!b.gst_enabled, calc.gst_type, calc.subtotal, calc.discount_total, calc.taxable_total, calc.cgst_total, calc.sgst_total, calc.igst_total,
       calc.other_charges, b.other_label || null, calc.grand_total, b.notes || null, br.id, JSON.stringify({ name: br.name, address: br.address, mobile: br.mobile, gstin: br.gstin }), calc.gross_total, calc.less_amount, b.less_label || null, id]);
    await c.query("DELETE FROM invoice_items WHERE invoice_id=$1", [id]);
    for (const it of calc.items)
      await c.query(`INSERT INTO invoice_items(invoice_id,name,description,hsn,qty,unit,rate,discount,amount,taxable,cgst_rate,sgst_rate,igst_rate,cgst_amt,sgst_amt,igst_amt) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
        [id, it.name, it.description, it.hsn, it.qty, it.unit, it.rate, it.discount, it.amount, it.taxable, it.cgst_rate, it.sgst_rate, it.igst_rate, it.cgst_amt, it.sgst_amt, it.igst_amt]);
    if (b.save_prices) for (const it of b.items) if (it.product_id && Number(it.rate) >= 0)
      await c.query("INSERT INTO customer_prices(customer_id,product_id,rate) VALUES($1,$2,$3) ON CONFLICT (customer_id,product_id) DO UPDATE SET rate=EXCLUDED.rate, updated_at=now()", [cur.customer_id, Number(it.product_id), Number(it.rate)]);
    await c.query("INSERT INTO activity_logs(user_id,action,details) VALUES($1,'INVOICE_EDITED',$2)", [s.uid, `${cur.number}: ${b.reason.trim()}`]);
    return { id, number: cur.number };
  });
});
