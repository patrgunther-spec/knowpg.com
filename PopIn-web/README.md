# Pop In — Web

Browser version of Pop In. Same Supabase backend as the native app.

## Deploy to Vercel (5 min, one time)

1. Push this repo to GitHub.
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import this repo.
3. **Root Directory:** `PopIn-web`
4. **Environment Variables:**
   - `NEXT_PUBLIC_SUPABASE_URL` → your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → your publishable key
5. **Deploy.** You'll get a URL like `popin-xxxxx.vercel.app`.

That's it. Share the URL with friends — they open it in Safari and use it immediately.

## Develop locally

```
cd PopIn-web
npm install
cp .env.example .env.local
# edit .env.local with your Supabase values
npm run dev
```

Open http://localhost:3000.
