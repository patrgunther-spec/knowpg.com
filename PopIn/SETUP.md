# Pop In — Complete Beginner Setup Guide

> **You do NOT need to know how to code.** This guide walks you through every single click.
> All the code is already written. You just need to put it in the right place.

---

## WHAT IS ALL THIS STUFF? (Quick Glossary)

Before we start, here's what some of these words mean:

- **Xcode** = The free app Apple makes for building iPhone apps. Think of it as Microsoft Word, but for apps instead of documents. You NEED this.
- **Firebase** = A free service by Google that stores your app's data in the cloud (user accounts, messages, friend lists, etc.). Think of it as the "brain" that lives on the internet.
- **SwiftUI** = The language your app is written in. You don't need to understand it — the code is already written for you.
- **Simulator** = A fake iPhone that runs on your Mac so you can test the app without a real phone.
- **Bundle ID** = A unique name for your app, like a license plate. Example: `com.popin.app`

---

## WHAT YOU NEED BEFORE STARTING

1. **A Mac computer** (iMac, MacBook, Mac Mini — any Mac works). You CANNOT build iPhone apps on Windows.
2. **Xcode** (free). We'll install this in Step 1.
3. **An Apple ID** (the one you use for iCloud/App Store). Free. No $99 developer account needed yet.
4. **A Google account** (for Firebase — your Gmail works fine).
5. **An iPhone** running iOS 17 or newer (optional — you can use the Simulator on your Mac to start).

---

## STEP 1: INSTALL XCODE

This is the app you use to build iPhone apps. It's free but it's big (~12 GB), so it takes a while to download.

1. On your Mac, open the **App Store** (the blue icon with the "A" on it)
2. Search for **"Xcode"**
3. Click **Get** (then **Install**)
4. Wait for it to download and install. Go get a coffee — this takes 20-45 minutes depending on your internet.
5. Once installed, **open Xcode**
6. It will ask to install "additional components" — click **Install** and let it finish
7. Close Xcode for now

---

## STEP 2: DOWNLOAD THE POP IN CODE

All the code for your app is stored on GitHub (think of it as Google Drive for code). You need to download it to your Mac.

1. On your Mac, open **Safari** (or any web browser)
2. Go to: **github.com/patrgunther-spec/knowpg.com**
3. Click the green **"<> Code"** button
4. Click **"Download ZIP"**
5. A ZIP file will download. Find it in your **Downloads** folder.
6. **Double-click** the ZIP file to unzip it. You'll get a folder called something like `knowpg.com-main` or `knowpg.com-claude-location-friend-notifications-...`
7. Open that folder. Inside, you'll see a folder called **`PopIn`**. This is your app!
8. **Drag the `PopIn` folder to your Desktop** so you can find it easily

---

## STEP 3: CREATE YOUR XCODE PROJECT

Now we need to create the "container" for your app in Xcode.

1. **Open Xcode**
2. Click **"Create New Project"** (or go to File menu → New → Project)
3. At the top, make sure **"iOS"** is selected (not macOS, watchOS, etc.)
4. Click **"App"** → click **Next**
5. Fill in these fields EXACTLY:
   - **Product Name:** `PopIn`
   - **Team:** Select your Apple ID (if it says "Add Account", click it and sign in with your Apple ID)
   - **Organization Identifier:** `com.popin`
   - **Interface:** Make sure it says **SwiftUI**
   - **Language:** Make sure it says **Swift**
   - **Storage:** None
   - **Uncheck** "Include Tests" if it's checked
6. Click **Next**
7. Choose your **Desktop** as the save location → click **Create**

Xcode will open your new project. You'll see a left sidebar with some files.

---

## STEP 4: DELETE THE DEFAULT FILES (REPLACE WITH POP IN CODE)

Xcode created some starter files, but we want to use OUR code instead.

### Delete the default files:

