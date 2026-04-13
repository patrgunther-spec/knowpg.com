# Pop In — Setup Guide

## What You Need

- A Mac with **Xcode 15+** installed (free from the Mac App Store)
- An iPhone running iOS 17+ (or use the Simulator)
- A free **Apple ID** (for running on your phone — no $99 developer account needed yet)

---

## Step 1: Create the Xcode Project

1. Open Xcode → **File → New → Project**
2. Choose **iOS → App**
3. Settings:
   - Product Name: `PopIn`
   - Organization Identifier: `com.popin` (or whatever you want)
   - Interface: **SwiftUI**
   - Language: **Swift**
   - Uncheck "Include Tests" (we'll add these later)
4. Save it somewhere on your Mac
5. **Delete the auto-generated files** (`ContentView.swift`, `PopInApp.swift`, `Assets.xcassets`) from the Xcode project
6. **Drag the `PopIn/PopIn/` folder** from this repo into the Xcode project navigator to replace them

---

## Step 2: Set Up Firebase

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **Add Project** → name it "PopIn"
3. Click **Add App → iOS**
4. Enter your Bundle ID (e.g., `com.popin.app` — must match what's in Xcode under Signing & Capabilities)
5. Download `GoogleService-Info.plist`
6. Drag it into your Xcode project (into the `PopIn/` folder alongside `PopInApp.swift`)
7. In Firebase Console:
   - Go to **Authentication → Sign-in method → Add new provider → Apple** → Enable it
   - Go to **Firestore Database → Create database → Start in test mode**

---

## Step 3: Add Firebase SDK via Swift Package Manager

1. In Xcode: **File → Add Package Dependencies**
2. Enter: `https://github.com/firebase/firebase-ios-sdk`
3. Select version: **Up to Next Major** (latest)
4. Choose these libraries:
   - `FirebaseAuth`
   - `FirebaseFirestore`
5. Click **Add Package**

---

## Step 4: Enable Sign in with Apple

1. In Xcode, select your project in the navigator
2. Go to **Signing & Capabilities**
3. Click **+ Capability → Sign in with Apple**
4. Under **Signing**, select your **Personal Team** (your Apple ID)

---

## Step 5: Add Location Permission String

1. Select your project → target → **Info** tab
2. Add a row:
   - Key: `Privacy - Location When In Use Usage Description`
   - Value: `Pop In uses your location to show friends where you are when you send a pop.`

---

## Step 6: Run It!

### On Simulator:
- Select an iPhone simulator from the device dropdown → Press ▶ (Run)
- Note: Apple Sign In works on Simulator but may require an iCloud-signed-in Simulator

### On Your iPhone (free):
1. Connect your iPhone via USB
2. Select it from the device dropdown
3. You may see a "trust this computer" prompt on your phone — tap Trust
4. Xcode may ask you to register your device — let it
5. Press ▶ (Run)
6. First time: Go to **Settings → General → VPN & Device Management** on your phone and trust the developer certificate
7. The app installs and launches!

> **Note:** With a free Apple ID, the app expires after 7 days. Just re-run from Xcode to reinstall.

---

## How It Works

1. **Sign in** with your Apple ID (one tap)
2. Go to the **Friends** tab → share your 6-character code with a friend
3. They enter your code → you're connected
4. Tap the big **Pop In** button → type where you're headed → Send
5. Your friends see it in their feed, can view your location on a map, and chat with you

---

## What's Next (Phase 2)

- Push notifications (requires $99 Apple Developer account)
- Real-time location tracking
- Friend groups
- "I'm coming!" RSVP button
- Profile pictures
