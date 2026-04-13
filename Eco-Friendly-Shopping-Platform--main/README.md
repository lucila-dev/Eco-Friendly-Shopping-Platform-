# Eco-Friendly Shopping Platform

A React + Supabase web app for sustainable shopping: product catalog with sustainability scores, reviews, cart, mock checkout, and a user dashboard with green impact tracking.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Supabase** (you must create the project in your account)
   - Go to [supabase.com](https://supabase.com) and sign in (or create an account).
   - Click **New project**.
   - Choose your organization, set a **Project name** (e.g. `eco-shop`), set a **Database password** (save it somewhere safe), and pick a **Region** close to you. Click **Create new project**.
   - Wait until the project is ready, then open **Project Settings** (gear icon) → **API**. Copy:
     - **Project URL** → use as `VITE_SUPABASE_URL`
     - **anon public** key → use as `VITE_SUPABASE_ANON_KEY`
   - In the dashboard, go to **SQL Editor** → **New query**. Paste and run the full contents of `supabase/migrations/001_initial_schema.sql`, then run `supabase/seed.sql`.
   - (Optional) Under **Storage**, create a bucket named `product-images` if you want to upload product images later; the seed uses external image URLs.
   - **Admin:** To let an administrator add/edit/remove products, run `supabase/migrations/002_admin_products.sql` in the SQL Editor. Then set a user as admin: `UPDATE profiles SET role = 'admin' WHERE id = 'your-user-uuid';` (find the UUID in Authentication → Users).

3. **Environment**
   - Copy `.env.example` to `.env` and set:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`

4. **Run the app**
   ```bash
   npm run dev
   ```

## Scripts

- `npm run dev` – start dev server
- `npm run build` – production build
- `npm run preview` – preview production build
