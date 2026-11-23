import "./globals.css";
import type { Metadata, Viewport } from "next";
import PwaRegister from "@/components/PwaRegister";
import { q } from "@/lib/db";
import { themeVars, themeMode } from "@/lib/theme";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Mahadev Cement Product", description: "Billing & customer account management",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Mahadev", statusBarStyle: "default" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#2563eb" };
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let t: any = {};
  try { t = (await q("SELECT theme_primary,theme_sidebar_bg,theme_sidebar_text,theme_page_bg FROM company_settings WHERE id=1"))[0] || {}; } catch {}
  const vars = themeVars({ primary: t.theme_primary, sidebarBg: t.theme_sidebar_bg, sidebarText: t.theme_sidebar_text, pageBg: t.theme_page_bg });
  const css = ":root{" + Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(";") + "}";
  const mode = themeMode({ pageBg: t.theme_page_bg });
  return <html lang="en" data-mode={mode}><head><style dangerouslySetInnerHTML={{ __html: css }} /></head><body>{children}<PwaRegister /></body></html>;
}
