# Click Note Taker

**Powered by Click eCommerce**

A beta React Native (Expo) app designed for NDIS support workers in Australia. Create and manage progress notes, prepare structured support-session reports, and organise client information with PIN and optional biometric access controls.

## Features

### Core Features
- **Note Taking**: Type notes or record voice notes with editable speech-to-text
- **Private Transcription**: Australian English speech recognition runs on-device without a cloud fallback
- **Fast Voice Notes**: Stopping a recording adds its transcript directly to the editable, time-stamped session timeline
- **Emergency Lock**: Entering `999` on the unlock screen blocks PIN and biometric access for 15 minutes, including after an app restart
- **Auto-save**: Notes automatically save every 5 seconds
- **Auto Timestamp**: Time In auto-assigned on note creation, editable Time In/Out
- **Australian Date Format**: All dates displayed in DD/MM/YYYY format

### NDIS Progress Notes
- **Convert to NDIS Format**: Transform raw notes into structured progress notes
- **Template Fields**:
  - Participant Name, Date, Time In/Out
  - Location, Support Category (dropdown)
  - Goals Supported, Activities Completed
  - Observations / Participant Response
  - Risks / Incidents, Medication Assistance
  - Next Steps / Recommendations
  - Worker Name & Signature
- **Copy & Share**: Copy formatted notes to clipboard or share via system share

### Client Management
- Create and manage client folders
- Store client details: Name, Preferred Name, NDIS Number
- View all notes organized by client
- Search clients by name or NDIS number

### Security
- **PIN Protection**: 4-6 digit PIN required on first launch
- **Biometric Unlock**: Optional Face ID / Fingerprint authentication
- **1-Minute Grace Period**: Optional setting to stay unlocked briefly
- **Secure PIN Storage**: PIN hash stored via expo-secure-store

### Coming Soon
- **Incident Reports**: Scaffold in place for future incident reporting

## Installation

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager
- Expo CLI (will be installed via npx)
- iOS Simulator (Mac) or Android Emulator, or physical device with Expo Go app

### Setup

1. **Navigate to project directory**:
   ```bash
   cd ClickNoteTaker
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npx expo start
   ```

4. **Run on your device**:
   - **iOS Simulator**: Press `i` in the terminal
   - **Android Emulator**: Press `a` in the terminal
   - **Physical Device**: Scan the QR code with Expo Go app

### Platform-Specific Notes

#### iOS
- Face ID permission is configured in app.json
- Microphone permission for voice recording and on-device transcription is configured

#### Android
- Biometric and microphone permissions are configured
- Supports Android 6.0+ (API level 23)

## Project Structure

```
ClickNoteTaker/
├── App.tsx                     # Main entry point
├── app.json                    # Expo configuration
├── package.json                # Dependencies
├── tsconfig.json               # TypeScript config
├── assets/                     # App icons and splash
└── src/
    ├── components/
    │   ├── Footer.tsx          # Branded footer component
    │   ├── NDISProgressNote.tsx # NDIS note display
    │   └── VoiceRecorder.tsx   # Audio recording component
    ├── constants/
    │   └── index.ts            # App constants, colors, typography
    ├── context/
    │   └── AuthContext.tsx     # Authentication state management
    ├── database/
    │   ├── index.ts            # Database initialization
    │   ├── migrations.ts       # Schema migrations
    │   ├── clients.ts          # Client CRUD operations
    │   ├── notes.ts            # Notes CRUD operations
    │   └── incidentReports.ts  # Incident reports (scaffold)
    ├── navigation/
    │   └── AppNavigator.tsx    # Navigation setup
    ├── screens/
    │   ├── auth/
    │   │   ├── PinSetupScreen.tsx
    │   │   └── UnlockScreen.tsx
    │   └── main/
    │       ├── ClientsScreen.tsx
    │       ├── ClientDetailScreen.tsx
    │       ├── NoteEditorScreen.tsx
    │       ├── SettingsScreen.tsx
    │       ├── IncidentReportsListScreen.tsx
    │       └── IncidentReportEditorScreen.tsx
    ├── types/
    │   └── index.ts            # TypeScript type definitions
    └── utils/
        ├── biometrics.ts       # Biometric authentication
        ├── dateTime.ts         # Australian date formatting
        ├── ndisFormatter.ts    # NDIS note conversion
        └── pin.ts              # PIN hashing and verification
```

## Key Dependencies

- **expo** ~50.0.0 - Core Expo SDK
- **expo-sqlite** - Local database storage
- **expo-secure-store** - Secure PIN storage
- **expo-local-authentication** - Biometric authentication
- **expo-audio** - Local audio playback
- **expo-speech-recognition** - On-device voice recording and speech-to-text
- **expo-clipboard** - Copy to clipboard
- **@react-navigation/native** - Navigation

## Data Storage

App data is stored locally on the device:
- **Database**: SQLite via expo-sqlite
- **PIN**: Hashed and stored in expo-secure-store
- **Audio**: Stored in app's document directory

The app does not currently upload records to a Click Note Taker server. SQLite note data is not currently represented as database-level encrypted; review `docs/PRIVACY_POLICY_DRAFT.md` before external testing.

## Customization

### Branding
Update branding in `src/constants/index.ts`:
```typescript
export const APP_NAME = 'Click Note Taker';
export const APP_TAGLINE = 'Powered by Click eCommerce';
export const COMPANY_URL = 'https://www.clickecommerce.com.au';
```

### Colors
Customize the color palette in `src/constants/index.ts`:
```typescript
export const COLORS = {
  primary: '#2C5282',
  // ... other colors
};
```

## Support Categories

The app includes standard NDIS support categories:
- Assistance with Daily Life
- Transport
- Consumables
- Assistance with Social & Community Participation
- Assistive Technology
- Home Modifications
- Coordination of Supports
- And more...

## Permissions

The app requests the following permissions:
- **Microphone**: For local voice recording and on-device speech-to-text
- **Face ID / Biometrics**: For optional biometric unlock

All permissions are handled gracefully—the app will not crash if permissions are denied.

## License

Proprietary - Click eCommerce

## Contact

- Website: [clickecommerce.com.au](https://www.clickecommerce.com.au)
