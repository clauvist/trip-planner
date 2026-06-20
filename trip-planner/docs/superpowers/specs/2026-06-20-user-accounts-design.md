# User Accounts, Roles & Invites — Design

Date: 2026-06-20

## Overview

The app currently has no authentication: a single hardcoded trip ("Kyoto & Osaka") is shown to anyone who opens it, and a `Member` model (name + color) is used only to attribute expenses within a trip. This design adds real user accounts, two roles (`ADMIN`/`USER`), an admin-driven invite flow for onboarding new users (to the platform and/or specific trips), and a trip dashboard so a user can see every trip they have access to.

`Member` is removed entirely and replaced by a `User` ↔ `Trip` join (`TripMember`) — there is no more separate "member" concept; joining a trip *is* what grants view/edit access and expense-split participation.

## Data Model

```prisma
enum Role { ADMIN  USER }

model User {
  id           String   @id @default(cuid())
  username     String   @unique
  email        String   @unique
  passwordHash String
  role         Role     @default(USER)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  sessions    Session[]
  tripAccess  TripMember[]
  invitesSent Invite[]
}

model Session {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())
}

model TripMember {            // replaces Member — grants view+edit+expense participation
  id     String @id @default(cuid())
  tripId String
  trip   Trip   @relation(fields: [tripId], references: [id], onDelete: Cascade)
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  hue    Int
  order  Int

  expenses Expense[]
  @@unique([tripId, userId])
  @@index([tripId, order])
}

model Invite {
  id          String    @id @default(cuid())
  token       String    @unique
  email       String
  role        Role      @default(USER)
  tripIds     String[]            // Postgres scalar list — no join table needed
  expiresAt   DateTime
  usedAt      DateTime?
  usedById    String?
  createdById String
  createdBy   User      @relation(fields: [createdById], references: [id])
  createdAt   DateTime  @default(now())

  @@index([email])
}
```

- `Trip.members` becomes `TripMember[]` (renamed from `Member[]`).
- `Expense.paidById` now points to `TripMember` instead of `Member` (same shape, renamed target).
- The old `Member` model is deleted.

## Sessions & Password Hashing

- Passwords are hashed with `bcryptjs` (pure JS, no native build step — relevant on this Windows dev box) before storage. Plaintext passwords are never logged or stored.
- A session is a random opaque token (32 bytes, base64url) stored both as `Session.token` and as the cookie value (`httpOnly`, `secure` in production, `sameSite=lax`, ~30-day expiry). No JWT/signing library is used — the token's entropy plus cookie flags is the standard approach (this is how Rails/Django/Laravel sessions work), and it keeps revocation as simple as deleting the DB row (needed once admins can deactivate/edit other users).
- `src/lib/dal.ts` is the Data Access Layer, the single place auth state is read:
  - `getCurrentUser()` — cached per-request via React `cache()`; reads the cookie, looks up `Session` + `User` in Postgres, checks expiry, returns the user or `null`.
  - `requireUser()` — calls `getCurrentUser()`, redirects to `/login` if absent.
  - `requireAdmin()` — calls `requireUser()`, redirects/blocks if `role !== ADMIN`.
  - `requireTripAccess(tripId)` — calls `requireUser()`, checks a `TripMember` row exists for `(userId, tripId)`.
  - `createSession(userId)` / `deleteSession()` — used by login/logout.

## Route Protection (`proxy.ts`)

