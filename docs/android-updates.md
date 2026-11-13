# Android update delivery

## Current flow

- Running the Android workflow manually still creates the `chartmasters-apk` artifact.
- Pushing a semantic version tag such as `app-v1.0.1` builds a signed release APK and publishes it as a GitHub Release.
- The Android app checks the latest GitHub Release at launch and when it returns to the foreground. If the release is newer, it shows an update notice that opens the release page.
- The user still confirms the APK download and installation in Android. Updates are not silently installed.

## Versioning

Use tags in this exact format: `app-vMAJOR.MINOR.PATCH`.

The workflow maps the tag to Android's version code using:

```
major * 1,000,000 + minor * 1,000 + patch
```

This keeps version codes increasing for normal semantic-version increments. Do not reuse an already published tag or version.

## Required GitHub Actions secrets

A tag-based release requires the same signing key used by the currently installed app:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

The keystore must match the certificate used to sign the existing installed APK. If it changes, Android will reject the update as an incompatible signature.

## Push notifications

This branch implements release publishing and an in-app update check. True push notifications are a separate next step and still require a Firebase project, Android `google-services.json`, device permission/token registration, and a secure server-side FCM sender. No service-account credential belongs in the repository or client bundle.
