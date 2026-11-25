// Mahadev Cement Product - WhatsApp "Linked device" service (WhatsApp Web style).
// Runs 24/7 on its own server. The billing app (Vercel) calls it over HTTPS with a secret key.
// NOTE: this uses the unofficial WhatsApp Web protocol (Baileys). Use at your own risk - see README.
const fs = require("fs");
const express = require("express");
const QRCode = require("qrcode");
const pino = require("pino");
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");

const KEY = process.env.BRIDGE_KEY;
const APP_URL = (process.env.APP_URL || "").replace(/\/$/, "");
const AUTH_DIR = process.env.AUTH_DIR || "./auth";
const PORT = process.env.PORT || 3000;
if (!KEY || KEY.length < 12) { console.error("Set BRIDGE_KEY (12+ characters) in the environment."); process.exit(1); }

let sock = null, state = "starting", qr = null, phone = null, starting = false;

async function notify(id, status, error) {
  if (!APP_URL) return;
  try { await fetch(`${APP_URL}/api/whatsapp/device-events`, { method: "POST", headers: { "content-type": "application/json", "x-api-key": KEY }, body: JSON.stringify({ id, status, error }) }); } catch (e) { console.error("notify failed", e.message); }
}

async function start() {
  if (starting) return; starting = true;
  try {
    try { sock?.ev?.removeAllListeners(); sock?.end?.(); } catch {}
    const { state: auth, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();
    sock = makeWASocket({ version, auth, logger: pino({ level: "silent" }), printQRInTerminal: false, browser: ["Mahadev Billing", "Chrome", "1.0"], markOnlineOnConnect: false, syncFullHistory: false });
    sock.ev.on("creds.update", saveCreds);
    sock.ev.on("connection.update", async (u) => {
      const { connection, lastDisconnect, qr: q } = u;
      if (q) { qr = await QRCode.toDataURL(q, { margin: 1, width: 280 }); state = "qr"; }
      if (connection === "connecting" && state !== "qr") state = "connecting";
      if (connection === "open") { state = "open"; qr = null; phone = String(sock.user?.id || "").split(":")[0].split("@")[0]; console.log("WhatsApp linked:", phone); }
      if (connection === "close") {
        const code = lastDisconnect?.error?.output?.statusCode;
        state = "closed"; qr = null;
        if (code === DisconnectReason.loggedOut) { try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }); } catch {} phone = null; }
        starting = false; setTimeout(start, 3000);
      }
    });
    // delivery / read receipts for messages we sent
    sock.ev.on("messages.update", (updates) => {
      for (const u of updates) {
        const st = u.update?.status; if (!u.key?.fromMe || !st) continue;
        if (st === 3) notify(u.key.id, "DELIVERED"); else if (st === 4 || st === 5) notify(u.key.id, "READ");
      }
    });
  } catch (e) { console.error("start error", e); state = "closed"; setTimeout(start, 5000); }
  finally { starting = false; }
}

// one message at a time, 2-4 seconds apart (looks natural and lowers the risk of being blocked)
let queue = Promise.resolve();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const enqueue = (fn) => { const p = queue.then(fn); queue = p.catch(() => {}).then(() => sleep(2000 + Math.random() * 2000)); return p; };

const app = express();
app.use(express.json({ limit: "25mb" }));
app.get("/health", (_req, res) => res.json({ ok: true }));
app.use((req, res, next) => (req.headers["x-api-key"] === KEY ? next() : res.status(401).json({ error: "Invalid key" })));

app.get("/status", (_req, res) => res.json({ state, qr: state === "qr" ? qr : null, phone }));

app.post("/send", async (req, res) => {
  try {
    if (state !== "open" || !sock) return res.status(409).json({ error: "WhatsApp is not linked. Scan the QR code first." });
    const { to, filename, caption, pdf } = req.body || {};
    const digits = String(to || "").replace(/\D/g, "");
    if (digits.length < 10 || !pdf) return res.status(400).json({ error: "Invalid request" });
    const out = await enqueue(async () => {
      const [r] = await sock.onWhatsApp(digits);
      if (!r || !r.exists) { const e = new Error("This number is not on WhatsApp"); e.status = 400; throw e; }
      const m = await sock.sendMessage(r.jid, { document: Buffer.from(pdf, "base64"), mimetype: "application/pdf", fileName: filename || "document.pdf", caption: caption || "" });
      return m.key.id;
    });
    res.json({ id: out });
  } catch (e) { console.error("send error", e.message); res.status(e.status || 500).json({ error: e.message || "Send failed" }); }
});

app.post("/logout", async (_req, res) => {
  try { await sock?.logout(); } catch {}
  try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }); } catch {}
  phone = null; state = "closed"; qr = null; starting = false; setTimeout(start, 1500);
  res.json({ ok: true });
});

app.listen(PORT, () => console.log("WhatsApp bridge listening on", PORT));
start();
