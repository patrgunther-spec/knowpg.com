# Pop In — Setup Guide

> No coding knowledge needed. Follow these steps in order.
> Total time: about 30 minutes.

---

## THE IDEA

Before we start — here's how this works:

- **You** type 2 commands in Terminal (a program already on your Mac).
- **Your phone** downloads a free app called Expo Go.
- **The app appears** on your phone when you scan a QR code.
- That's it. No Xcode. No file dragging. No certificates.

---

## STEP 1 — Install Node.js (5 minutes)

Node.js is a tool that runs the app on your Mac so your phone can connect to it.

1. Open your browser and go to: **nodejs.org**
2. Click the big green **"Download Node.js (LTS)"** button
3. Open the downloaded file and click through the installer (just keep clicking Next/Continue/Install)
4. When it finishes, restart your Mac

---

## STEP 2 — Set Up Firebase (10 minutes)

Firebase is where all your app's data lives — user accounts, friend lists, chats, etc. It's free.

### Create your Firebase project

1. Go to: **console.firebase.google.com**
2. Sign in with your Google / Gmail account
3. Click **"Create a project"**
4. Name it **Pop In** → click Continue
5. Turn Google Analytics **OFF** → click Create project
6. Wait 10 seconds, then click Continue

### Create a Web App

1. On your project page, click the **`</>`** icon (Web app)
2. Give it a nickname: **Pop In**
3. Click **"Register app"**
4. You'll see a block of code that looks like this:

```
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "popin-....firebaseapp.com",
  projectId: "popin-...",
  storageBucket: "popin-....appspot.com",
  messagingSenderId: "12345...",
  appId: "1:12345...",
};
```

5. **Leave this tab open** — you'll need these values in Step 4.
6. Click **Continue to console**

### Turn on Email Sign-In

1. In the left sidebar, click **Authentication**
2. Click **Get started**
3. Click **Email/Password**
4. Click the first toggle to turn it **ON**
5. Click **Save**

### Turn on the Database (Firestore)

1. In the left sidebar, click **Firestore Database**
2. Click **Create database**
3. Select a location near you (e.g., `us-east1`)
4. Click **Next**
5. Select **"Start in test mode"**
6. Click **Create**

---

## STEP 3 — Download the Code (2 minutes)

1. Go to: **github.com/patrgunther-spec/knowpg.com**
2. Click the branch dropdown (it might say `main`) and switch to: `claude/location-friend-notifications-i0uaD`
3. Click the green **"<> Code"** button → **"Download ZIP"**
4. Find the ZIP in your Downloads folder and **double-click it** to unzip
5. You'll get a folder. Inside it, find the **`PopIn`** folder.
6. Drag the **`PopIn`** folder to your **Desktop**

---

## STEP 4 — Paste Your Firebase Config (2 minutes)

1. Open the **`PopIn`** folder on your Desktop
2. Open the **`services`** folder inside it
3. Open the file called **`firebase.ts`** with TextEdit:
   - Right-click on `firebase.ts` → Open With → TextEdit
4. Find this section near the top:

```
const firebaseConfig = {
  apiKey:            "PASTE_HERE",
  authDomain:        "PASTE_HERE",
  projectId:         "PASTE_HERE",
  storageBucket:     "PASTE_HERE",
  messagingSenderId: "PASTE_HERE",
  appId:             "PASTE_HERE",
};
```

5. Go back to your Firebase tab (from Step 2 where you saw the config)
6. Copy each value and paste it in to replace each `"PASTE_HERE"`

   For example, change `"PASTE_HERE"` to `"AIzaSyXXXXXX"` (your actual key)

7. Save the file (Command + S) and close TextEdit

---

## STEP 5 — Install the App (3 minutes, one time only)

1. Open **Terminal** on your Mac
   - Press **Command + Space**, type `Terminal`, press Enter
   - A black/white window will open — this is normal!

2. Type this command and press **Enter**:
   ```
   cd ~/Desktop/PopIn
   ```
   *(This moves Terminal into your PopIn folder)*

3. Type this command and press **Enter**:
   ```
   npm install
   ```
   *(This downloads everything the app needs. Wait for it to finish — 1-2 minutes)*

---

## STEP 6 — Start the App (30 seconds)

1. In Terminal (still in your PopIn folder), type this and press **Enter**:
   ```
   npm start
   ```

2. A QR code will appear in Terminal! It looks like a square barcode.

---

## STEP 7 — Open on Your iPhone (1 minute)

1. On your iPhone, open the **App Store** and search for **"Expo Go"**
2. Download and open it (it's free)
3. Tap **"Scan QR Code"**
4. Point your camera at the QR code in Terminal on your Mac
5. The app will load on your phone in about 30 seconds!

> **Every time you want to use the app:** just run `npm start` in Terminal and scan the QR code.

---

## HOW TO USE POP IN

### First time:
1. Tap **Sign Up** and create an account with any email + password
2. You're in!

### Tell friends where you're going:
1. Tap the big blue **📡 Pop In** button
2. Type where you're headed (e.g., "Joe's Pizza on 5th")
3. Add any details (e.g., "Getting there around 8")
4. Tap **Send Pop**
5. Your friends will see it in their feed!

### Add a friend:
1. Tap the **Friends** tab at the bottom
2. You'll see your **6-character code** in big letters at the top (like `POP3FK`)
3. Text that code to your friend
4. They go to their Friends tab → tap **+ Add** → type your code
5. You're connected!

### See a friend's pop:
1. It shows up in your **Pops** feed automatically
2. Tap it to see their location on a map and chat with them

### End a pop:
- Swipe left on your own pop → tap **End Pop**

---

## SHARING WITH A COLLEAGUE TO TEST

Because you're running this locally on your Mac, your colleague needs to be on the **same Wi-Fi network** to scan the QR code. Or you can both test separately by each following Steps 1–7 on your own computers.

---

## TROUBLESHOOTING

**"command not found: npm"**
→ Node.js didn't install properly. Restart your Mac and try Step 1 again.

**"Cannot find module" errors when running npm install**
→ Make sure you're in the right folder. Type `cd ~/Desktop/PopIn` and try again.

**The app loads but shows a blank white screen**
→ Your Firebase config probably has a typo. Double-check Step 4 — make sure every `"PASTE_HERE"` was replaced.

**"Network request failed" when signing in**
→ Make sure you turned on Email/Password sign-in in Firebase (Step 2).

**The QR code doesn't work**
→ Make sure your phone and Mac are on the same Wi-Fi. Or in Terminal, press `w` to open in a browser instead.

---

## WHAT'S NEXT

Once you've tested this and it's working, just ask and I can add:
- Push notifications (so friends get notified when the app is closed)
- Real-time location tracking on the map
- Friend groups (send pops to specific people)
- An "I'm coming!" button
- Putting it on the App Store
