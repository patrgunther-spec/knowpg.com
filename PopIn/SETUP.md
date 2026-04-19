# Pop In — Beta Setup

**You're going online. This takes ~10 minutes. All copy/paste. No coding.**

---

## Step 1 — Create Supabase backend (5 min, one time)

Supabase is a free hosted database. This powers the chat, map, and bulletin.

1. Go to **supabase.com** → click **Start your project** → sign up with GitHub or email.
2. Click **New Project**. Fill in:
   - **Name:** `popin`
   - **Database password:** make one up, save it somewhere
   - **Region:** pick the one closest to you
3. Click **Create Project**. Wait ~2 minutes while it provisions.
4. When it's ready, in the left sidebar click **SQL Editor** → **New query**.
5. Open the file `supabase/schema.sql` from your PopIn folder (or from GitHub).
6. **Copy ALL of it, paste it into the SQL Editor, click RUN** (bottom right).
7. You should see "Success. No rows returned." Done with the database.

---

## Step 2 — Get your backend keys (1 min)

1. In Supabase, click the **gear icon** (Settings) in the left sidebar → **API**.
2. You'll see two things you need:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon public key** — a long string starting with `eyJ...`
3. Keep this page open.

---

## Step 3 — Connect the app to your backend (1 min)

1. In **Terminal**, run this to create your .env file:

```
cd ~/Downloads/PopIn/PopIn && cp .env.example .env && open -e .env
```

2. TextEdit opens. Replace the placeholder lines with your real values from Step 2:

```
EXPO_PUBLIC_SUPABASE_URL=https://YOUR-REAL-URL.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...YOUR-REAL-KEY...
```

3. Save the file (Command+S), close TextEdit.

---

## Step 4 — Run the app

Every time you want to start the app:

1. Open **Terminal**.
2. Paste this:

```
cd ~/Downloads/PopIn/PopIn && ulimit -n 65536 && npm install && npx expo start --go --lan --clear
```

3. Wait ~2 min first time, then ~30 sec thereafter. QR code appears.
4. On your iPhone, open **Expo Go** → your project **Pop In** appears on the home screen → tap it.

---

## What you can do in beta

- **Share your 6-character friend code** with your friends (from the Friends tab).
- **Your friends install the app** using this same setup (steps 3-4 only — they use YOUR Supabase URL and key so you're all on the same database).
- **Add each other** by code.
- **See each other live on the map** with status messages.
- **Chat** in the Inbox.
- **Post plans to the Bulletin** — everyone with the app sees them.

---

## To share with a friend

Send them:
1. The **SETUP.md** instructions (they skip Step 1 & 2 — just use your existing backend).
2. Your **`.env` file contents** (the two EXPO_PUBLIC lines).
3. The GitHub URL for the code (same branch: `claude/location-friend-notifications-i0uaD`).

They follow Step 3 (paste your keys) and Step 4 (run the app). They make their own handle + friend code, then you add each other.

---

## Troubleshooting

**"BACKEND NOT CONFIGURED" on app open** → Your `.env` file isn't being read. Make sure it's in `~/Downloads/PopIn/PopIn/` (not a parent folder) and the two lines start with exactly `EXPO_PUBLIC_`.

**Map doesn't show friends** → Friend needs to have opened the app, granted location permission, and set a status at least once.

**Chat doesn't work** → Make sure both you and the friend added each other (it's two-way).

**"command not found: npm"** → Restart your Mac after installing Node.js.

**"too many open files"** → Already handled by `ulimit -n 65536` in the command above.

**Stuck?** Ctrl+C in Terminal, close it, open a new Terminal, paste the Step 4 command again.
