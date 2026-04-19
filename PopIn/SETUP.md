# Pop In — Run on Your iPhone

**No QR codes. No Chrome. Just sign in once, tap the project.**

---

## One-time setup

### 1. Install Node.js on Mac
Go to **nodejs.org** → click the big green Download button → open the file → click Continue/Install → restart Mac.

### 2. Make a free Expo account
Go to **expo.dev/signup** → sign up with email (takes 30 seconds). Remember your **username** and **password**.

### 3. Install Expo Go on iPhone
Open the App Store → search **Expo Go** → install (free). Open it and **sign in with your Expo account** (same one from step 2).

### 4. Download the app code
Go to **github.com/patrgunther-spec/knowpg.com** → click the branch dropdown → select **claude/location-friend-notifications-i0uaD** → green **Code** button → **Download ZIP** → unzip it → drag the inner **PopIn** folder to your **Downloads**.

---

## Every time you want to run the app

1. Open **Terminal** (Command+Space → type "Terminal" → Enter).
2. Paste this whole line and hit Enter:

```
cd ~/Downloads/PopIn/PopIn && ulimit -n 65536 && npm install && npx expo login && npm start
```

3. The first time, it asks for your **Expo username** and **password** (from step 2 above). Type them in. (Next time it won't ask.)
4. Wait until you see "Metro waiting on..." in Terminal.
5. On your iPhone, open **Expo Go**.
6. You'll see **"Pop In"** listed under **"Development servers"** on the home screen. **Tap it.**
7. The app loads. Done.

---

## Using Pop In

- **First time:** Type your name → tap "Let's Go"
- **Send a pop:** Tap the big blue 📡 Pop In button → type where you're going → Send
- **View your pop:** Tap it in the feed to see a map + chat
- **Friends tab:** Shows your unique friend code

---

## Troubleshooting

**"command not found: npm"** → Restart your Mac after installing Node.js.

**Project doesn't show up in Expo Go** → Make sure your iPhone and Mac are on the **same Wi-Fi**. Turn off VPN. Make sure you're signed in with the **same Expo account** in Terminal and on Expo Go.

**Terminal asks for login every time** → That's fine, just type your username + password. (It should remember after the first time.)

**App shows an error screen** → In Terminal press Ctrl+C to stop, then paste the command again.

**Still broken?** Close Terminal completely, open a fresh window, paste the command again.
