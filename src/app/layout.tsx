import "./globals.css";
import type { Metadata, Viewport } from "next";
import PwaRegister from "@/components/PwaRegister";
export const metadata: Metadata = {
  title: "Mahadev Cement Product", description: "Billing & customer account management",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Mahadev", statusBarStyle: "default" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#2563eb" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}<PwaRegister /></body></html>;
}
