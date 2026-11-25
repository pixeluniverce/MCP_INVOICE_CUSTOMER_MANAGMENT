# WhatsApp Linked-Device Service (optional)

This small service lets the billing app send PDFs from **your own WhatsApp number**,
the same way WhatsApp Web works: you scan a QR code once (WhatsApp > Linked devices > Link a device).

## Important – read first
* It uses the **unofficial** WhatsApp Web protocol. It is **not** approved by WhatsApp/Meta and can
  break when WhatsApp changes, and the number **can be restricted or banned**. Use a number you can afford to risk,
  send only to customers who expect your messages, and do not send bulk/marketing messages.
* It must run **24 hours a day on its own server** with a **persistent disk** (it keeps the login session).
  It cannot run on Vercel. Free hosts that go to sleep will disconnect.
* Keep `BRIDGE_KEY` secret. Anyone with it can send WhatsApp messages from your number.

## Run it (Railway / Render / any VPS)
Environment variables:
| Name | Value |
|---|---|
| `BRIDGE_KEY` | a long random secret (12+ characters). You will paste the same value in the billing app |
| `APP_URL` | your Vercel URL, e.g. `https://yourapp.vercel.app` (used to report Delivered / Read) |
| `AUTH_DIR` | folder on a persistent disk, e.g. `/data/auth` (Docker image already uses this) |
| `PORT` | optional, default 3000 |

**Docker / Railway / Render:** deploy this folder with the included `Dockerfile` and mount a persistent volume at `/data`.

**Plain VPS (Ubuntu):**
```
sudo apt install -y git
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs
cd whatsapp-bridge && npm install
BRIDGE_KEY=your-secret APP_URL=https://yourapp.vercel.app node server.js
```
(use `pm2 start server.js` to keep it running). Put it behind HTTPS (e.g. Caddy) so the key is encrypted.

## Connect
1. In the billing app: **Settings > WhatsApp sending method > Linked phone**, enter the service URL and `BRIDGE_KEY`, Save.
2. Open **WhatsApp** page in the admin. A QR code appears.
3. On your phone: WhatsApp > Settings > Linked devices > Link a device > scan the QR.
4. Status turns **Connected**. Invoices, receipts, reminders, statements, challans and the catalog now go from your number.
