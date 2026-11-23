// Pure helpers shared by the server (root layout) and the browser (live preview / theme picker).
export type Theme = { primary: string; sidebarBg: string; sidebarText: string; pageBg: string };
export const DEFAULT_THEME: Theme = { primary: "#2563eb", sidebarBg: "#ffffff", sidebarText: "#374151", pageBg: "#f9fafb" };

export const POPULAR: [string, Theme][] = [
  ["Classic Blue", DEFAULT_THEME],
  ["Emerald", { primary: "#059669", sidebarBg: "#ffffff", sidebarText: "#374151", pageBg: "#f6fdf9" }],
  ["Sunset Orange", { primary: "#ea580c", sidebarBg: "#ffffff", sidebarText: "#374151", pageBg: "#fffaf5" }],
  ["Royal Purple", { primary: "#7c3aed", sidebarBg: "#ffffff", sidebarText: "#374151", pageBg: "#faf8ff" }],
  ["Ruby Red", { primary: "#dc2626", sidebarBg: "#ffffff", sidebarText: "#374151", pageBg: "#fffafa" }],
  ["Ocean Teal", { primary: "#0d9488", sidebarBg: "#ffffff", sidebarText: "#374151", pageBg: "#f7fffd" }],
  ["Rose Pink", { primary: "#e11d48", sidebarBg: "#ffffff", sidebarText: "#374151", pageBg: "#fff7f9" }],
  ["Slate Mono", { primary: "#334155", sidebarBg: "#ffffff", sidebarText: "#334155", pageBg: "#f8fafc" }],
  ["Midnight Navy", { primary: "#2563eb", sidebarBg: "#0f172a", sidebarText: "#e2e8f0", pageBg: "#f1f5f9" }],
  ["Indigo Night", { primary: "#6366f1", sidebarBg: "#1e1b4b", sidebarText: "#e0e7ff", pageBg: "#f5f5ff" }],
  ["Forest", { primary: "#16a34a", sidebarBg: "#14532d", sidebarText: "#dcfce7", pageBg: "#f0fdf4" }],
  ["Charcoal & Gold", { primary: "#d97706", sidebarBg: "#1f2937", sidebarText: "#f3f4f6", pageBg: "#f9fafb" }],
  ["Dark Mode", { primary: "#3b82f6", sidebarBg: "#111827", sidebarText: "#cbd5e1", pageBg: "#0b1220" }],
  ["Dark Emerald", { primary: "#10b981", sidebarBg: "#06201a", sidebarText: "#a7f3d0", pageBg: "#07120e" }],
  ["Dark Amber", { primary: "#f59e0b", sidebarBg: "#1c1917", sidebarText: "#e7e5e4", pageBg: "#12100e" }],
];

export const okHex = (h: any) => typeof h === "string" && /^#[0-9a-fA-F]{6}$/.test(h);
export const rgbOf = (h: string): [number, number, number] => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const toHex = (r: number, g: number, b: number) => "#" + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
export const mixHex = (a: string, b: string, t: number) => { const [r1, g1, b1] = rgbOf(a), [r2, g2, b2] = rgbOf(b); return toHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t); };
export const mixWhite = (h: string, t: number) => mixHex(h, "#ffffff", t);
export const darken = (h: string, t: number) => mixHex(h, "#000000", t);
export const lum = (h: string) => { const [r, g, b] = rgbOf(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
export const onColor = (h: string) => (lum(h) > 0.65 ? "#111827" : "#ffffff");
export const isDarkPage = (pb?: string | null) => okHex(pb) && lum(pb!) < 0.35;

export function themeVars(t: { primary?: string | null; sidebarBg?: string | null; sidebarText?: string | null; pageBg?: string | null }) {
  const p = okHex(t.primary) ? t.primary! : DEFAULT_THEME.primary, sb = okHex(t.sidebarBg) ? t.sidebarBg! : DEFAULT_THEME.sidebarBg;
  const st = okHex(t.sidebarText) ? t.sidebarText! : DEFAULT_THEME.sidebarText, pb = okHex(t.pageBg) ? t.pageBg! : DEFAULT_THEME.pageBg;
  const dark = lum(pb) < 0.35, sdark = lum(sb) < 0.5, surface = dark ? mixWhite(pb, 0.06) : "#ffffff";
  return {
    "--primary": p, "--primary-dark": darken(p, 0.15), "--primary-light": dark ? mixHex(pb, p, 0.25) : mixWhite(p, 0.9), "--on-primary": onColor(p),
    "--sidebar-bg": sb, "--sidebar-text": st, "--sidebar-hover": sdark ? "rgba(255,255,255,.10)" : "rgba(0,0,0,.05)", "--sidebar-border": sdark ? "rgba(255,255,255,.12)" : "rgba(0,0,0,.08)",
    "--sidebar-active-bg": sdark ? p : mixWhite(p, 0.9), "--sidebar-active-text": sdark ? onColor(p) : p,
    "--page-bg": pb, "--surface": surface, "--line": dark ? mixWhite(pb, 0.16) : "#e5e7eb", "--header-bg": dark ? surface + "E6" : "rgba(255,255,255,.9)",
  } as Record<string, string>;
}
export const themeMode = (t: { pageBg?: string | null }) => (isDarkPage(t.pageBg) ? "dark" : "light");

// browser only: apply a theme instantly (live preview)
export function applyThemeToDom(t: Theme) {
  Object.entries(themeVars(t)).forEach(([k, v]) => document.documentElement.style.setProperty(k, v));
  document.documentElement.setAttribute("data-mode", themeMode(t));
}
