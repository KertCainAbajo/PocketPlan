# Deploying PocketPlan for free

Everything below uses free plans — no credit card.

| Part | Service | Free plan |
|---|---|---|
| API (Laravel) | [Render](https://render.com) | Free web service. Sleeps after ~15 min idle; the first request then takes up to a minute (the app waits for it). |
| Database (MySQL) | [Aiven](https://aiven.io) | Free MySQL, 1 GB, no time limit. |
| Email (sign-in codes) | [Brevo](https://www.brevo.com) | 300 emails/day over HTTPS (Render's free plan blocks SMTP, so Gmail SMTP can't be used there). |
| Android app | [Expo EAS Build](https://expo.dev) | Free cloud builds; produces an installable `.apk`. |

## 1. Database — Aiven

1. Sign up at aiven.io → **Create service** → **MySQL** → **Free plan**.
2. When it's running, open **Connection information** and keep the tab open. You need: **Host**, **Port**, **Password**, and the **CA certificate** (click *Show* and copy all of it, including the `-----BEGIN/END CERTIFICATE-----` lines).

## 2. Email — Brevo

1. Sign up at brevo.com.
2. **Senders, domains & dedicated IPs → Senders → Add a sender**: use your Gmail address and confirm the email Brevo sends you.
3. **SMTP & API → API keys → Generate a new API key**. Copy it (starts with `xkeysib-`).

## 3. API — Render

1. Push this repository to GitHub (already at `KertCainAbajo/PocketPlan`).
2. Sign up at render.com with GitHub → **New → Blueprint** → choose the PocketPlan repo. Render reads `render.yaml`.
3. Fill in the values it asks for:

   | Setting | Value |
   |---|---|
   | `APP_KEY` | Run `php artisan key:generate --show` in `backend/` and paste the output |
   | `APP_URL` | `https://pocketplan-api.onrender.com` (use the URL Render shows if different) |
   | `DB_HOST`, `DB_PORT`, `DB_PASSWORD` | From Aiven |
   | `DB_SSL_CA_PEM` | The whole Aiven CA certificate |
   | `BREVO_API_KEY` | From Brevo |
   | `MAIL_FROM_ADDRESS` | The sender address you verified in Brevo |
   | `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Your admin web-panel login |

4. Deploy. When it's live, `https://<your-service>.onrender.com/up` shows a green page. The database tables, default categories and admin account are created automatically on start.

## 4. Android app — EAS Build

1. If your Render URL is not `https://pocketplan-api.onrender.com`, change `EXPO_PUBLIC_API_URL` in `mobile/eas.json`.
2. In `mobile/`:

   ```bash
   npx eas-cli build --platform android --profile preview
   ```

3. When it finishes (about 10–20 min), Expo gives you a download link and QR code for the `.apk`. Put that link on your portfolio.

On a phone: open the link → download → allow "Install unknown apps" for the browser → install.

## Notes

- **Recurring allowances** run while the API is awake. On the free plan the server sleeps when idle, so they catch up the next time someone opens the app.
- **Updating:** push to GitHub and Render redeploys the API automatically. Rebuild the APK only when the mobile code changes.
