# Trip Planner

Two-person trip itinerary planner (Next.js App Router + Prisma/Postgres), implementing the "Kyoto & Osaka" design exported from Claude Design.

## Prerequisites

- Node.js 20+
- A PostgreSQL database (local install, Docker, or a hosted provider like Neon/Supabase/Railway)

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file in this directory with your database connection string:

   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/trip_planner?schema=public"
   ```

3. Generate the Prisma client (output is gitignored, so this is required after every fresh clone):

   ```bash
   npx prisma generate
   ```

4. Apply migrations and seed the demo trip (8 days, activities, bookings, saved places, expenses):

   ```bash
   npx prisma migrate deploy
   npx prisma db seed
   ```

   The seed script also creates two login accounts: an initial admin account and a second
   regular/test-user account. The admin account is configurable via optional env vars (set
   before running the seed), each falling back to a default if unset:

   - `ADMIN_EMAIL` (default `tristan@example.com`)
   - `ADMIN_USERNAME` (default `Tristan`)
   - `ADMIN_PASSWORD` (default `ChangeMe123!`)

   With the defaults, you can log in as:

   - Admin: `tristan@example.com` / `ChangeMe123!`
   - Test user: `testuser@example.com` / `TestUser123!`

5. Start the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## VSCode

No special config is required. The Prisma extension (`Prisma.prisma`) gives syntax highlighting/formatting for `prisma/schema.prisma` if you install it.

## Scripts

- `npm run dev` — start the dev server (Turbopack)
- `npm run build` — production build
- `npm run start` — run the production build
- `npm run lint` — ESLint
- `npx prisma studio` — browse/edit the database in a GUI

## Deploying

Point `DATABASE_URL` at your hosted Postgres instance, run `npx prisma migrate deploy` once against it, then deploy the app (e.g. to Vercel). The app has user accounts with auth and roles (Admin / User, and per-trip Leader / Member) — see the Setup section above for the seeded login credentials.