1. In the **left sidebar** of Xcode (called the "Navigator"), you'll see:
   ```
   PopIn
   ├── PopInApp.swift
   ├── ContentView.swift
   ├── Assets.xcassets
   └── Preview Content
   ```
2. **Click on `PopInApp.swift`** to select it
3. **Hold the Command key (⌘)** and also click on `ContentView.swift` and `Assets.xcassets` — now all three are selected
4. **Right-click** on the selected files
5. Click **"Delete"**
6. When asked, click **"Move to Trash"**

### Add the Pop In code:

1. Open **Finder** (the blue smiley face in your dock)
2. Navigate to your **Desktop → PopIn → PopIn** folder (the inner PopIn folder)
3. You should see folders like `Models`, `Services`, `ViewModels`, `Views`, and files like `PopInApp.swift`, `ContentView.swift`
4. **Select ALL of these files and folders** (Command+A to select all)
5. **Drag them** from Finder **into the left sidebar of Xcode**, right onto the yellow "PopIn" folder icon
6. A dialog box will appear. Make sure these are checked:
   - ✅ "Copy items if needed"
   - ✅ "Create groups"
   - ✅ Your target "PopIn" is checked at the bottom
7. Click **Finish**

You should now see all the app files in the left sidebar:
```
PopIn
├── Models/
│   ├── AppUser.swift
│   ├── Pop.swift
│   └── ChatMessage.swift
├── Services/
│   ├── AuthService.swift
│   ├── PopService.swift
│   ├── ChatService.swift
│   ├── FriendsService.swift
│   └── LocationService.swift
├── ViewModels/
│   ├── AuthViewModel.swift
│   ├── HomeViewModel.swift
│   ├── CreatePopViewModel.swift
│   ├── PopDetailViewModel.swift
│   └── FriendsViewModel.swift
├── Views/
│   ├── Auth/SignInView.swift
│   ├── Home/HomeView.swift
│   ├── Home/PopRow.swift
│   ├── Pop/CreatePopView.swift
│   ├── Pop/PopDetailView.swift
│   ├── Friends/FriendsView.swift
│   └── Friends/AddFriendView.swift
├── PopInApp.swift
├── ContentView.swift
└── Assets.xcassets/
```

---

## STEP 5: ADD FIREBASE (THE CLOUD BRAIN)

Firebase stores your users, friend lists, pops, and chat messages. It's free for small apps.

### 5A: Create a Firebase project

