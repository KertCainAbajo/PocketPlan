# Google sign-in setup

PocketPlan's "Continue with Google" button is fully built:

- **Backend:** `POST /api/v1/auth/google`, which verifies the token with Google, then creates the account or links it to an existing one.
- **Mobile:** the button and the sign-in flow.

It needs two things that only you can provide:

1. **OAuth client IDs** from Google Cloud Console.
2. **A development build** of the app. Google sign-in uses native code, so it **never works inside Expo Go**. In Expo Go the button explains this instead of failing.

## 1. Create the Google Cloud credentials

1. Go to <https://console.cloud.google.com/> and create a project, for example *PocketPlan*.
2. Open **APIs & Services → OAuth consent screen**:
   - Choose **External** and fill in the app name, support email and developer email.
   - Under **Test users**, add the Google accounts you will test with while the app is in "Testing".
3. Open **APIs & Services → Credentials → Create credentials → OAuth client ID** and create **two** clients:

   | Type | Settings | What it's for |
   |---|---|---|
   | **Web application** | No settings needed | Its client ID is the *webClientId*. The backend accepts tokens issued for it |
   | **Android** | Package name `ph.pocketplan.app`, plus the SHA-1 from step 2 | Lets the Android app request Google tokens |

   Add an **iOS** client later only if you build for iPhone.

## 2. Get the Android SHA-1 fingerprint

Generate the native project once (from `mobile/`):

```powershell
npx expo prebuild --platform android
```

Then print the debug keystore's fingerprint:

```powershell
& "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -list -v -keystore android\app\debug.keystore -alias androiddebugkey -storepass android -keypass android
```

Copy the **SHA1** line into the Android OAuth client. A release or Play Store build has a different SHA-1; add that too when you publish.

## 3. Configure PocketPlan

**`backend/.env`**: the backend accepts ID tokens whose audience is this web client ID.

```
GOOGLE_CLIENT_IDS=1234567890-abc123.apps.googleusercontent.com
```

**`mobile/.env`**: use the same web client ID, not the Android one.

```
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=1234567890-abc123.apps.googleusercontent.com
```

## 4. Build and run the development build

From `mobile/`, with the emulator running:

```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
npx expo run:android
```

This compiles PocketPlan with its native modules and installs it on the emulator as its own app, with its own icon, instead of running inside Expo Go. The first build takes several minutes. Afterwards, `npx expo start` reloads JavaScript changes into it as usual.

## iOS (later)

Create an **iOS** OAuth client with the bundle ID `ph.pocketplan.app`. Then add the plugin to `mobile/app.json`, using the iOS client's *reversed client ID*:

```json
["@react-native-google-signin/google-signin", { "iosUrlScheme": "com.googleusercontent.apps.YOUR-IOS-CLIENT-ID" }]
```

## How accounts are matched

| Situation | Result |
|---|---|
| The Google account has signed in before | Signs in to the same PocketPlan account |
| The email already has a PocketPlan account | Google is linked to it. Email and password still work |
| A new email | A new student account is created. The button shows the Terms notice, and acceptance is recorded |
| The email belongs to an admin, or the account is deactivated | Rejected |
| No `GOOGLE_CLIENT_IDS` on the server | `503`, with the message "Google sign-in is not configured on this server." |
