# Apple & Google Sign In — Console Setup

Code is shipped. The remaining work is **provider configuration in three consoles** (Apple Developer, Google Cloud, Supabase) plus EAS secrets. Nothing you can test without these.

All rough timings assume familiarity with each console.

---

## 1. Apple — Sign In with Apple (iOS only)

**Apple Developer portal** — https://developer.apple.com/account/

### a. Enable the capability on the App ID
1. Certificates, Identifiers & Profiles → Identifiers → your app (`com.cheezus.app`).
2. Tick **Sign In with Apple**. Save. Regenerate provisioning profiles (EAS handles this on next build).

### b. Create a Services ID (the "provider" Supabase uses)
1. Identifiers → (+) → **Services IDs** → Continue.
2. Description: `Cheezus Web Auth`. Identifier: `com.cheezus.app.web` (or any unique).
3. Enable **Sign In with Apple** → Configure:
   - Primary App ID: the app ID above.
   - Domains: `xkvjqhgnwqawpojjegtr.supabase.co`
   - Return URLs: `https://xkvjqhgnwqawpojjegtr.supabase.co/auth/v1/callback`
4. Save.

### c. Create an auth key
1. Keys → (+) → `Cheezus Sign In with Apple`. Enable Sign In with Apple. Configure → pick the App ID.
2. Download the `.p8` file. Note the **Key ID** and your **Team ID** (top-right of the portal).

### d. Wire to Supabase
Supabase Dashboard → Authentication → Providers → **Apple** → Enable.
- Services ID: `com.cheezus.app.web`
- Team ID: (from portal)
- Key ID: (from the key you just created)
- Private Key: paste the full contents of the `.p8`

That's it for Apple. The app will use `signInWithIdToken({ provider: 'apple' })` with the identity token returned by iOS — no additional client IDs needed.

---

## 2. Google — native Sign In

**Google Cloud Console** — https://console.cloud.google.com/

### a. Create/select a project
No API needs to be enabled — Google's identity OAuth flow is available out of the box. Just create or select a project.

### b. Configure the OAuth consent screen
Apps → OAuth consent screen. Set app name, support email, domain (`cheezus.co`). Scopes: `email`, `profile`, `openid`.

### c. Create three OAuth client IDs
Credentials → Create Credentials → OAuth client ID. You need **all three**:
1. **Web** — this is the one Supabase verifies with.
   - Authorized redirect URIs: `https://xkvjqhgnwqawpojjegtr.supabase.co/auth/v1/callback`
   - Copy the **Client ID** → this is `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.
2. **iOS**
   - Bundle ID: `com.cheezus.app`
   - Copy the **Client ID** → this is `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`.
   - Also note the **iOS URL scheme** shown in the detail page (looks like `com.googleusercontent.apps.1234567890-abc...`). That's `GOOGLE_IOS_URL_SCHEME`.
3. **Android**
   - Package name: `com.cheezus.app`
   - SHA-1 fingerprint of your upload/signing key. For EAS managed builds: `eas credentials` → pick Android → production → the SHA-1 is shown.
   - Android doesn't need a client ID in env vars; the SDK auto-resolves via the package+SHA-1 pair and exchanges with the web client ID.

### d. Wire to Supabase
Supabase Dashboard → Authentication → Providers → **Google** → Enable.
- Client ID: (Web client ID from #1)
- Client Secret: from the same Web client in Google Cloud.

### e. Set env vars / EAS secrets
```bash
# Local .env (for dev builds)
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...web-client-id...
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=...ios-client-id...
GOOGLE_IOS_URL_SCHEME=com.googleusercontent.apps.XXXXXX-...

# Production (EAS secrets)
eas secret:create --scope project --name EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID --value "..."
eas secret:create --scope project --name EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID --value "..."
eas secret:create --scope project --name GOOGLE_IOS_URL_SCHEME --value "com.googleusercontent.apps.XXXXXX-..."
```

The build picks them up automatically via `app.config.js`.

---

## 3. Test

1. `eas build --platform ios --profile production --auto-submit`
2. After TestFlight processes, open the app and tap **Sign in with Apple** or **Continue with Google** from the signup/login screens.
3. Check Supabase → Authentication → Users — the new user should appear with provider `apple` or `google`.

## What the app does

- **Apple** → `expo-apple-authentication` returns an `identityToken` → sent to Supabase via `signInWithIdToken({ provider: 'apple' })`. Display name persisted on first sign-in (Apple only gives it once).
- **Google** → `@react-native-google-signin/google-signin` returns an `idToken` → sent to Supabase via `signInWithIdToken({ provider: 'google' })`.
- Analytics: `oauth_start` → `oauth_success` / `oauth_failure` with `method=apple|google`, `step=login|signup`. `trackSignup` already takes `'apple'|'google'` as method.

## If Apple is required for App Store review

Apple's App Store policy requires **Sign In with Apple** if the app offers ANY third-party OAuth (Google counts). Ours does, so both buttons must ship together. iOS-only builds will show both; Android will show Google only (Apple button hidden automatically).
