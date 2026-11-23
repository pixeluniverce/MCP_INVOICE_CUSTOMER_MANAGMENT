import { q } from "@/lib/db";
import { route, body, num, log, HttpError } from "@/lib/api";
import { publicSettings } from "@/lib/data";

export const GET = route(["admin"], async () => publicSettings());

const TEXT = ["name", "address", "mobile", "email", "gstin", "state", "state_code", "invoice_prefix", "payment_terms", "wa_phone", "wa_phone_id", "wa_waba_id", "wa_api_version", "wa_template_name", "wa_template_lang", "signature_label", "bank_name", "bank_account_name", "bank_account_no", "bank_ifsc", "bank_branch", "bank_upi"];
const SECRET = ["wa_token", "wa_verify_token", "wa_app_secret"]; // only overwritten when a new value is typed

export const PUT = route(["admin"], async (req, { s }) => {
  const b = await body(req); const sets: string[] = [], a: any[] = [];
  const add = (k: string, v: any) => { a.push(v); sets.push(`${k}=$${a.length}`); };
  for (const k of TEXT) if (k in b) add(k, String(b[k] ?? "").trim() || null);
  for (const k of SECRET) if (typeof b[k] === "string" && b[k].trim()) add(k, b[k].trim());
  if ("logo" in b) {
    if (!b.logo) add("logo", null);
    else if (typeof b.logo === "string" && b.logo.length <= 800000 && /^data:image\/(png|jpeg);base64,[A-Za-z0-9+\/=]+$/.test(b.logo)) add("logo", b.logo);
    else throw new HttpError(400, "Logo must be a PNG or JPG image under 600 KB");
  }
  for (const k of ["theme_primary", "theme_sidebar_bg", "theme_sidebar_text", "theme_page_bg", "inv_color"]) if (k in b) {
    if (b[k] && !/^#[0-9a-fA-F]{6}$/.test(b[k])) throw new HttpError(400, "Invalid colour value");
    add(k, b[k] || null);
  }
  for (const k of ["inv_show_logo", "inv_show_signature"]) if (k in b) add(k, !!b[k]);
  if ("signature" in b) {
    if (!b.signature) add("signature", null);
    else if (typeof b.signature === "string" && b.signature.length <= 800000 && /^data:image\/(png|jpeg);base64,[A-Za-z0-9+\/=]+$/.test(b.signature)) add("signature", b.signature);
    else throw new HttpError(400, "Signature must be a PNG or JPG image under 600 KB");
  }
  if ("gst_enabled" in b) add("gst_enabled", !!b.gst_enabled);
  if (["CGST_SGST", "IGST"].includes(b.gst_type)) add("gst_type", b.gst_type);
  for (const k of ["cgst", "sgst", "igst"]) if (k in b) add(k, Math.min(100, Math.max(0, num(b[k]))));
  if ("next_invoice" in b && num(b.next_invoice) >= 1) add("next_invoice", Math.floor(num(b.next_invoice)));
  if (sets.length) await q(`UPDATE company_settings SET ${sets.join(",")} WHERE id=1`, a);
  await log(s.uid, "SETTINGS_UPDATED"); return { ok: true };
});
