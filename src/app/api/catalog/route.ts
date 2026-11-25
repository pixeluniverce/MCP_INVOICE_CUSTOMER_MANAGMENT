import { route, qs } from "@/lib/api";
import { getCatalog, getSettings } from "@/lib/data";

// Customers get their OWN prices; the customer id is taken from the login, never from the request.
export const GET = route(["admin", "customer"], async (req, { s }) => {
  const cid = s.role === "customer" ? s.customerId : Number(qs(req).get("customer_id")) || null;
  const co: any = await getSettings();
  const showPrices = s.role === "admin" || co.catalog_show_prices !== false;
  const rows = await getCatalog(cid ? { cid } : { listId: null });
  return { show_prices: showPrices, rows: rows.map((r: any) => ({ ...r, price: showPrices ? r.price : null, price_source: s.role === "admin" ? r.price_source : undefined })) };
});
