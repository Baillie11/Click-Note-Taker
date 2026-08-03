# Beta Release Checklist

## Completed release foundation

- [x] Upgrade to Expo SDK 57 and pass all Expo Doctor checks.
- [x] Configure one generated-native codebase for Android and iOS.
- [x] Add store-ready icon, adaptive icon, and splash assets.
- [x] Link the app to Expo/EAS and create managed Android credentials.
- [x] Build local Android APK and App Bundle artifacts targeting Android API 36.
- [x] Add an in-app control to permanently erase local app data.
- [x] Add preview and production EAS build profiles.

## Blocking before public distribution

- Create Google Play Console and Apple Developer/App Store Connect records.
- Publish a privacy policy at a stable public URL and nominate a support email address.
- Complete Google Data Safety and Apple App Privacy declarations.
- Build and test a production-signed Android App Bundle and an iOS archive.
- Verify database migrations preserve existing clients and notes during updates.
- Test microphone, biometrics, clipboard, sharing, keyboard, and app locking on both platforms.
- Decide whether local note data requires database-level encryption before external testing.

Local Gradle artifacts use a debug certificate and are suitable only for direct testing.
Use EAS production builds for Google Play or App Store submission.

## Recommended beta rollout

1. Android internal test with a small trusted group.
2. iOS internal TestFlight test.
3. Closed Android test and external TestFlight group.
4. Resolve release-blocking feedback before any open or public listing.

## Tester feedback to collect

- App version, phone model, and operating-system version.
- Steps that caused the problem and what the tester expected.
- Whether the problem can be reproduced.
- Screenshots only when they contain no participant-identifying information.
- Confirmation that updating the app preserved existing records.

## Sensitive-data rules

- Use fictional client information during early beta testing.
- Never include client names or session content in issue trackers, analytics, or crash reports.
- Do not upload the SQLite database or voice recordings with a bug report.
- Treat copied and shared reports as sensitive after they leave the app.
