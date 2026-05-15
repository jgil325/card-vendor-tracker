# Card Vendor Tracker

A private-data, public-code operating app for a Pokemon and One Piece card vendor. It tracks inventory, purchase lots, sales, grading, expenses, fee presets, and Card Ladder CSV imports with Supabase Auth and row-level security.

## Stack

- React, Vite, TypeScript
- Tailwind CSS via the Vite plugin
- Supabase Auth, Postgres, RLS, migrations
- Vitest unit tests and Playwright E2E tests
- Vercel-ready build config

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

If `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are empty, the app runs in local demo mode with safe fake records. Real inventory should live in Supabase or ignored local files only.

## Private Card Ladder Seed

The current Card Ladder export can be converted into an ignored development seed:

```bash
npm run seed:from-csv -- "/Users/jacobgil/Downloads/Collection - Card Ladder.csv"
npm run seed:verify
```

The generated file is `data/private/card-ladder-seed.json`, and `data/private/` is ignored by Git. The expected private seed totals are:

- Cost: `$7,000`
- Market value: `$8,219.66`
- Unrealized P/L: `$1,219.66`
- Units on hand: `4`

## Supabase

Apply the SQL in `supabase/migrations/202605150001_initial_schema.sql` to a Supabase project. It creates:

- `profiles`
- `inventory_items`
- `purchase_lots`
- `sales`
- `grading_submissions`
- `expenses`
- `fee_presets`
- `import_batches`
- `inventory_rollup` and `dashboard_summary` views

Every business row has `owner_id`, and RLS policies restrict CRUD to `auth.uid() = owner_id`.

For single-owner production use:

1. Create your account in Supabase Auth.
2. Disable public signups in Supabase Auth settings, or only allow your email/domain.
3. Add these Vercel environment variables:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

Do not use service-role keys in the frontend or commit `.env` files.

After a Supabase project is linked and private credentials exist in `data/private/supabase-admin.env`, seed and verify the remote database with:

```bash
npm run db:seed
npm run db:verify
```

## Tests

```bash
npm run test
npm run test:e2e
npm run build
```

Supabase integration coverage is env-gated. To run it, provide:

```bash
SUPABASE_TEST_URL=...
SUPABASE_TEST_ANON_KEY=...
SUPABASE_TEST_EMAIL=...
SUPABASE_TEST_PASSWORD=...
```

## Deploy

This repo is ready for Vercel:

```bash
npm run build
```

Use `dist` as the output directory. The included `vercel.json` sets this for Vercel automatically.
