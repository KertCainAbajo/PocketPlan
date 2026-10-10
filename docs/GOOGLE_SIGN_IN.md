# Google sign-in setup

PocketPlan uses **browser-based** Google sign-in. It works in **Expo Go** and in installed builds, on Android and iPhone, with no native Google SDK and no development build.

## How it works

1. The app opens `GET /api/v1/auth/google/redirect` in a secure browser sheet.
2. The backend sends the browser to Google, where the student picks an account.
3. Google posts the signed ID token to `POST /api/v1/auth/google/callback`. The backend verifies it (audience, issuer, expiry, verified email, nonce), then signs the student in or creates the account.
4. The browser is sent back to the app with a **one-time code**, valid for 2 minutes and usable once. The app trades it for its API token at `POST /api/v1/auth/google/exchange`. The API token never appears in a URL.

Google only returns the browser to **HTTPS** addresses (or `localhost`), so during local development the backend is exposed through a free Cloudflare tunnel.

## One-time Google Cloud setup

In <https://console.cloud.google.com/> → APIs & Services:

1. **OAuth consent screen**: add your Gmail (and testers) under **Test users** while the app is in "Testing".
2. **Credentials → your Web application client**:
   - Under **Authorized redirect URIs**, add `https://<your-tunnel>.trycloudflare.com/api/v1/auth/google/callback`.
   - Copy the **Client ID** into `backend/.env` as `GOOGLE_CLIENT_IDS`.

The Android OAuth client and SHA-1 are not needed for this method.

## Every development session

```powershell
# 1. Backend
cd D:\PocketPlan\PocketPlan\backend
php artisan serve --host=0.0.0.0 --port=8000

# 2. Tunnel (new terminal); it prints https://<random-words>.trycloudflare.com
& "$env:LOCALAPPDATA\cloudflared\cloudflared.exe" tunnel --url http://localhost:8000

# 3. App (new terminal)
cd D:\PocketPlan\PocketPlan\mobile
npx expo start
```

**The quick-tunnel address changes every time you restart cloudflared.** When it changes, update two places:

- `GOOGLE_REDIRECT_URI` in `backend/.env`, set to `https://<new-address>/api/v1/auth/google/callback`
- the **Authorized redirect URI** in Google Cloud. Google can take a few minutes to apply it.

To avoid updating these every session, use a free fixed address instead. A free ngrok static domain or a named Cloudflare tunnel both work. In production, the backend's real HTTPS domain replaces the tunnel entirely.

## Configuration reference

| `backend/.env` | Example |
|---|---|
| `GOOGLE_CLIENT_IDS` | `1234567890-abc.apps.googleusercontent.com` (Web client) |
| `GOOGLE_REDIRECT_URI` | `https://approaches-pace-define-anne.trycloudflare.com/api/v1/auth/google/callback` |

The mobile app needs no Google settings. It only talks to `EXPO_PUBLIC_API_URL`.

## Account rules

| Situation | Result |
|---|---|
| The Google account has signed in before | Signs in to the same PocketPlan account |
| The email already has a PocketPlan account | Google is linked to it. Email and password still work |
| A new email | A new student account is created. The button shows the Terms notice, and acceptance is recorded |
| An admin email, or a deactivated account | The browser returns to the app with an error |
| The app links that may receive codes | `pocketplan://`, plus Expo Go's `exp://` outside production |
