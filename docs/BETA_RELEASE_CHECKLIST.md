# Beta Release Checklist

## Blocking before community testing

- Upgrade Expo SDK incrementally from SDK 50 to a currently supported release.
- Replace placeholder icon, adaptive icon, and splash artwork with store-ready assets.
- Create permanent Android upload credentials; do not publish with the debug key.
- Create Google Play Console and Apple Developer/App Store Connect records.
- Publish a privacy policy at a stable public URL and nominate a support email address.
- Complete Google Data Safety and Apple App Privacy declarations.
- Build and test an Android App Bundle and an iOS archive.
- Verify database migrations preserve existing clients and notes during updates.
- Test microphone, biometrics, clipboard, sharing, keyboard, and app locking on both platforms.
- Decide whether local note data requires database-level encryption before external testing.

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
