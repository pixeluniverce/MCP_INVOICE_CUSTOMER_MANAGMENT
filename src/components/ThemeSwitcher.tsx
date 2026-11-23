"use client";
import { useEffect, useRef, useState } from "react";
import { POPULAR, DEFAULT_THEME, Theme, applyThemeToDom } from "@/lib/theme";

const toBody = (t: Theme) => ({ theme_primary: t.primary, theme_sidebar_bg: t.sidebarBg, theme_sidebar_text: t.sidebarText, theme_page_bg: t.pageBg });

// Quick theme picker in the top bar (admin). Popular themes save immediately; custom colours save with the Save button.
export default function ThemeSwitcher() {
  const [open, setOpen] = useState(false), [cur, setCur] = useState<Theme>(DEFAULT_THEME), [msg, setMsg] = useState(""), ref = useRef<HTMLDivElement>(null), loaded = useRef(false);
  useEffect(() => { const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);
  useEffect(() => {
    if (!open || loaded.current) return; loaded.current = true;
    fetch("/api/settings").then(r => r.json()).then(s => setCur({ primary: s.theme_primary || DEFAULT_THEME.primary, sidebarBg: s.theme_sidebar_bg || DEFAULT_THEME.sidebarBg, sidebarText: s.theme_sidebar_text || DEFAULT_THEME.sidebarText, pageBg: s.theme_page_bg || DEFAULT_THEME.pageBg })).catch(() => {});
  }, [open]);
  async function save(t: Theme) {
    setMsg("Saving…");
    const r = await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(toBody(t)) });
    setMsg(r.ok ? "Theme saved for everyone" : "Could not save theme");
  }
  function pick(t: Theme) { setCur(t); applyThemeToDom(t); save(t); }
  function custom(k: keyof Theme, v: string) { const t = { ...cur, [k]: v }; setCur(t); applyThemeToDom(t); setMsg(""); }
  const C = (k: keyof Theme, label: string) => <div><label className="label">{label}</label><input type="color" className="h-9 w-full rounded-lg border cursor-pointer" value={cur[k]} onChange={e => custom(k, e.target.value)} /></div>;
  return (
    <div className="relative" ref={ref}>
      <button className="btn" onClick={() => setOpen(!open)} aria-label="Theme">🎨<span className="hidden sm:inline">Theme</span></button>
      {open && <div className="absolute right-0 mt-2 w-[min(92vw,24rem)] card shadow-xl z-40 max-h-[80vh] overflow-y-auto">
        <div className="font-semibold mb-2">Popular themes</div>
        <div className="grid grid-cols-2 gap-2">{POPULAR.map(([n, t]) => (
          <button key={n} className="btn !justify-start !px-2 text-xs" onClick={() => pick(t)}>
            <span className="inline-block w-4 h-4 rounded-full border" style={{ background: t.primary }} /><span className="inline-block w-4 h-4 rounded border" style={{ background: t.sidebarBg }} /><span className="inline-block w-4 h-4 rounded border" style={{ background: t.pageBg }} />{n}
          </button>))}</div>
        <div className="font-semibold mt-4 mb-2">Custom colours</div>
        <div className="grid grid-cols-2 gap-2">{C("primary", "Buttons & highlights")}{C("sidebarBg", "Menu background")}{C("sidebarText", "Menu text")}{C("pageBg", "Page background")}</div>
        <div className="flex items-center gap-2 mt-3"><button className="btn-primary btn-sm" onClick={() => save(cur)}>Save custom theme</button><button className="btn btn-sm" onClick={() => pick(DEFAULT_THEME)}>Reset</button></div>
        {msg && <div className="text-xs text-primary mt-2">{msg}</div>}
        <div className="text-[11px] text-gray-500 mt-2">The theme applies to the admin side and the customer portal. A dark page background switches the whole app to dark mode.</div>
      </div>}
    </div>
  );
}
