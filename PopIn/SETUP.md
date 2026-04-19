# Pop In — How to Run This on Your iPhone

**Total time: 10 minutes. No coding. 4 steps.**

---

## Step 1 — Install Node.js

This is a one-time install. It lets your Mac run the app.

1. Open your browser, go to **nodejs.org**
2. Click the big green **Download** button
3. Open the file and click through the installer (keep hitting Continue / Install)
4. Done. Restart your Mac.

---

## Step 2 — Download the app code

1. Go to **github.com/patrgunther-spec/knowpg.com**
2. Click the branch dropdown and switch to: **claude/location-friend-notifications-i0uaD**
3. Click the green **Code** button → **Download ZIP**
4. Unzip the file (double-click it)
5. Drag the **PopIn** folder to your **Desktop**

---

## Step 3 — Start the app

1. Open **Terminal** (press Command+Space, type "Terminal", hit Enter)
2. Copy and paste this whole line, then hit Enter:

```
cd ~/Desktop/PopIn && npm install && npm start
```

3. Wait 1-2 minutes. A **QR code** will appear in Terminal.

---

## Step 4 — Open it on your iPhone

1. On your iPhone, go to the **App Store** and download **Expo Go** (free)
2. Open Expo Go
3. Tap **Scan QR Code**
4. Point your phone at the QR code on your Mac screen
5. The app loads on your phone. Done!

---

## Using Pop In

**First time:** Type your name and tap "Let's Go"

**Send a pop:** Tap the big blue 📡 Pop In button → type where you're going → Send

**View your pop:** Tap it in the feed to see a map with your location + a chat

**Friends tab:** Shows your unique friend code — share it with friends so they're ready when we connect everyone

---

## Every time after the first time

Just open Terminal and run:

```
cd ~/Desktop/PopIn && npm start
```

Then scan the QR code with Expo Go. That's it.

---

## Troubleshooting

**"command not found: npm"** → Restart your Mac after installing Node.js

**QR code doesn't work** → Make sure your phone and Mac are on the same Wi-Fi

**App shows an error screen** → In Terminal, press Ctrl+C to stop, then run the command again
