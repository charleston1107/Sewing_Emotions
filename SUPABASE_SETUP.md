# Supabase setup

## 1. Run the database migration

Open the Supabase project dashboard, choose **SQL Editor**, create a new query, paste the complete contents of `supabase/migrations/001_sewing_emotions_foundation.sql`, and run it once.

The migration creates the account profile, character, and message tables; enables Row Level Security; adds ownership policies; and creates the private `emotion-characters` image bucket.

## 2. Configure authentication URLs

In **Authentication > URL Configuration**:

- Set the Site URL to the deployed Render URL when it is known.
- Add `http://localhost:8000/account.html` as a redirect URL for local development.
- Add `https://YOUR-RENDER-DOMAIN/account.html` as a redirect URL for production.

Do not use a wildcard production redirect unless there is a specific need for it.

## 3. Configure environment variables

Keep these in local `.env` and add the same values to the Render environment:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_PUBLISHABLE_KEY=your_publishable_key
```

The publishable key is deliberately returned to the browser by `/api/public-config`. Never put a Supabase secret or service-role key in that endpoint or in browser code.

## 4. Current scope

`account.html` supports creating an account, logging in, restoring a browser session, and logging out. Character records and messages are not uploaded yet; the existing character flow continues to use localStorage until the next migration step.
