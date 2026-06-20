# User Accounts, Roles & Invites — Design

Date: 2026-06-20

## Overview

The app currently has no authentication: a single hardcoded trip ("Kyoto & Osaka") is shown to anyone who opens it, and a `Member` model (name + color) is used only to attribute expenses within a trip. This design adds real user accounts, an admin-driven invite flow for onboarding new users (to the platform and/or specific trips), and a trip dashboard so a user can see every trip they have access to.

Permissions are split across two independent tiers:
- **Platform role** (`User.role`): `ADMIN` or `USER` — platform-wide user management.
- **Trip role** (`TripMember.tripRole`): `LEADER` or `MEMBER` — per-trip administrative control, scoped to one trip at a time.

These are independent *grants*: being a platform Admin doesn't automatically create a `TripMember` row (let alone a `LEADER` one) for any given trip, and being a Trip Leader doesn't grant platform Admin rights. A user can be a Trip Leader on one trip and a plain Member on another. For *authorization checks*, though, Admin remains a superset — an Admin can do anything a Trip Leader can, for any trip, without needing an explicit `LEADER` row (see Roles & Permissions).

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

enum TripRole { LEADER  MEMBER }

model TripMember {            // replaces Member — grants view+edit+expense participation
  id       String   @id @default(cuid())
  tripId   String
  trip     Trip     @relation(fields: [tripId], references: [id], onDelete: Cascade)
  userId   String
  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  tripRole TripRole @default(MEMBER)
  hue      Int
  order    Int

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
  - `requireTripLeader(tripId)` — calls `requireTripAccess(tripId)`, passes if the user's platform `role` is `ADMIN` **or** their `TripMember.tripRole` for that trip is `LEADER`; redirects/blocks otherwise.
  - `createSession(userId)` / `deleteSession()` — used by login/logout.

## Route Protection (`proxy.ts`)

Next.js 16 renamed `middleware.ts` to `proxy.ts`, and it now defaults to the Node.js runtime (confirmed against this project's installed Next.js docs), so it *could* query Postgres directly. Next's own guidance is still to keep `proxy.ts` doing only a cheap "is there a session cookie at all" redirect, since it runs on every request including prefetches — the authoritative, DB-backed check happens in the DAL, called from Server Components and Server Actions. This design follows that recommended pattern: `proxy.ts` redirects anonymous requests to non-public routes to `/login`; everything else is enforced by `dal.ts` calls in pages/actions.

## Roles & Permissions

**Platform role** (`User.role`):
- **Admin**: full user management — create, edit, remove any user (username, email, role, password reset), manage which trips a user has access to, generate invites for any trip. Also implicitly has Trip Leader-level rights on *every* trip (see below), without needing an explicit `LEADER` row.
- **User**: can edit their own username/email/password; can view and edit any trip they have `TripMember` access to; cannot manage other users or generate platform-wide invites.
- **Lockout safeguard**: an admin cannot delete or demote themselves if they are the last remaining admin — there's no higher authority to recover from a zero-admin state.

**Trip role** (`TripMember.tripRole`), scoped to one trip:
- **Leader**: in addition to ordinary Member rights (view/edit trip content, expense participation), a Leader can: generate invite links scoped to this trip, remove another user's access to this trip, edit this trip's details (name, start date), and promote/demote other members of this trip to/from Leader. A trip can have any number of Leaders at once.
- **Member**: the default — view/edit trip content and participate in expenses, no trip-administration rights.
- **No lockout safeguard for Trip Leader**: unlike platform Admin, a trip can safely end up with zero Leaders — a platform Admin is always available as a fallback to manage any trip, so there's no need to block someone from demoting themselves or the trip's last Leader.

## Invite Flow

There are two invite-creation paths, both producing the same kind of `Invite` row and `/signup/[token]` redemption experience — they differ only in who can trigger them and how scoped the result is.

**Admin-issued invite** (platform-wide, from `/admin/users`):
1. Admin opens "Invite user," enters the invitee's email, picks a role (`ADMIN`/`USER`), and picks zero or more existing trips to grant access to.
2. A Server Action creates the `Invite` row (random token, 7-day expiry, single-use) and returns the shareable URL `/signup/[token]`.

**Trip-Leader-issued invite** (scoped, from the trip's own management page, `/trips/[slug]/manage`):
1. A Trip Leader (or Admin) enters an email for someone to invite to *this trip only*.
2. The Server Action (`createTripInvite(tripId, email)`) creates the `Invite` row with `role` hardcoded to `USER` and `tripIds` hardcoded to `[tripId]` — a Trip Leader can never grant platform Admin rights or access to a trip they don't lead, by construction rather than by runtime validation alone.

**Shared redemption flow:**
3. The invite link is copied/shared manually by whoever created it — the app does not send email.
4. The invitee opens `/signup/[token]`. The page validates the token (exists, unexpired, unused) and shows a signup form with the email read-only (from the invite) plus username and password fields.
5. On submit, a Server Action re-validates the token, hashes the password, creates the `User` with the invite's `role`, creates a `TripMember` row for each trip in `tripIds` (auto-assigned hue/next order, `tripRole` defaults to `MEMBER`), marks the invite used (`usedAt`/`usedById`), creates a session, and redirects to the trip dashboard.
6. An expired/used/invalid token shows a plain error: "This invite link is invalid or has expired — ask your admin for a new one."
7. Outside of invites: an Admin can add/remove a user's access to any *existing* trip from the user-edit screen; a Trip Leader can remove a user's access to *their own* trip from `/trips/[slug]/manage`.
8. **Out of scope**: creating new trips. Invite/access UI only lists trips that already exist (today, just the one seeded trip).

## Pages & UI

- **`/login`** — email + password → `login` Server Action → creates session → redirect to `/trips` (or `?next=`).
- **`/trips`** — dashboard listing the trips the current user has `TripMember` access to.
- **`/trips/[slug]`** — the existing `TripApp` UI, now reached via a dynamic route (replacing the hardcoded `page.tsx`), guarded by `requireTripAccess(tripId)`.
- **`/trips/[slug]/manage`** — trip-level admin panel, guarded by `requireTripLeader(tripId)`: lists this trip's members with remove / promote-to-Leader / demote-from-Leader actions, plus an "Invite to this trip" action (the scoped invite flow above). Linked from the trip page, visible only to that trip's Leaders and to platform Admins.
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

- Create **"Tristan"** as the initial **admin** account (from `ADMIN_EMAIL`/`ADMIN_USERNAME`/`ADMIN_PASSWORD` env vars) — bootstraps the platform, since there's no admin yet to send an invite. Tristan's `TripMember` row on "Kyoto & Osaka" is seeded with `tripRole: LEADER`, per this design's requirement that Tristan hold both the platform Admin role and the Trip Leader role for the existing trip.
- **Not** recreate "Tris."
- Create **"TestUser"** as a generic regular-user account, seeded as the second `TripMember` on "Kyoto & Osaka" (`tripRole: MEMBER`, the default), taking over the hue/order/expenses previously attributed to "Tris" — so the demo trip still has two participants for testing expense-splitting and role-gating (including Leader vs. Member trip-management access).

This wipes and regenerates the current seeded demo data, which is expected and fine for a dev-only database.

## Error Handling

- Login failure: generic "Invalid email or password" (don't reveal which field was wrong).
- Invite link expired/used/invalid: clear, specific message (see Invite Flow step 6).
- Duplicate email/username on signup or admin-create: friendly message instead of a raw constraint error.
- Expired session: redirect to `/login` rather than throwing.
- A user whose trip access is revoked mid-session is blocked the next time they load that trip's page (re-checked server-side on every navigation; no special-case handling needed).

## Testing

No test runner is configured in this repo today, and this design doesn't introduce one wholesale — but password hashing, session validation, and invite-token validation are exactly the kind of logic where an untested bug is a security bug. A minimal `vitest` setup is added, scoped to the new `src/lib/auth*`/`dal.ts` logic:

- Password hash/verify round-trip.
- Session create/validate/expire.
- Invite validate/expire/consume (including the single-use guarantee).
- Permission guards (`requireUser`/`requireAdmin`/`requireTripAccess`/`requireTripLeader`) for allow/deny cases, including that platform Admins pass `requireTripLeader` for trips they have no `TripMember` row on at all.
- Trip-Leader-issued invites always produce `role: USER` and `tripIds: [tripId]`, regardless of what the caller passes in.

Everything else (forms, pages, navigation) is verified manually end-to-end: login, invite→signup, admin user management, role gating, trip-access revocation — consistent with how the rest of the app is tested today.
