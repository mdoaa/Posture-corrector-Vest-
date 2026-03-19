# SitGuard - Mobile App

A Flutter application for the SitGuard posture corrector vest system. The app connects to the backend via REST API and WebSocket for real-time posture monitoring.

## Prerequisites

- [Flutter SDK](https://docs.flutter.dev/get-started/install) >= 3.7.0
- [Dart SDK](https://dart.dev/get-dart) >= 3.7.0
- Android Studio / Xcode (for Android / iOS targets)
- A connected device or emulator

Verify your environment is ready:

```bash
flutter doctor
```

## Getting Started

### 1. Navigate to the Mobile directory

```bash
cd Mobile
```

### 2. Install dependencies

```bash
flutter pub get
```

### 3. Configure the backend URL (optional)

The app points to the hosted backend by default. To use a local backend, edit [`lib/config.dart`](lib/config.dart):

```dart
static const String apiBaseUrl = 'http://<your-local-ip>:<port>';
static const String webSocketUrl = 'http://<your-local-ip>:<port>';
```

### 4. Run the app

```bash
# Run on a connected device or emulator
flutter run

# Run on a specific platform
flutter run -d android
flutter run -d ios
flutter run -d chrome      # Web
flutter run -d windows
```

## Build

```bash
# Android APK
flutter build apk --release

# Android App Bundle
flutter build appbundle --release

# iOS (macOS only)
flutter build ios --release

# Web
flutter build web --release
```

## Generate launcher icons

```bash
flutter pub run flutter_launcher_icons
```

## Project Structure

```
lib/
├── config.dart          # Backend URL and socket configuration
├── main.dart            # App entry point
├── controllers/         # GetX controllers
├── models/              # Data models
├── screens/             # UI screens
├── Services/            # API and socket service classes
└── widgets/             # Reusable UI components
```

## Dependencies

Key packages used in this project:

| Package | Purpose |
|---|---|
| `get` | State management & routing |
| `socket_io_client` | Real-time WebSocket communication |
| `fl_chart` | Posture data charts |
| `google_sign_in` | Google OAuth |
| `http` | REST API calls |
| `encrypt` / `bcrypt` | Client-side encryption |
| `youtube_player_flutter` | In-app exercise videos |
