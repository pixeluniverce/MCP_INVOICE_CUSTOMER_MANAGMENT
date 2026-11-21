"use client";
import { useEffect } from "react";
export default function PwaRegister() {
  useEffect(() => { if ("serviceWorker" in navigator && window.location.protocol !== "http:" || window.location.hostname === "localhost") navigator.serviceWorker?.register("/sw.js").catch(() => {}); }, []);
  return null;
}
