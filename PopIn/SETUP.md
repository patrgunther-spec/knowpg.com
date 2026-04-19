# Pop In — Run on Your iPhone

**One command. Scan QR. Done.**

---

## One-time setup (only first time)

1. Install **Node.js** from **nodejs.org** (big green Download button → open the file → click Continue/Install → restart Mac)
2. Download the app: go to **github.com/patrgunther-spec/knowpg.com**, switch to branch **claude/location-friend-notifications-i0uaD**, click green **Code** button → **Download ZIP**, unzip, drag the inner **PopIn** folder to your **Downloads**
3. On your iPhone, install **Expo Go** from the App Store (free)

---

## Every time you want to run the app

1. Open **Terminal** (Command+Space → type "Terminal" → Enter)
2. Copy and paste this whole line and hit Enter:

```
cd ~/Downloads/PopIn && ulimit -n 65536 && npm install && npm start
```

3. Wait ~60 seconds. A **QR code** appears in Terminal.
4. On your iPhone, open the **Camera app** (not Expo Go).
5. Point it at the QR code on your Mac screen.
6. Tap the yellow **"Open in Expo Go"** banner that pops up.
7. Wait 30-60 seconds. The app loads. Done.

---

## Using Pop In

- **First time:** Type your name → tap "Let's Go"
- **Send a pop:** Tap the big blue 📡 Pop In button → type where you're going → Send
- **View your pop:** Tap it in the feed to see a map + chat
- **Friends tab:** Shows your unique friend code — share it with friends

---

## Troubleshooting

**"command not found: npm"** → Restart your Mac after installing Node.js.

**QR code doesn't work / iPhone can't connect** → Make sure your iPhone and Mac are on the **same Wi-Fi network**. Turn off any VPN.

**"Development build: Unable to get the default URI scheme"** → You're running the wrong command. Use the exact command above — `npm start` now forces Expo Go mode automatically.

**"EMFILE: too many open files"** → Already handled by `ulimit -n 65536` in the command above.

**App shows an error screen** → In Terminal press Ctrl+C to stop, then paste the command again.

**Still broken?** Close Terminal completely, open a fresh Terminal window, and paste the command again.
