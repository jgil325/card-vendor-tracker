# Stack — the card vendor workspace

A complete redesign of Card Vendor Tracker: a collection-first workspace for Pokémon and One Piece vendors, built with React, TypeScript, Vite, and Supabase.

The public experience opens directly into an interactive demo. Its fictional collection, transactions, and prices are stored only in the visitor’s browser. A separate sign-in opens the existing private Supabase workspace.

## Run locally

```bash
npm install
npm run dev
```

The demo works without environment variables. To enable private sign-in, copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. These must be frontend-safe publishable credentials; never use a service-role key in the frontend.

Open `/?workspace=private` to enter the sign-in flow directly. Section URLs such as `/#inventory`, `/#grading`, and `/#sales` are linkable and support browser back/forward navigation.

## What’s inside

- **Overview:** collection value and cost-based gain, stock, realized card profit, transaction-based sales charts, collection highlights, recent sales, and allocation by game.
- **Inventory:** a visual gallery and compact table, game/type filters, search, value/name/cost sorting, card details, editable market values and notes, and CSV export of the filtered inventory.
- **Sales:** channel-aware fee defaults, stock checks, fee overrides, shipping and supply costs, and editable fulfillment status. Cancelling or returning a sale restores its stock; draft sales do not affect stock or realized profit.
- **Purchases and expenses:** searchable records and validated entry forms with save and error feedback.
- **Grading:** submission cards, progress stages, cost tracking, editable status, returned date, grade, and certificate.
- **Import:** drag-and-drop Card Ladder CSV preview, totals, row validation, duplicate checks, and protection against repeated confirmation.
- **Settings:** channel fee presets and a demo reset. Fees are entered as percentages, rather than decimal fractions.
- **Shared controls:** global search (`⌘K` / `Ctrl+K`), workspace updates, contextual help, mobile navigation, keyboard-accessible dialogs, focus indicators, and reduced-motion support.

Market prices are entered manually or imported. There is no live pricing API. Realized card profit deducts platform fees, fulfillment, supplies, and card/grading cost; operating expenses are tracked separately.

## Design research

The redesign combines card imagery and collection navigation with a quiet, readable financial workspace. Research references:

- [Collectr collection tracking](https://www.getcollectr.com/track.html): portfolio value, product filters, and meaningful collection highlights.
- [Card Ladder valuation guidance](https://cardladder.zendesk.com/hc/en-us/articles/11943952536855-How-can-I-find-the-value-of-a-card): distinguish user-entered values and sales-based valuation.
- [Origin investment overview on Mobbin](https://mobbin.com/screens/3a516cce-bf0f-4eb8-90d7-1625e5d49c32) and [Copilot investment overview on Mobbin](https://mobbin.com/screens/a3ae024a-fbc1-496b-8886-79a39e97acb4): restrained navigation, clear numerical hierarchy, and focused charts.

The visual system uses Manrope and DM Sans, a warm neutral canvas, olive ink, a terracotta action color, and consistent card photography. Artwork attribution is recorded in [public/cards/README.md](public/cards/README.md).

## Verification

```bash
npm run lint
npm run test
npm run test:e2e
npm run build
```

Unit tests cover financial calculations, CSV normalization, stock protections, cancellation/reactivation, duplicate protection, persistence, and storage failures. Browser tests exercise the main workflows on desktop Chromium and a mobile viewport.

Supabase RLS integration coverage is opt-in. Provide `SUPABASE_TEST_URL`, `SUPABASE_TEST_ANON_KEY`, `SUPABASE_TEST_EMAIL`, and `SUPABASE_TEST_PASSWORD` to run it. Local demo tests do not establish production database or account acceptance.

## Private database and imports

The existing migration at `supabase/migrations/202605150001_initial_schema.sql` creates the inventory, purchases, sales, grading, expenses, fee presets, and import tables. Row-level security restricts records to `auth.uid() = owner_id`.

For a single-owner deployment, create the owner in Supabase Auth and disable public signups. The redesign uses the existing schema and does not require a migration.

Private seed tooling remains available:

```bash
npm run seed:from-csv -- "/path/to/Collection - Card Ladder.csv"
npm run seed:verify
npm run db:seed
npm run db:verify
```

Generated private seed data and administrator credentials belong only in ignored `data/private/` files. The UI checks stock against the current loaded snapshot; simultaneous changes from multiple clients require server-side stock enforcement. Supabase imports retain the existing multi-request insertion path, so production batch import is not an atomic transaction.

## Deploy

`npm run build` produces `dist/`. The existing `vercel.json` config supports Vercel hosting. Add the frontend-safe Supabase variables to the deployment environment if private sign-in is needed; otherwise the site runs as a standalone portfolio demo.
