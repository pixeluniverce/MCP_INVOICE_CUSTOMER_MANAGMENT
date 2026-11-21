// Pure helpers shared by the server (root layout) and the browser (live preview in Settings).
export const DEFAULT_THEME = { primary: "#2563eb", sidebarBg: "#ffffff", sidebarText: "#374151", pageBg: "#f9fafb" };
export const okHex = (h: any) => typeof h === "string" && /^#[0-9a-fA-F]{6}$/.test(h);
export const rgbOf = (h: string): [number, number, number] => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const toHex = (r: number, g: number, b: number) => "#" + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
export const mixWhite = (h: string, t: number) => { const [r, g, b] = rgbOf(h); return toHex(r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t); };
export const darken = (h: string, t: number) => { const [r, g, b] = rgbOf(h); return toHex(r * (1 - t), g * (1 - t), b * (1 - t)); };
export const lum = (h: string) => { const [r, g, b] = rgbOf(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
export const onColor = (h: string) => (lum(h) > 0.65 ? "#111827" : "#ffffff");

export function themeVars(t: { primary?: string | null; sidebarBg?: string | null; sidebarText?: string | null; pageBg?: string | null }) {
  const p = okHex(t.primary) ? t.primary! : DEFAULT_THEME.primary, sb = okHex(t.sidebarBg) ? t.sidebarBg! : DEFAULT_THEME.sidebarBg;
  const st = okHex(t.sidebarText) ? t.sidebarText! : DEFAULT_THEME.sidebarText, pb = okHex(t.pageBg) ? t.pageBg! : DEFAULT_THEME.pageBg;
  const dark = lum(sb) < 0.5;
  return {
    "--primary": p, "--primary-dark": darken(p, 0.15), "--primary-light": mixWhite(p, 0.9), "--on-primary": onColor(p),
    "--sidebar-bg": sb, "--sidebar-text": st, "--sidebar-hover": dark ? "rgba(255,255,255,.10)" : "rgba(0,0,0,.05)", "--sidebar-border": dark ? "rgba(255,255,255,.12)" : "rgba(0,0,0,.08)",
    "--sidebar-active-bg": dark ? p : mixWhite(p, 0.9), "--sidebar-active-text": dark ? onColor(p) : p, "--page-bg": pb,
  } as Record<string, string>;
}
