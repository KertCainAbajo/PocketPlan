# Google sign-in setup

PocketPlan uses browser-based Google sign-in. It works in Expo Go and installed builds on Android and iPhone, without a native Google SDK.

## How it works

1. The app opens `GET /api/v1/auth/google/redirect` in a secure browser sheet.
2. The backend redirects to Google.
3. Google posts a signed ID token to `POST /api/v1/auth/google/callback`. The backend verifies it and signs in an existing user or creates a student account.
4. The browser returns to the app with a one-time code. The app exchanges it for its API token.

The Google callback is configured by `GOOGLE_REDIRECT_URI` in `backend/.env`. Google requires that exact URL to be registered on the same OAuth Web application client whose ID is in `GOOGLE_CLIENT_IDS`.

## Android emulator

For emulator development, `npm run emulator` sets up `adb reverse tcp:8000`, which makes the backend on the PC available at the emulator's `localhost:8000`.

Set this in `backend/.env`:

```dotenv
GOOGLE_CLIENT_IDS=<Web application client ID>
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/auth/google/callback
```

In Google Cloud Console, open APIs & Services > Credentials > the matching OAuth Web application client. Add this exact value under **Authorized redirect URIs**:

```text
http://localhost:8000/api/v1/auth/google/callback
```

The URI must match exactly, including scheme, host, port, and path. If the Google consent screen is in Testing, add the signing-in Google account under **Test users**. The app reads no Google client ID from `mobile/.env`; it comes from the backend setting above. Android OAuth client IDs and SHA-1 fingerprints are not used by this browser flow.

Start the backend and emulator setup:

```powershell
cd D:\PocketPlan\PocketPlan\backend
php artisan serve --host=0.0.0.0 --port=8000

# In another terminal
cd D:\PocketPlan\PocketPlan\mobile
npm run emulator
```

## Physical phone or public deployment

A physical phone cannot reach the development PC through `localhost`. Expose the backend at a public HTTPS address, then set both `GOOGLE_REDIRECT_URI` and the mobile app's `EXPO_PUBLIC_API_URL` to that backend. Add the exact callback URL to the same OAuth Web client in Google Cloud.

For example, if the backend's public address is `https://api.example.com`:

```dotenv
# backend/.env
GOOGLE_REDIRECT_URI=https://api.example.com/api/v1/auth/google/callback

# mobile/.env
EXPO_PUBLIC_API_URL=https://api.example.com/api/v1
```

With a temporary Cloudflare quick tunnel, its address changes after a restart. Update both environment values and the authorized redirect URI each time it changes. A stable tunnel address avoids that step. Production uses the backend's HTTPS domain.

## Account behavior

| Situation | Result |
|---|---|
| Previously used Google account | Signs in to the same PocketPlan account |
| Existing PocketPlan email | Links the verified Google account; password sign-in remains available |
| New email | Creates a student account and records acceptance of the terms |
| Admin or deactivated account | Returns an error to the app |
