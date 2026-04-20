# Pop In — Web

Browser version of Pop In. Same Supabase backend as the native app.

## Deploy (2 clicks + 1 paste)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fpatrgunther-spec%2Fknowpg.com&root-directory=PopIn-web&env=NEXT_PUBLIC_SUPABASE_ANON_KEY&envDescription=Your%20Supabase%20publishable%20key%20(sb_publishable_...)&project-name=pop-in-web&framework-preset=nextjs)

1. Click the button above → sign in with GitHub
2. Paste your `sb_publishable_...` key when prompted
3. Click **Deploy**

Share the URL with friends. Done.

## Develop locally

```
cd PopIn-web
npm install
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_..." > .env.local
npm run dev
```
