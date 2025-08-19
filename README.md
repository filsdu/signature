# Signature Shard (Supabase Realtime)

## Quick start
1) Install Node.js LTS from nodejs.org
2) Unzip this project and open a terminal here.
3) Create a `.env` file (already included) with your Supabase URL + anon key.
4) In Supabase SQL Editor, run `supabase.sql` from this folder once.
5) Install and run:
   ```bash
   npm install
   npm run dev
   ```
6) Open the URL shown (e.g. http://localhost:5173). Try in two tabs to see realtime.

## Deploy
- **Netlify**: set env variables VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Site Settings → Build & deploy → Environment, build with `npm run build`, publish `dist`.
- **Vercel**: import repo, add same env vars in Project Settings → Environment Variables.

## Notes
- This is a public demo. For production, add Auth and tighten RLS policies.
