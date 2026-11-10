# Release Guide — APK, Play Store and App Store

## 1. One-time setup

```bash
npm install -g eas-cli
eas login
```

Tell EAS where the backend lives. Release builds **refuse to build** while this is unset or
points at localhost (see `app.config.js`):

```bash
eas env:create --environment production --name EXPO_PUBLIC_API_URL --value https://YOUR-SERVER/api
eas env:create --environment preview    --name EXPO_PUBLIC_API_URL --value https://YOUR-STAGING-SERVER/api
```

Use `https://`. An `http://` URL still builds (cleartext is switched on automatically, with a
warning) but sends passwords and attendance data unencrypted — acceptable only on a trusted LAN.

The committed `.env` is for local development only (`expo start`).

## 2. Build

| Goal | Command | Output |
|---|---|---|
| APK to hand to staff / sideload | `npm run build:apk` | `.apk`, ARM only, minified |
| Play Store | `npm run build:android` | `.aab` |
| App Store / TestFlight | `npm run build:ios` | `.ipa` |
| Internal test APK | `npm run build:preview` | `.apk` |

Version numbers: the user-facing version is `expo.version` in `app.json`. The Android
`versionCode` and iOS `buildNumber` are managed by EAS (`appVersionSource: remote`) and increase
automatically on every production build. If a build was already uploaded to a store with a higher
number, sync once with `eas build:version:set`.

## 3. What release builds do differently

- **R8 minification + resource shrinking** (Android) — smaller, faster-loading app.
- **ARM-only native libraries** — x86 emulator ABIs are dropped from release APKs.
- **`console.log` stripped** from the JS bundle (`warn`/`error` kept).
- **Only used icons are bundled** (`babel-plugins/lucide-direct-imports.js`).

If a release build misbehaves in a way the dev build does not, the first thing to rule out is
R8: set `enableMinifyInReleaseBuilds` / `enableShrinkResourcesInReleaseBuilds` to `false` in
`app.config.js` and rebuild.

## 4. Before every release — test on real devices

Nothing replaces this; the items below cannot be verified from a development machine.

- [ ] Install the **release** APK on a low-end Android phone (2–3 GB RAM, Android 10–11) and an iPhone.
- [ ] Cold start → dashboard; switch every tab; open each quick action.
- [ ] Scan a branch QR: online, in airplane mode (must queue), then back online (must sync once).
- [ ] Punch with location off / permission denied — clear error, no crash.
- [ ] Create a leave request and an activity with photos, online and offline.
- [ ] Switch language (EN/KH), dark mode, and text size *Large*; check nothing is clipped.
- [ ] Set the phone's system font size to maximum; check login and dashboard.
- [ ] Sign out and sign in as a different employee — no data from the previous user.