1. Open your browser and go to: **console.firebase.google.com**
2. Sign in with your **Google account** (Gmail)
3. Click **"Create a project"** (or "Add project")
4. Name it **"PopIn"** → click **Continue**
5. It will ask about Google Analytics — you can turn this **OFF** (we don't need it). Click **Continue**
6. Click **"Create project"**. Wait 30 seconds for it to finish.
7. Click **"Continue"** to enter your project

### 5B: Add your iPhone app to Firebase

1. On the Firebase project page, you'll see icons for iOS, Android, Web, etc.
2. Click the **iOS icon** (looks like the Apple logo)
3. For **"Apple bundle ID"**, type exactly: `com.popin.PopIn`

   > **IMPORTANT:** This must match your Xcode project. To check: in Xcode, click the **PopIn** project at the very top of the left sidebar, then look for "Bundle Identifier" in the middle panel. Copy whatever it says and paste it into Firebase.

4. For "App nickname" type: `Pop In` (optional but helpful)
5. Skip the "App Store ID" field
6. Click **"Register app"**

### 5C: Download the config file

1. Firebase will show you a button that says **"Download GoogleService-Info.plist"**
2. **Click it** — a file called `GoogleService-Info.plist` will download to your Downloads folder
3. Find this file in your Downloads folder
4. **Drag it into Xcode** — drop it into the left sidebar, right onto the yellow "PopIn" folder (same level as `PopInApp.swift`)
5. When the dialog appears:
   - ✅ Check "Copy items if needed"
   - ✅ Make sure "PopIn" target is checked
   - Click **Finish**
6. Back in Firebase, click **"Next"** through the remaining steps (you can skip them — we'll add the SDK differently)
7. Click **"Continue to console"**

### 5D: Turn on Authentication (sign-in)

1. In the Firebase Console, look at the **left sidebar**
2. Click **"Build"** to expand it (if needed)
3. Click **"Authentication"**
4. Click **"Get started"**
5. Click **"Apple"** from the list of sign-in providers
6. Click the **toggle to Enable** it
7. Click **"Save"**

### 5E: Turn on Firestore (the database)

1. In the Firebase Console left sidebar, click **"Firestore Database"**
2. Click **"Create database"**
3. It will ask about location — pick the one closest to you (e.g., `us-east1` for East Coast US, `us-west1` for West Coast)
4. Click **Next**
5. Select **"Start in test mode"** (this is fine for now — it lets anyone read/write while you're testing)
6. Click **"Create"**

---

## STEP 6: ADD FIREBASE SDK TO XCODE

The "SDK" is the code that lets your app talk to Firebase. Think of it as installing a plugin.

1. In Xcode, go to the top menu: **File → Add Package Dependencies...**
2. In the search bar at the top right, paste this URL:
   ```
   https://github.com/firebase/firebase-ios-sdk
   ```
3. Press **Enter** and wait — Xcode will find the package (this takes 10-30 seconds)
4. It will show "firebase-ios-sdk" with a version number. Leave the version settings as default.
5. Click **"Add Package"**
6. **Wait** — this downloads a LOT of code. It can take 2-5 minutes. Be patient.
7. A screen will appear asking you to **choose which Firebase libraries to add**. This is a long list. You need to find and **check ONLY these two**:
   - ✅ **FirebaseAuth**
   - ✅ **FirebaseFirestore**
8. **Uncheck everything else** (there are a lot — scroll through and make sure only those two are checked)
9. Click **"Add Package"**
10. Wait for it to finish. Xcode may show "Resolving packages" at the top — just wait.

---

## STEP 7: ENABLE "SIGN IN WITH APPLE"

This lets users sign into your app with their Apple ID (one-tap sign in).

1. In Xcode, click on the **"PopIn" project** at the very top of the left sidebar (the blue icon)
2. In the middle panel, click on **"PopIn"** under "TARGETS"
3. Click on the **"Signing & Capabilities"** tab at the top
4. Under **"Signing"**:
   - Make sure **"Automatically manage signing"** is checked
   - For **"Team"**, select your Apple ID / Personal Team
5. Click the **"+ Capability"** button (top left of this panel)
6. In the search bar that appears, type **"Sign in with Apple"**
7. **Double-click** "Sign in with Apple" to add it
8. You should now see "Sign in with Apple" listed under your capabilities

---

## STEP 8: ADD LOCATION PERMISSION

When your app wants to use someone's location, iOS requires you to explain WHY. We need to add that explanation.

1. In Xcode, with your project still selected, click the **"Info"** tab (next to "Signing & Capabilities")
2. You'll see a list of rows. Hover over any row and you'll see a **"+"** button appear
3. Click the **"+"** button
4. In the dropdown that appears, scroll down and find:
   **`Privacy - Location When In Use Usage Description`**
   (start typing "Privacy - Location" and it will filter the list)
5. Select it
6. In the **Value** column on the right, type:
   ```
   Pop In uses your location to show friends where you are when you send a pop.
   ```

---

## STEP 9: RUN THE APP!

### Option A: Run on the Simulator (no iPhone needed)

1. At the top of Xcode, you'll see a bar that says something like "PopIn > iPhone 15 Pro"
2. Click on the device name (e.g., "iPhone 15 Pro") to pick which simulated phone to use. Any iPhone is fine.
3. Click the **▶ Play button** (top left corner of Xcode)
4. Wait — Xcode will "build" the app (compile all the code). This takes 1-3 minutes the first time.
5. The Simulator will open and your app will launch!

> **Note:** Apple Sign In on the Simulator can be finicky. If it doesn't work, try on a real iPhone (Option B).

### Option B: Run on your real iPhone (free!)

1. **Plug your iPhone into your Mac** with a USB/Lightning/USB-C cable
2. Your iPhone may show "Trust This Computer?" — tap **Trust** and enter your passcode
3. At the top of Xcode, click the device dropdown and select **your iPhone** (it will show your phone's name)
4. Click the **▶ Play button**
5. **First time only:** Xcode might say it needs to "prepare your device for development." Let it — it takes a minute.
6. **First time only:** The app might fail to open. On your iPhone, go to:
   **Settings → General → VPN & Device Management**
   You'll see a "Developer App" entry with your Apple ID email. Tap it → tap **"Trust"**
7. Try running the app again from Xcode (▶ button)
8. The app will install and open on your phone!

> **Note:** With a free Apple ID, the app expires after 7 days. Just plug in your phone and hit ▶ in Xcode again to reinstall it.

---

## STEP 10: USING POP IN

Congratulations! Your app is running. Here's how to use it:

### First time:
1. Tap **"Sign in with Apple"**
2. Use your Apple ID to sign in (one tap)
3. You're in!

### Add a friend:
1. Tap the **"Friends"** tab at the bottom
2. You'll see **your 6-character friend code** displayed big at the top (e.g., "POP3FK")
3. **Text this code to a friend** who also has the app
4. They go to their Friends tab → tap the **"+"** button → type your code → tap **"Add Friend"**
5. You'll both appear in each other's friend lists

### Send a Pop (tell friends your plans):
1. Tap the **"Pops"** tab at the bottom
2. Tap the big blue **"Pop In"** button
3. Type where you're headed (e.g., "Central Park")
4. Optionally type details (e.g., "Getting there around 8pm")
5. Tap **"Send Pop"**
6. The app grabs your current location and broadcasts to all your friends!

### See a friend's pop:
1. When a friend sends a pop, it shows up in your **Pops feed**
2. Tap on it to see:
   - A **map** showing where they were when they sent the pop
   - A **chat** where everyone can coordinate

### End a pop early:
1. Swipe left on your own pop in the feed
2. Tap **"End"**

---

## TROUBLESHOOTING

### "Build Failed" errors in Xcode
- Make sure you added `GoogleService-Info.plist` to the project (Step 5C)
- Make sure you added the Firebase packages (Step 6)
- Try: **Product menu → Clean Build Folder**, then hit ▶ again

### "No such module 'FirebaseAuth'" error
- The Firebase packages didn't install correctly. Go to **File → Add Package Dependencies** and try adding them again.

### Sign in doesn't work
- Make sure you enabled Apple as a sign-in provider in Firebase (Step 5D)
- Make sure you added the "Sign in with Apple" capability in Xcode (Step 7)
- On Simulator, make sure you're signed into an Apple ID in the Simulator's Settings app

### Location doesn't work
- Make sure you added the location permission string (Step 8)
- When the app asks "Allow Pop In to use your location?" — tap **"Allow While Using App"**

### App won't install on iPhone
- Go to Settings → General → VPN & Device Management → Trust the developer certificate
- Make sure your iPhone is running iOS 17 or newer (Settings → General → About → iOS Version)

---

## WHAT'S NEXT?

This is the basic version. Future features we can add:

- **Push notifications** — friends get notified even when the app is closed (needs $99/year Apple Developer account)
- **Real-time location tracking** — see friends moving on the map live
- **Friend groups** — send pops to specific groups, not everyone
- **"I'm coming!" button** — RSVP to a friend's pop
- **Profile pictures** — so your friends aren't just names
- **Android version** — for friends who don't have iPhones

Just let me know when you're ready to add more features!