Next.js 16 renamed `middleware.ts` to `proxy.ts`, and it now defaults to the Node.js runtime (confirmed against this project's installed Next.js docs), so it *could* query Postgres directly. Next's own guidance is still to keep `proxy.ts` doing only a cheap "is there a session cookie at all" redirect, since it runs on every request including prefetches — the authoritative, DB-backed check happens in the DAL, called from Server Components and Server Actions. This design follows that recommended pattern: `proxy.ts` redirects anonymous requests to non-public routes to `/login`; everything else is enforced by `dal.ts` calls in pages/actions.

## Roles & Permissions

- **Admin**: full user management — create, edit, remove any user (username, email, role, password reset), manage which trips a user has access to, generate invites.
- **User**: can edit their own username/email/password; can view and edit any trip they have `TripMember` access to; cannot manage other users or generate invites.
- **Lockout safeguard**: an admin cannot delete or demote themselves if they are the last remaining admin.

## Invite Flow

1. Admin opens "Invite user," enters the invitee's email, picks a role (`ADMIN`/`USER`), and picks zero or more existing trips to grant access to.
2. A Server Action creates an `Invite` row (random token, 7-day expiry, single-use) and returns the shareable URL `/signup/[token]`. The admin copies/shares it manually — the app does not send email.
3. The invitee opens `/signup/[token]`. The page validates the token (exists, unexpired, unused) and shows a signup form with the email read-only (from the invite) plus username and password fields.
4. On submit, a Server Action re-validates the token, hashes the password, creates the `User` with the invite's `role`, creates a `TripMember` row for each trip in `tripIds` (auto-assigned hue/next order), marks the invite used (`usedAt`/`usedById`), creates a session, and redirects to the trip dashboard.
5. An expired/used/invalid token shows a plain error: "This invite link is invalid or has expired — ask your admin for a new one."
6. Outside of invites, an admin can also add/remove a user's access to any *existing* trip directly from the user-edit screen.
7. **Out of scope**: creating new trips. Invite/access UI only lists trips that already exist (today, just the one seeded trip).

## Pages & UI

- **`/login`** — email + password → `login` Server Action → creates session → redirect to `/trips` (or `?next=`).
- **`/trips`** — dashboard listing the trips the current user has `TripMember` access to.
- **`/trips/[slug]`** — the existing `TripApp` UI, now reached via a dynamic route (replacing the hardcoded `page.tsx`), guarded by `requireTripAccess(tripId)`.
- **`/`** — redirects to `/trips` if logged in, else `/login`.
- **`/account`** — self-service: edit own username/email, change password.
- **`/admin/users`** — admin-only: list/create/edit/remove users, manage per-user trip access, "Invite user" action.
- **`/signup/[token]`** — public invite-redemption page.
- **`Header.tsx`** — gains the current username, a logout button, and an "Admin" link visible only to admins.

**Existing-code impact**: `MemberRecord` (`src/lib/trip.ts`) changes shape from `{ name, hue, order }` to `{ user: { username }, hue, order }`. Components currently reading `member.name` (expense rows, member-color legend) need a one-line change to `member.user.username`. No other UI rework is needed.

## Validation Rules

- **Username**: 3–30 characters, letters/numbers/underscore/hyphen only.
- **Password**: minimum 8 characters. No additional complexity rules (matches the personal-use, low-attack-surface nature of this app).
- **Email**: standard email format validation; uniqueness enforced at the DB level (`@unique`).

## Migrating Existing Data

The current `Member` rows ("Tristan", "Tris") are dev seed data only — nothing to preserve in production. `Member` is dropped and the new tables are added via a new Prisma migration (`prisma migrate dev`), applied on top of the existing migration history — not a full reset. `prisma/seed.ts` is rewritten to:

- Create **"Tristan"** as the initial **admin** account (from `ADMIN_EMAIL`/`ADMIN_USERNAME`/`ADMIN_PASSWORD` env vars) — bootstraps the platform, since there's no admin yet to send an invite.
- **Not** recreate "Tris."
- Create **"TestUser"** as a generic regular-user account, seeded as the second `TripMember` on "Kyoto & Osaka," taking over the hue/order/expenses previously attributed to "Tris" — so the demo trip still has two participants for testing expense-splitting and role-gating.

This wipes and regenerates the current seeded demo data, which is expected and fine for a dev-only database.

## Error Handling

- Login failure: generic "Invalid email or password" (don't reveal which field was wrong).
- Invite link expired/used/invalid: clear, specific message (see Invite Flow step 5).
- Duplicate email/username on signup or admin-create: friendly message instead of a raw constraint error.
- Expired session: redirect to `/login` rather than throwing.
- A user whose trip access is revoked mid-session is blocked the next time they load that trip's page (re-checked server-side on every navigation; no special-case handling needed).

## Testing

No test runner is configured in this repo today, and this design doesn't introduce one wholesale — but password hashing, session validation, and invite-token validation are exactly the kind of logic where an untested bug is a security bug. A minimal `vitest` setup is added, scoped to the new `src/lib/auth*`/`dal.ts` logic:

- Password hash/verify round-trip.
- Session create/validate/expire.
- Invite validate/expire/consume (including the single-use guarantee).
- Permission guards (`requireUser`/`requireAdmin`/`requireTripAccess`) for allow/deny cases.

Everything else (forms, pages, navigation) is verified manually end-to-end: login, invite→signup, admin user management, role gating, trip-access revocation — consistent with how the rest of the app is tested today.
