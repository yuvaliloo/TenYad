# TenYad (תן יד) 🤝

TenYad is a community-driven task marketplace application built with React Native and Expo. It allows users to seamlessly switch between two modes:
* **Seeker Mode (לקבל יד):** Request help with local tasks, review applicants, and securely pay for completed jobs.
* **Tasker Mode (לתת יד):** Browse nearby open tasks, offer your services, and earn money while helping your community.

Features include real-time location-based task matching, secure PayPal integration, user reviews, push notifications, and hybrid authentication (Email/Password & Google Sign-In).

---

## 📱 Prerequisites

To run this project on your machine and phone, you need a few things installed:

1. **Node.js**: Download and install from [nodejs.org](https://nodejs.org/).
2. **Expo Go App**: Download the "Expo Go" app on your physical smartphone from the Apple App Store (iOS) or Google Play Store (Android).
3. **Expo CLI**: Comes pre-packaged with your project, but requires a terminal to run.

---

## 🛠️ Installation

1. Clone or download this repository to your computer.
2. Open your terminal, navigate to the project folder, and install the dependencies. 
*(Note: We use the legacy flag to bypass strict versioning conflicts with Expo's ESLint dependencies).*

```bash
npm install --legacy-peer-deps
```
## 🚀 Running the App
You have three different ways to run the app depending on what you are testing and your Wi-Fi setup.

Option 1: Web Mode (Best for testing Google Login)
Since native Google Sign-In requires a compiled developer build, the easiest way to test authentication logic is directly in your computer's browser.

```bash
npx expo start -w
```
Alternatively, run npx expo start and press w in the terminal.

Option 2: Local Network (Standard Phone Testing)
Use this if your computer and your phone are connected to the exact same Wi-Fi network.

```bash
npx expo start
```
iOS: Open your iPhone's Camera app and scan the QR code that appears in the terminal. Tap the Expo link.

Android: Open the Expo Go app and tap "Scan QR Code".

Option 3: Tunnel Mode (For Network Restrictions)
If your Wi-Fi blocks local network connections (common on university or public networks), use a tunnel to route the app through the internet.

```bash
npx expo start --tunnel
```
Note: This requires ngrok to be installed globally on your machine. Scan the QR code exactly as you would in Option 2.

⚠️ Important Developer Notes & Known Expo Go Limitations
Google Sign-In on Expo Go:
Standard Expo Go does not support custom native modules. Because this app uses @react-native-google-signin/google-signin for maximum security on mobile, clicking the Google button inside the Expo Go app will trigger a bypass alert.

To test the app in Expo Go: Use the standard Email/Password login.

To fully test native Google Auth on a physical device: You must compile a Custom Dev Client using eas build.

Firebase Persistence:
This app dynamically switches its storage mechanism depending on the platform. It uses standard browser caching for the Web and AsyncStorage for iOS/Android to prevent auth/argument-error crashes.