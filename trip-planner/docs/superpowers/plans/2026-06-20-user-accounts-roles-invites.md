# User Accounts, Roles & Invites Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real user accounts (with platform Admin/User roles and per-trip Leader/Member roles), an admin/leader-driven invite flow, and a trip dashboard, replacing the single hardcoded no-auth trip view.

**Architecture:** Prisma `User`/`Session`/`TripMember`/`Invite` models back a custom DB-session auth layer (opaque token cookie + `src/lib/dal.ts` guards), enforced via a lightweight `proxy.ts` redirect plus per-page/action checks. `Member` is deleted; `TripMember` (User ↔ Trip join) is the new source of trip access, expense attribution, and per-trip Leader role.

**Tech Stack:** Next.js 16.2.9 (App Router, Server Actions, Proxy), React 19.2.4, Prisma 7.8.0 + `@prisma/adapter-pg`, PostgreSQL, `bcryptjs`, `vitest`.

**Spec:** `docs/superpowers/specs/2026-06-20-user-accounts-design.md`

## Global Constraints

- Next.js 16.2.9, React 19.2.4, Prisma 7.8.0 — do not change these versions.
- Password hashing: `bcryptjs` only (pure JS, no native build step). No JWT/session-signing library — sessions are opaque random tokens.
- Password rule: minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 number, 1 symbol.
- Username rule: 3–30 characters, letters/numbers/underscore/hyphen only.
- Session duration: 24 hours by default (browser-session cookie + DB backstop); 30 days if "remember me" is checked (persistent cookie). Never indefinite.
- Invite links: single-use, 7-day expiry, no email is sent by the app — the creator copies/shares the URL manually.
- `tsconfig.json` has `"strict": true` — all new code must satisfy strict TypeScript with no errors.
- Styling convention: inline `CSSProperties` objects only (no CSS modules/Tailwind). Reuse the existing palette: primary `#7c2d2d`; backgrounds `#f6f1ea` (page), `#fffdfa` (card); borders `#ece3d8`; text `#211b17` (primary), `#5f554c` (secondary), `#a09487` (tertiary).
- Path alias `@/*` maps to `./src/*` (tsconfig) — use it for all internal imports.
- Tests: `vitest`, scoped only to pure logic in `src/lib/*` (password complexity, session duration/expiry math, permission decisions, invite usability). No DB-touching integration tests — everything that needs Postgres is verified manually (Task 20).
- Server-side modules that touch cookies/sessions/DB secrets (`session.ts`, `dal.ts`, `invite.ts`) must start with `import "server-only";` so they can never be pulled into a client bundle.

---

### Task 1: Password hashing & complexity validation (+ test setup)

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/lib/password.ts`
- Test: `src/lib/password.test.ts`

**Interfaces:**
- Produces: `hashPassword(password: string): Promise<string>`, `verifyPassword(password: string, hash: string): Promise<boolean>` (used by Tasks 4, 10, 16, 17, 19), `validatePasswordComplexity(password: string): string | null` (used by Tasks 16, 17, 19 — note it lives in `password.ts`, not `validation.ts`).

- [ ] **Step 1: Install dependencies**

Run: `npm install bcryptjs` then `npm install -D @types/bcryptjs vitest`
Expected: `package.json` `dependencies` gains `bcryptjs`, `devDependencies` gains `@types/bcryptjs` and `vitest`.

- [ ] **Step 2: Add the test script**

In `package.json`, change:
```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
```
to:
```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run"
  },
```

- [ ] **Step 3: Create the vitest config**

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
  },
});
```

- [ ] **Step 4: Write the failing test**

Create `src/lib/password.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword, validatePasswordComplexity } from "./password";

describe("hashPassword / verifyPassword", () => {
  it("round-trips a correct password", async () => {
    const hash = await hashPassword("Correct1!");
    expect(await verifyPassword("Correct1!", hash)).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("Correct1!");
    expect(await verifyPassword("WrongPass1!", hash)).toBe(false);
  });
});

describe("validatePasswordComplexity", () => {
  it("accepts a password meeting all rules", () => {
    expect(validatePasswordComplexity("Correct1!")).toBeNull();
  });

  it("rejects a password under 8 characters", () => {
    expect(validatePasswordComplexity("Sh0rt!")).toMatch(/8 characters/);
  });

  it("rejects a password with no uppercase letter", () => {
    expect(validatePasswordComplexity("lowercase1!")).toMatch(/uppercase/);
  });

  it("rejects a password with no lowercase letter", () => {
    expect(validatePasswordComplexity("UPPERCASE1!")).toMatch(/lowercase/);
  });

  it("rejects a password with no number", () => {
    expect(validatePasswordComplexity("NoNumbers!")).toMatch(/number/);
  });

  it("rejects a password with no symbol", () => {
    expect(validatePasswordComplexity("NoSymbols1")).toMatch(/symbol/);
  });
});
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `npx vitest run src/lib/password.test.ts`
Expected: FAIL with "Cannot find module './password'" (file doesn't exist yet).

- [ ] **Step 6: Write the implementation**

Create `src/lib/password.ts`:
```ts
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function validatePasswordComplexity(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[a-z]/.test(password)) return "Password must contain a lowercase letter.";
  if (!/[A-Z]/.test(password)) return "Password must contain an uppercase letter.";
  if (!/[0-9]/.test(password)) return "Password must contain a number.";
  if (!/[^a-zA-Z0-9]/.test(password)) return "Password must contain a symbol.";
  return null;
}
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npx vitest run src/lib/password.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/lib/password.ts src/lib/password.test.ts
git commit -m "feat: add password hashing and complexity validation"
```

---

### Task 2: Username & email validation

**Files:**
- Create: `src/lib/validation.ts`
- Test: `src/lib/validation.test.ts`

**Interfaces:**
- Produces: `validateUsername(username: string): string | null`, `validateEmail(email: string): string | null` — used by Tasks 16, 17, 19.

- [ ] **Step 1: Write the failing test**

Create `src/lib/validation.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { validateUsername, validateEmail } from "./validation";

describe("validateUsername", () => {
  it("accepts a valid username", () => {
    expect(validateUsername("Tristan_1")).toBeNull();
  });

  it("rejects a username under 3 characters", () => {
    expect(validateUsername("ab")).toMatch(/3-30/);
  });

  it("rejects a username over 30 characters", () => {
    expect(validateUsername("a".repeat(31))).toMatch(/3-30/);
  });

  it("rejects a username with invalid characters", () => {
    expect(validateUsername("bad name!")).toMatch(/letters, numbers/);
  });
});

describe("validateEmail", () => {
  it("accepts a valid email", () => {
    expect(validateEmail("person@example.com")).toBeNull();
  });

  it("rejects a missing @", () => {
    expect(validateEmail("personexample.com")).toMatch(/valid email/);
  });

  it("rejects a missing domain", () => {
    expect(validateEmail("person@")).toMatch(/valid email/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/validation.test.ts`
Expected: FAIL with "Cannot find module './validation'".

- [ ] **Step 3: Write the implementation**

Create `src/lib/validation.ts`:
```ts
export function validateUsername(username: string): string | null {
  if (username.length < 3 || username.length > 30) {
    return "Username must be 3-30 characters.";
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return "Username can only contain letters, numbers, underscores, and hyphens.";
  }
  return null;
}

export function validateEmail(email: string): string | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Enter a valid email address.";
  }
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/validation.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/validation.ts src/lib/validation.test.ts
git commit -m "feat: add username and email validation"
```

---

### Task 3: Prisma schema migration — User, Session, TripMember, Invite

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: `User`, `Session`, `TripMember`, `Invite` Prisma models, `Role`/`TripRole` enums, generated client types at `@/generated/prisma/client` and `@/generated/prisma/browser` — used by every later task.
- Removes: `Member` model (no consumers should reference it after this task).

- [ ] **Step 1: Replace the schema file**

Replace the full contents of `prisma/schema.prisma` with:
```prisma
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

enum Role {
  ADMIN
  USER
}

enum TripRole {
  LEADER
  MEMBER
}

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

  @@index([userId])
}

model Invite {
  id          String    @id @default(cuid())
  token       String    @unique
  email       String
  role        Role      @default(USER)
  tripIds     String[]
  expiresAt   DateTime
  usedAt      DateTime?
  usedById    String?
  createdById String
  createdBy   User      @relation(fields: [createdById], references: [id])
  createdAt   DateTime  @default(now())

  @@index([email])
}

model Trip {
  id        String   @id @default(cuid())
  slug      String   @unique
  name      String
  startDate DateTime @db.Date
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  members     TripMember[]
  days        Day[]
  bookings    Booking[]
  savedPlaces SavedPlace[]
  expenses    Expense[]
}

model TripMember {
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

model Day {
  id     String @id @default(cuid())
  tripId String
  trip   Trip   @relation(fields: [tripId], references: [id], onDelete: Cascade)
  title  String
  order  Int

  activities Activity[]

  @@index([tripId, order])
}

enum ActivityLabel {
  EARLY_MORNING
  MORNING
  COFFEE
  LUNCH
  AFTERNOON
  DINNER
  EVENING
  LATE_EVENING
  TRANSIT
}

model Activity {
  id    String        @id @default(cuid())
  dayId String
  day   Day           @relation(fields: [dayId], references: [id], onDelete: Cascade)
  order Int

  label ActivityLabel
  time  String        @default("")
  title String
  place String        @default("")
  note  String        @default("")
  ref   String        @default("")
  done  Boolean       @default(false)

  @@index([dayId, order])
}

model Booking {
  id        String  @id @default(cuid())
  tripId    String
  trip      Trip    @relation(fields: [tripId], references: [id], onDelete: Cascade)
  groupName String
  order     Int
  icon      String
  title     String
  sub       String
  ref       String
  tbc       Boolean @default(false)

  @@index([tripId, order])
}

enum SavedCategory {
  FOOD
  SIGHT
  SHOP
}

model SavedPlace {
  id       String        @id @default(cuid())
  tripId   String
  trip     Trip          @relation(fields: [tripId], references: [id], onDelete: Cascade)
  order    Int
  name     String
  category SavedCategory
  note     String

  @@index([tripId, order])
}

model Expense {
  id        String     @id @default(cuid())
  tripId    String
  trip      Trip       @relation(fields: [tripId], references: [id], onDelete: Cascade)
  order     Int
  item      String
  amountYen Int
  paidById  String
  paidBy    TripMember @relation(fields: [paidById], references: [id])

  @@index([tripId, order])
}
```

- [ ] **Step 2: Generate and apply the migration**

Run: `npx prisma migrate dev --name add_users_roles_invites`
Expected: Prisma reports a new migration created under `prisma/migrations/`, applies it, and regenerates the client. It will print a warning that the `Member` table is being dropped — this is expected (Task 4 reseeds equivalent data as `User`/`TripMember`).

If the command appears to hang waiting for interactive confirmation, run instead:
```bash
npx prisma migrate dev --name add_users_roles_invites --create-only
npx prisma migrate deploy
```

- [ ] **Step 3: Verify the migration applied cleanly**

Run: `npx prisma migrate status`
Expected: "Database schema is up to date!"

- [ ] **Step 4: Verify the TypeScript project still compiles (errors expected, but not from the schema itself)**

Run: `npx tsc --noEmit`
Expected: Errors in `src/lib/trip.ts`, `prisma/seed.ts`, `src/app/components/Header.tsx`, `src/app/components/ExpensesTab.tsx` referencing the now-removed `Member` type/`members.name`/`paidBy.name` — these are fixed in Tasks 4, 9, 10. No errors should reference `prisma/schema.prisma` itself.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add User, Session, TripMember, Invite models; remove Member"
```

---

### Task 4: Rewrite the seed script

**Files:**
- Modify: `prisma/seed.ts`

**Interfaces:**
- Consumes: `hashPassword` from Task 1 (`src/lib/password.ts`).
- Produces: seeded `User` rows — admin `Tristan` (env `ADMIN_EMAIL`/`ADMIN_USERNAME`/`ADMIN_PASSWORD`, falling back to `tristan@example.com` / `Tristan` / `ChangeMe123!`) with `role: ADMIN` and `tripRole: LEADER` on "Kyoto & Osaka"; regular user `TestUser` (`testuser@example.com` / `TestUser123!`) with `role: USER` and `tripRole: MEMBER`. Used manually in Task 20 to log in.

- [ ] **Step 1: Replace the seed script**

Replace the full contents of `prisma/seed.ts` with:
```ts
import { prisma } from "../src/lib/prisma";
import { ActivityLabel, SavedCategory, Role, TripRole } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/password";

interface ActSeed {
  label: ActivityLabel;
  time?: string;
  title: string;
  place?: string;
  note?: string;
  ref?: string;
}

function a(
  label: ActivityLabel,
  time: string,
  title: string,
  place?: string,
  note?: string,
  ref?: string
): ActSeed {
  return { label, time, title, place, note, ref };
}

const DAYS: { title: string; acts: ActSeed[] }[] = [
  {
    title: "Arrival & East Kyoto",
    acts: [
      a(
        ActivityLabel.TRANSIT,
        "0125h–0910h",
        "Flight SIN → KIX (Peach MM774)",
        "Changi Airport → Kansai International Airport",
        "Low-cost overnight hop. Land 0910h.",
        "YND5R3"
      ),
      a(
        ActivityLabel.MORNING,
        "1000h",
        "Haruka Express to Kyoto Station; check in",
        "Kyoto Station",
        "~75 min, ¥3,060/pax. Hotel: OMO5 Gion Kyoto"
      ),
      a(
        ActivityLabel.COFFEE,
        "",
        "Kurasu Kyoto Stand",
        "552 Higashiaburanokojicho, Shimogyo Ward, Kyoto",
        "Pour-over specialists near station. 0730–1700h. Cash + card"
      ),
      a(
        ActivityLabel.AFTERNOON,
        "",
        "To-ji Temple — tallest wooden pagoda in Japan",
        "1 Kujocho, Minami Ward, Kyoto",
        "Spacious & calm vs crowded temples. 0800–1700h"
      ),
      a(
        ActivityLabel.DINNER,
        "",
        "Gion / Pontocho area — stroll & dinner",
        "Gion, Higashiyama Ward, Kyoto",
        "Atmospheric old streets; many izakaya & restaurants"
      ),
    ],
  },
  {
    title: "Arashiyama & Railway Museum",
    acts: [
      a(
        ActivityLabel.EARLY_MORNING,
        "",
        "Arashiyama Bamboo Forest",
        "Sagaogurayama Tabuchiyamacho, Ukyo Ward, Kyoto",
        "Free. Best early morning — gets very crowded mid-day"
      ),
      a(
        ActivityLabel.EARLY_MORNING,
        "",
        "Tenryu-ji Temple & garden",
        "68 Sagatenryuji Susukinobabacho, Ukyo Ward, Kyoto",
        "UNESCO site; pond garden. 0830–1700h"
      ),
      a(
        ActivityLabel.COFFEE,
        "",
        "% Arabica Kyoto Arashiyama",
        "Sagatenryuji Susukinobabacho 3-47, Ukyo Ward, Kyoto",
        "Iconic riverside espresso bar"
      ),
      a(
        ActivityLabel.AFTERNOON,
        "",
        "Kyoto Railway Museum",
        "Kankijicho, Shimogyo Ward, Kyoto",
        "CLOSED WEDNESDAYS. Steam loco rides. 1000–1700h"
      ),
      a(
        ActivityLabel.DINNER,
        "",
        "Kyoto Station area — ramen",
        "Kyoto Station Building, Shimogyo Ward, Kyoto",
        "Kyoto Ramen Koji on 10F"
      ),
    ],
  },
  {
    title: "Day trip to Uji",
    acts: [
      a(ActivityLabel.MORNING, "", "Head to Uji — matcha town", "Uji, Kyoto", "JR Nara Line, ~20–30 min"),
      a(
        ActivityLabel.MORNING,
        "",
        "Byodo-in Temple (the ¥10 coin temple)",
        "Renge-116 Uji, Kyoto",
        "UNESCO site. 0830–1730h"
      ),
      a(
        ActivityLabel.AFTERNOON,
        "",
        "Byodo-in Omotesando — historic tea-shop street",
        "Renge, Uji, Kyoto",
        "Centuries-old tea shops; matcha tastings. Most shops 1100–1700h"
      ),
      a(
        ActivityLabel.AFTERNOON,
        "",
        "Itoh Kyuemon — matcha sweets & tea",
        "Renge-31-1 Uji, Kyoto",
        "Matcha ice cream & parfaits. 0930–1730h"
      ),
      a(
        ActivityLabel.EVENING,
        "",
        "Fushimi Inari Taisha — torii gates",
        "68 Fukakusa Yabunouchicho, Fushimi Ward, Kyoto",
        "Free, open 24h. Go late, quieter"
      ),
    ],
  },
  {
    title: "Ryoan-ji & Nishiki → Osaka",
    acts: [
      a(
        ActivityLabel.COFFEE,
        "",
        "Goodman Roaster Kyoto",
        "Yadacho 115-2, Shimogyo Ward, Kyoto",
        "Flat white & carrot cake. Cash only. 0800–2030h"
      ),
      a(
        ActivityLabel.MORNING,
        "",
        "Ryoan-ji — famous Zen rock garden",
        "13 Ryoanji Goryonoshitacho, Ukyo Ward, Kyoto",
        "Calm, meditative. ¥600. 0800–1700h"
      ),
      a(
        ActivityLabel.LUNCH,
        "",
        "Nishiki Market — food-stall grazing",
        "Higashiuoyacho, Nakagyo Ward, Kyoto",
        "Many cash-only stalls; no eating-while-walking"
      ),
      a(ActivityLabel.TRANSIT, "", "Head to Osaka; check in", "Osaka", "~29 min via JR Special Rapid. Hotel TBC"),
    ],
  },
  {
    title: "Osaka Castle & Edo History",
    acts: [
      a(
        ActivityLabel.MORNING,
        "",
        "Osaka Castle & Park",
        "1-1 Osakajo, Chuo Ward, Osaka",
        "Peaceful early AM. 0900–1700h (last entry 1630)"
      ),
      a(
        ActivityLabel.COFFEE,
        "",
        "Cafe Tales — Honmachi",
        "Kyutaromachi 2-5-19, Chuo Ward, Osaka",
        "French toast highlight. 0800–1800h"
      ),
      a(
        ActivityLabel.AFTERNOON,
        "",
        "Osaka Museum of Housing & Living",
        "Tenjinbashi 6-4-20, Kita Ward, Osaka",
        "CLOSED TUESDAYS. Kimono rental option. 1000–1700h"
      ),
      a(
        ActivityLabel.EVENING,
        "",
        "Dotonbori / Shinsaibashi — dinner & lights",
        "Dotonbori, Chuo Ward, Osaka",
        "Takoyaki, okonomiyaki, neon"
      ),
    ],
  },
  {
    title: "Day Trip: Kobe",
    acts: [
      a(ActivityLabel.TRANSIT, "", "Travel to Kobe", "—", "JR Special Rapid (Kobe Line), ~22 min"),
      a(
        ActivityLabel.MORNING,
        "",
        "Nunobiki Herb Gardens & Ropeway",
        "Kitanocho 1-4-3, Chuo Ward, Kobe",
        "Ropeway by Shin-Kobe stn. 0930–1645h"
      ),
      a(
        ActivityLabel.MORNING,
        "",
        "Kitano Ijinkan — historic Western houses",
        "Kitanocho 2-3, Chuo Ward, Kobe",
        "Quiet streetscape + famous Starbucks. 0900–1700h"
      ),
      a(
        ActivityLabel.LUNCH,
        "",
        "Kobe beef teppanyaki (reserve ahead)",
        "Kitanagasadori 1-9-4, Chuo Ward, Kobe",
        "Kishokichi or Kobe Beef Amami. Wrap by ~1300h"
      ),
      a(
        ActivityLabel.AFTERNOON,
        "~1400h",
        "Maiko Marine Promenade & Akashi-Kaikyo Bridge",
        "Higashimaikocho 4-2051, Tarumi Ward, Kobe",
        "Glass walkway over sea. Till 1800h"
      ),
      a(
        ActivityLabel.AFTERNOON,
        "~1600h",
        "Kobe Harborland / umie",
        "Higashikawasakicho 1-7-2, Chuo Ward, Kobe",
        "Indoor mall, Ferris wheel. Till 2000h"
      ),
      a(ActivityLabel.TRANSIT, "", "Travel back to Osaka", "Osaka", "JR Special Rapid, ~22 min"),
    ],
  },
  {
    title: "Markets & teamLab",
    acts: [
      a(
        ActivityLabel.MORNING,
        "",
        "Kuromon Ichiba Market — seafood & street food",
        "Nipponbashi 2-4-1, Chuo Ward, Osaka",
        "Best before 1300h. 0900–1800h"
      ),
      a(
        ActivityLabel.COFFEE,
        "",
        "LiLo Coffee Roasters — Shinsaibashi",
        "Nishishinsaibashi 1-10-28, Chuo Ward, Osaka",
        "20+ beans; cash only. From 1100h"
      ),
      a(
        ActivityLabel.AFTERNOON,
        "",
        "Shinsaibashi-suji — last-minute shopping",
        "Shinsaibashisuji, Chuo Ward, Osaka",
        "Covered arcade — indoor, heat-friendly"
      ),
      a(
        ActivityLabel.EVENING,
        "~1945h",
        "teamLab Botanical Garden Osaka",
        "Nagaikoen 1-23, Higashisumiyoshi Ward, Osaka",
        "Book timed tickets"
      ),
    ],
  },
  {
    title: "Departure",
    acts: [
      a(ActivityLabel.MORNING, "", "Free morning — last coffee / packing", "Osaka", "—"),
      a(
        ActivityLabel.COFFEE,
        "",
        "Notequal Coffee — Honmachi",
        "Kyutaromachi 2-5-18, Chuo Ward, Osaka",
        "Customisable single-origin blends. From 0800h"
      ),
      a(
        ActivityLabel.AFTERNOON,
        "~1400h",
        "Transfer to Kansai Airport (KIX)",
        "Kansai International Airport",
        "~75 min from city + check-in"
      ),
      a(
        ActivityLabel.TRANSIT,
        "1825h–0005h+1",
        "Flight KIX → SIN (Peach MM773)",
        "Kansai International Airport → Changi Airport",
        "Booking ref: YND5R3. 6h40m",
        "YND5R3"
      ),
    ],
  },
];

const BOOKING_GROUPS = [
  {
    name: "Flights",
    items: [
      { icon: "✈", title: "Peach MM774", sub: "SIN → KIX · Jul 10 · 0125h", ref: "YND5R3", tbc: false },
      { icon: "✈", title: "Peach MM773", sub: "KIX → SIN · Jul 17 · 1825h", ref: "YND5R3", tbc: false },
    ],
  },
  {
    name: "Stays",
    items: [
      { icon: "◉", title: "OMO5 Gion Kyoto", sub: "Jul 10–13 · 3 nights · Kyoto", ref: "#HK29384", tbc: false },
      { icon: "◉", title: "Stay in Osaka", sub: "Jul 13–17 · 4 nights · Osaka", ref: "TBC", tbc: true },
    ],
  },
  {
    name: "Transport",
    items: [{ icon: "◈", title: "Rental car", sub: "Jul 12 · Uji day trip", ref: "#RC77210", tbc: false }],
  },
];

const SAVED_PLACES = [
  { name: "% Arabica Kyoto Arashiyama", cat: SavedCategory.FOOD, note: "Riverside espresso bar" },
  { name: "Kobe Beef Amami", cat: SavedCategory.FOOD, note: "Reserve ahead for teppanyaki" },
  { name: "Nunobiki Herb Gardens", cat: SavedCategory.SIGHT, note: "Ropeway up the mountain" },
  { name: "Shinsaibashi-suji", cat: SavedCategory.SHOP, note: "Covered arcade" },
  { name: "Kuromon Ichiba Market", cat: SavedCategory.FOOD, note: "Go before 1pm" },
];

const EXPENSES = [
  { item: "Haruka Express tickets", amt: 6120, by: "admin" },
  { item: "OMO5 Gion Kyoto (3 nights)", amt: 54000, by: "testuser" },
  { item: "Kobe beef lunch", amt: 18400, by: "admin" },
  { item: "teamLab tickets (×2)", amt: 6800, by: "testuser" },
  { item: "Rental car (1 day)", amt: 9500, by: "admin" },
];

async function main() {
  const slug = "kyoto-osaka";
  await prisma.trip.deleteMany({ where: { slug } });
  await prisma.user.deleteMany({ where: { username: { in: ["Tristan", "TestUser"] } } });

  const adminEmail = process.env.ADMIN_EMAIL ?? "tristan@example.com";
  const adminUsername = process.env.ADMIN_USERNAME ?? "Tristan";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "ChangeMe123!";
  const testUserEmail = "testuser@example.com";
  const testUserPassword = "TestUser123!";

  const admin = await prisma.user.create({
    data: {
      username: adminUsername,
      email: adminEmail,
      passwordHash: await hashPassword(adminPassword),
      role: Role.ADMIN,
    },
  });

  const testUser = await prisma.user.create({
    data: {
      username: "TestUser",
      email: testUserEmail,
      passwordHash: await hashPassword(testUserPassword),
      role: Role.USER,
    },
  });

  const trip = await prisma.trip.create({
    data: {
      slug,
      name: "Kyoto & Osaka",
      startDate: new Date(Date.UTC(2026, 6, 10)),
      members: {
        create: [
          { userId: admin.id, tripRole: TripRole.LEADER, hue: 25, order: 0 },
          { userId: testUser.id, tripRole: TripRole.MEMBER, hue: 235, order: 1 },
        ],
      },
    },
    include: { members: true },
  });

  const adminMember = trip.members.find((m) => m.userId === admin.id)!;
  const testUserMember = trip.members.find((m) => m.userId === testUser.id)!;

  for (const [dayOrder, day] of DAYS.entries()) {
    await prisma.day.create({
      data: {
        tripId: trip.id,
        title: day.title,
        order: dayOrder,
        activities: {
          create: day.acts.map((act, i) => ({
            order: i,
            label: act.label,
            time: act.time ?? "",
            title: act.title,
            place: act.place ?? "",
            note: act.note ?? "",
            ref: act.ref ?? "",
          })),
        },
      },
    });
  }

  let bookingOrder = 0;
  for (const group of BOOKING_GROUPS) {
    for (const item of group.items) {
      await prisma.booking.create({
        data: {
          tripId: trip.id,
          groupName: group.name,
          order: bookingOrder++,
          icon: item.icon,
          title: item.title,
          sub: item.sub,
          ref: item.ref,
          tbc: item.tbc,
        },
      });
    }
  }

  await prisma.savedPlace.createMany({
    data: SAVED_PLACES.map((p, i) => ({
      tripId: trip.id,
      order: i,
      name: p.name,
      category: p.cat,
      note: p.note,
    })),
  });

  await prisma.expense.createMany({
    data: EXPENSES.map((e, i) => ({
      tripId: trip.id,
      order: i,
      item: e.item,
      amountYen: e.amt,
      paidById: e.by === "admin" ? adminMember.id : testUserMember.id,
    })),
  });

  console.log(`Seeded trip "${trip.name}" (${slug}).`);
  console.log(`Admin login: ${adminEmail} / ${adminPassword}`);
  console.log(`Test user login: ${testUserEmail} / ${testUserPassword}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- [ ] **Step 2: Run the seed**

Run: `npx prisma db seed`
Expected: Output ends with `Seeded trip "Kyoto & Osaka" (kyoto-osaka).` followed by the two login lines. No errors.

- [ ] **Step 3: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat: reseed demo data as User/TripMember (admin+leader, test user+member)"
```

---

### Task 5: Session helpers

**Files:**
- Create: `src/lib/session-cookie.ts`
- Create: `src/lib/session.ts`
- Test: `src/lib/session.test.ts`

**Interfaces:**
- Produces (from `session-cookie.ts`): `SESSION_COOKIE: string` — used by Task 8 (`dal.ts`) and Task 13 (`proxy.ts`).
- Produces (from `session.ts`): `sessionDurationMs(remember: boolean): number`, `isSessionExpired(expiresAt: Date, now?: Date): boolean` — used by Task 8; `generateSessionToken(): string` — internal to `session.ts`; `createSession(userId: string, remember: boolean): Promise<void>`, `deleteSession(): Promise<void>` — used by Task 10 (login/logout) and Task 16 (signup calls `createSession` only).

- [ ] **Step 1: Write the failing test**

Create `src/lib/session.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { sessionDurationMs, isSessionExpired, generateSessionToken } from "./session";

describe("sessionDurationMs", () => {
  it("returns 24 hours when not remembered", () => {
    expect(sessionDurationMs(false)).toBe(24 * 60 * 60 * 1000);
  });

  it("returns 30 days when remembered", () => {
    expect(sessionDurationMs(true)).toBe(30 * 24 * 60 * 60 * 1000);
  });
});

describe("isSessionExpired", () => {
  it("returns false for a future expiry", () => {
    const now = new Date("2026-06-20T00:00:00Z");
    const expiresAt = new Date("2026-06-21T00:00:00Z");
    expect(isSessionExpired(expiresAt, now)).toBe(false);
  });

  it("returns true for a past expiry", () => {
    const now = new Date("2026-06-20T00:00:00Z");
    const expiresAt = new Date("2026-06-19T00:00:00Z");
    expect(isSessionExpired(expiresAt, now)).toBe(true);
  });

  it("returns true when expiry equals now", () => {
    const now = new Date("2026-06-20T00:00:00Z");
    expect(isSessionExpired(now, now)).toBe(true);
  });
});

describe("generateSessionToken", () => {
  it("generates a non-empty, URL-safe token", () => {
    const token = generateSessionToken();
    expect(token.length).toBeGreaterThan(20);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("generates distinct tokens on each call", () => {
    expect(generateSessionToken()).not.toBe(generateSessionToken());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/session.test.ts`
Expected: FAIL with "Cannot find module './session'".

- [ ] **Step 3: Write the cookie-name constant**

Create `src/lib/session-cookie.ts`:
```ts
export const SESSION_COOKIE = "session";
```

- [ ] **Step 4: Write the implementation**

Create `src/lib/session.ts`:
```ts
import "server-only";
import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE } from "@/lib/session-cookie";

const REMEMBER_ME_MS = 30 * 24 * 60 * 60 * 1000;
const DEFAULT_SESSION_MS = 24 * 60 * 60 * 1000;

export function sessionDurationMs(remember: boolean): number {
  return remember ? REMEMBER_ME_MS : DEFAULT_SESSION_MS;
}

export function isSessionExpired(expiresAt: Date, now: Date = new Date()): boolean {
  return expiresAt.getTime() <= now.getTime();
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export async function createSession(userId: string, remember: boolean): Promise<void> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + sessionDurationMs(remember));
  await prisma.session.create({ data: { token, userId, expiresAt } });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...(remember ? { maxAge: Math.floor(REMEMBER_ME_MS / 1000) } : {}),
  });
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { token } });
  }
  cookieStore.delete(SESSION_COOKIE);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/session.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/session-cookie.ts src/lib/session.ts src/lib/session.test.ts
git commit -m "feat: add session token, duration, and cookie helpers"
```

---

### Task 6: Permission helpers

**Files:**
- Create: `src/lib/permissions.ts`
- Test: `src/lib/permissions.test.ts`

**Interfaces:**
- Consumes: `Role`, `TripRole` enums from `@/generated/prisma/client` (Task 3).
- Produces: `AuthUser` interface `{ id: string; username: string; email: string; role: Role }`; `TripMembership` interface `{ tripRole: TripRole }`; `isAdmin(user: AuthUser): boolean`; `canLeadTrip(user: AuthUser, membership: TripMembership | null): boolean`; `hasTripAccess(membership: TripMembership | null): boolean` — `isAdmin`/`hasTripAccess`/`canLeadTrip` are used directly by Task 8 (`dal.ts`) and Task 15 (trip page); Task 8's `requireAdmin`/`requireTripAccess`/`requireTripLeader` wrap them for use by Tasks 14, 17, 18, 19.

- [ ] **Step 1: Write the failing test**

Create `src/lib/permissions.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { Role, TripRole } from "@/generated/prisma/client";
import { isAdmin, canLeadTrip, hasTripAccess, type AuthUser } from "./permissions";

function user(role: Role): AuthUser {
  return { id: "u1", username: "test", email: "test@example.com", role };
}

describe("isAdmin", () => {
  it("returns true for an admin", () => {
    expect(isAdmin(user(Role.ADMIN))).toBe(true);
  });

  it("returns false for a regular user", () => {
    expect(isAdmin(user(Role.USER))).toBe(false);
  });
});

describe("canLeadTrip", () => {
  it("returns true for an admin even with no membership", () => {
    expect(canLeadTrip(user(Role.ADMIN), null)).toBe(true);
  });

  it("returns true for a user whose membership is LEADER", () => {
    expect(canLeadTrip(user(Role.USER), { tripRole: TripRole.LEADER })).toBe(true);
  });

  it("returns false for a user whose membership is MEMBER", () => {
    expect(canLeadTrip(user(Role.USER), { tripRole: TripRole.MEMBER })).toBe(false);
  });

  it("returns false for a user with no membership", () => {
    expect(canLeadTrip(user(Role.USER), null)).toBe(false);
  });
});

describe("hasTripAccess", () => {
  it("returns true when a membership exists", () => {
    expect(hasTripAccess({ tripRole: TripRole.MEMBER })).toBe(true);
  });

  it("returns false when membership is null", () => {
    expect(hasTripAccess(null)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/permissions.test.ts`
Expected: FAIL with "Cannot find module './permissions'".

- [ ] **Step 3: Write the implementation**

Create `src/lib/permissions.ts`:
```ts
import { Role, TripRole } from "@/generated/prisma/client";

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: Role;
}

export interface TripMembership {
  tripRole: TripRole;
}

export function isAdmin(user: AuthUser): boolean {
  return user.role === Role.ADMIN;
}

export function canLeadTrip(user: AuthUser, membership: TripMembership | null): boolean {
  if (isAdmin(user)) return true;
  return membership?.tripRole === TripRole.LEADER;
}

export function hasTripAccess(membership: TripMembership | null): boolean {
  return membership !== null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/permissions.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/permissions.ts src/lib/permissions.test.ts
git commit -m "feat: add platform admin and trip leader permission helpers"
```

---

### Task 7: Invite helpers

**Files:**
- Create: `src/lib/invite.ts`
- Test: `src/lib/invite.test.ts`

**Interfaces:**
- Consumes: `prisma` from `@/lib/prisma`; `Role` from `@/generated/prisma/client`.
- Produces: `InviteRecord` interface `{ usedAt: Date | null; expiresAt: Date }`; `isInviteUsable(invite: InviteRecord, now?: Date): boolean`; `generateInviteToken(): string`; `createInvite(params: { email: string; role: Role; tripIds: string[]; createdById: string }): Promise<{ token: string }>`; `findInviteByToken(token: string)` — used by Tasks 16, 17, 18.

- [ ] **Step 1: Write the failing test**

Create `src/lib/invite.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { isInviteUsable, generateInviteToken } from "./invite";

describe("isInviteUsable", () => {
  const now = new Date("2026-06-20T00:00:00Z");

  it("returns true for an unused, unexpired invite", () => {
    expect(isInviteUsable({ usedAt: null, expiresAt: new Date("2026-06-21T00:00:00Z") }, now)).toBe(true);
  });

  it("returns false for a used invite", () => {
    expect(
      isInviteUsable({ usedAt: new Date("2026-06-19T00:00:00Z"), expiresAt: new Date("2026-06-21T00:00:00Z") }, now)
    ).toBe(false);
  });

  it("returns false for an expired invite", () => {
    expect(isInviteUsable({ usedAt: null, expiresAt: new Date("2026-06-19T00:00:00Z") }, now)).toBe(false);
  });

  it("returns false when expiry equals now", () => {
    expect(isInviteUsable({ usedAt: null, expiresAt: now }, now)).toBe(false);
  });
});

describe("generateInviteToken", () => {
  it("generates a non-empty, URL-safe token", () => {
    const token = generateInviteToken();
    expect(token.length).toBeGreaterThan(20);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("generates distinct tokens on each call", () => {
    expect(generateInviteToken()).not.toBe(generateInviteToken());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/invite.test.ts`
Expected: FAIL with "Cannot find module './invite'".

- [ ] **Step 3: Write the implementation**

Create `src/lib/invite.ts`:
```ts
import "server-only";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/client";

const INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

export interface InviteRecord {
  usedAt: Date | null;
  expiresAt: Date;
}

export function isInviteUsable(invite: InviteRecord, now: Date = new Date()): boolean {
  if (invite.usedAt !== null) return false;
  return invite.expiresAt.getTime() > now.getTime();
}

export function generateInviteToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export async function createInvite(params: {
  email: string;
  role: Role;
  tripIds: string[];
  createdById: string;
}): Promise<{ token: string }> {
  const token = generateInviteToken();
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_MS);
  await prisma.invite.create({
    data: {
      token,
      email: params.email,
      role: params.role,
      tripIds: params.tripIds,
      expiresAt,
      createdById: params.createdById,
    },
  });
  return { token };
}

export async function findInviteByToken(token: string) {
  return prisma.invite.findUnique({ where: { token } });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/invite.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/invite.ts src/lib/invite.test.ts
git commit -m "feat: add invite token generation and usability check"
```

---

### Task 8: Data Access Layer (`dal.ts`)

**Files:**
- Create: `src/lib/dal.ts`

**Interfaces:**
- Consumes: `prisma` (`@/lib/prisma`); `SESSION_COOKIE` (`@/lib/session-cookie`, Task 5); `isSessionExpired` (`@/lib/session`, Task 5); `isAdmin`, `canLeadTrip`, `hasTripAccess`, `AuthUser` (`@/lib/permissions`, Task 6).
- Produces: `getCurrentUser(): Promise<AuthUser | null>` (used by Task 14's root page); `requireUser(): Promise<AuthUser>` (used by Tasks 14, 19); `requireAdmin(): Promise<AuthUser>` (used by Task 17); `getTripMembership(userId: string, tripId: string)` (internal); `requireTripAccess(tripId: string): Promise<{ user: AuthUser; membership: { tripRole: TripRole } }>` (used by Task 15); `requireTripLeader(tripId: string): Promise<{ user: AuthUser; membership: { tripRole: TripRole } | null }>` (used by Task 18). This task has no automated test (it composes already-tested pure logic with cookies/Prisma/redirect; exercised manually in Task 20 per the spec's testing scope).

- [ ] **Step 1: Write the implementation**

Create `src/lib/dal.ts`:
```ts
import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE } from "@/lib/session-cookie";
import { isSessionExpired } from "@/lib/session";
import { isAdmin, canLeadTrip, hasTripAccess, type AuthUser } from "@/lib/permissions";

export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({ where: { token }, include: { user: true } });
  if (!session || isSessionExpired(session.expiresAt)) return null;

  return {
    id: session.user.id,
    username: session.user.username,
    email: session.user.email,
    role: session.user.role,
  };
});

export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireUser();
  if (!isAdmin(user)) redirect("/trips");
  return user;
}

export async function getTripMembership(userId: string, tripId: string) {
  return prisma.tripMember.findUnique({ where: { tripId_userId: { tripId, userId } } });
}

export async function requireTripAccess(tripId: string) {
  const user = await requireUser();
  const membership = await getTripMembership(user.id, tripId);
  if (!hasTripAccess(membership)) redirect("/trips");
  return { user, membership: membership! };
}

export async function requireTripLeader(tripId: string) {
  const user = await requireUser();
  const membership = await getTripMembership(user.id, tripId);
  if (!canLeadTrip(user, membership)) redirect("/trips");
  return { user, membership };
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors reported for `src/lib/dal.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/dal.ts
git commit -m "feat: add Data Access Layer (getCurrentUser, requireUser/Admin/TripAccess/TripLeader)"
```

---

### Task 9: Update `src/lib/trip.ts` for User-backed `TripMember`

**Files:**
- Modify: `src/lib/trip.ts`

**Interfaces:**
- Produces: `getFullTrip`, `getFullTripBySlug` (unchanged signatures, new `members[].user` shape), `getTripsForUser(userId: string)` (new), `FullTrip`, `MemberRecord` (now includes `.user: { username: string; ... }` and `.tripRole`), `DayWithActivities`, `ActivityRecord`, `BookingRecord`, `SavedPlaceRecord`, `ExpenseRecord` — used by Tasks 11, 12, 14, 15, 19.

- [ ] **Step 1: Replace the file**

Replace the full contents of `src/lib/trip.ts` with:
```ts
import { prisma } from "./prisma";

function fullTripInclude() {
  return {
    members: { orderBy: { order: "asc" as const }, include: { user: true } },
    days: {
      orderBy: { order: "asc" as const },
      include: { activities: { orderBy: { order: "asc" as const } } },
    },
    bookings: { orderBy: { order: "asc" as const } },
    savedPlaces: { orderBy: { order: "asc" as const } },
    expenses: {
      orderBy: { order: "asc" as const },
      include: { paidBy: { include: { user: true } } },
    },
  };
}

export async function getFullTrip(tripId: string) {
  return prisma.trip.findUniqueOrThrow({
    where: { id: tripId },
    include: fullTripInclude(),
  });
}

export async function getFullTripBySlug(slug: string) {
  return prisma.trip.findUniqueOrThrow({
    where: { slug },
    include: fullTripInclude(),
  });
}

export async function getTripsForUser(userId: string) {
  return prisma.trip.findMany({
    where: { members: { some: { userId } } },
    orderBy: { startDate: "asc" },
    include: { members: { where: { userId }, select: { tripRole: true } } },
  });
}

export type FullTrip = Awaited<ReturnType<typeof getFullTrip>>;
export type DayWithActivities = FullTrip["days"][number];
export type ActivityRecord = DayWithActivities["activities"][number];
export type MemberRecord = FullTrip["members"][number];
export type BookingRecord = FullTrip["bookings"][number];
export type SavedPlaceRecord = FullTrip["savedPlaces"][number];
export type ExpenseRecord = FullTrip["expenses"][number];
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors for `src/lib/trip.ts` itself (downstream errors in `Header.tsx`/`ExpensesTab.tsx` are expected until Task 11).

- [ ] **Step 3: Commit**

```bash
git add src/lib/trip.ts
git commit -m "feat: rebuild trip queries on User-backed TripMember; add getTripsForUser"
```

---

### Task 10: Login page and actions (login + logout)

**Files:**
- Create: `src/app/login/actions.ts`
- Create: `src/app/login/page.tsx`

**Interfaces:**
- Consumes: `verifyPassword` (`@/lib/password`, Task 1); `createSession`, `deleteSession` (`@/lib/session`, Task 5); `prisma` (`@/lib/prisma`).
- Produces: `LoginFormState` interface `{ error?: string }`; `login(prevState: LoginFormState, formData: FormData): Promise<LoginFormState>`; `logout(): Promise<void>` — `logout` is imported by `Header.tsx` in Task 11; `login` is used only by `src/app/login/page.tsx` in this task.

- [ ] **Step 1: Write the actions**

Create `src/app/login/actions.ts`:
```ts
"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { createSession, deleteSession } from "@/lib/session";

export interface LoginFormState {
  error?: string;
}

export async function login(_prevState: LoginFormState, formData: FormData): Promise<LoginFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const remember = formData.get("remember") === "on";

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Invalid email or password." };
  }

  await createSession(user.id, remember);
  redirect("/trips");
}

export async function logout(): Promise<void> {
  await deleteSession();
  redirect("/login");
}
```

- [ ] **Step 2: Write the page**

Create `src/app/login/page.tsx`:
```tsx
"use client";

import { useActionState } from "react";
import { login, type LoginFormState } from "./actions";

const initialState: LoginFormState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f6f1ea",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 28,
      }}
    >
      <form
        action={formAction}
        style={{
          background: "#fffdfa",
          border: "1px solid #ece3d8",
          borderRadius: 14,
          padding: 32,
          width: "100%",
          maxWidth: 360,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <h1 style={{ fontSize: 21, fontWeight: 800, margin: 0 }}>Log in</h1>
        <label style={{ fontSize: 13, fontWeight: 600, color: "#5f554c" }}>
          Email
          <input
            name="email"
            type="email"
            required
            style={{ display: "block", width: "100%", marginTop: 4, padding: "8px 10px", borderRadius: 8, border: "1px solid #ece3d8" }}
          />
        </label>
        <label style={{ fontSize: 13, fontWeight: 600, color: "#5f554c" }}>
          Password
          <input
            name="password"
            type="password"
            required
            style={{ display: "block", width: "100%", marginTop: 4, padding: "8px 10px", borderRadius: 8, border: "1px solid #ece3d8" }}
          />
        </label>
        <label style={{ fontSize: 13, color: "#5f554c", display: "flex", alignItems: "center", gap: 6 }}>
          <input name="remember" type="checkbox" />
          Remember me
        </label>
        {state.error && <p style={{ color: "#7c2d2d", fontSize: 13, margin: 0 }}>{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          style={{
            background: "#7c2d2d",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "10px 14px",
            fontWeight: 700,
            cursor: pending ? "default" : "pointer",
            opacity: pending ? 0.7 : 1,
          }}
        >
          {pending ? "Logging in…" : "Log in"}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors for `src/app/login/actions.ts` or `src/app/login/page.tsx`.

- [ ] **Step 4: Commit**

```bash
git add src/app/login
git commit -m "feat: add login page and login/logout server actions"
```

---

### Task 11: Update `Header.tsx` and `ExpensesTab.tsx` for the new member shape

**Files:**
- Modify: `src/app/components/Header.tsx`
- Modify: `src/app/components/ExpensesTab.tsx`

**Interfaces:**
- Consumes: `FullTrip` (Task 9) — `member.name` is now `member.user.username`; `member.tripRole` is newly available.
- Produces: `Header` now takes three new required props: `currentUsername: string`, `isAdmin: boolean`, `isTripLeader: boolean` — used by Task 12.

- [ ] **Step 1: Replace `Header.tsx`**

Replace the full contents of `src/app/components/Header.tsx` with:
```tsx
"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import type { FullTrip } from "@/lib/trip";
import { tripMeta } from "@/lib/dates";
import { logout } from "@/app/login/actions";
import type { Tab } from "../types";

const TABS: { key: Tab; label: string }[] = [
  { key: "itinerary", label: "Itinerary" },
  { key: "map", label: "Map" },
  { key: "bookings", label: "Bookings" },
  { key: "saved", label: "Saved" },
  { key: "expenses", label: "Expenses" },
];

export function Header({
  trip,
  tab,
  onChangeTab,
  currentUsername,
  isAdmin,
  isTripLeader,
}: {
  trip: FullTrip;
  tab: Tab;
  onChangeTab: (tab: Tab) => void;
  currentUsername: string;
  isAdmin: boolean;
  isTripLeader: boolean;
}) {
  const initial = trip.name.trim().charAt(0).toUpperCase() || "T";

  return (
    <header style={{ background: "#fffdfa", borderBottom: "1px solid #ece3d8", position: "sticky", top: 0, zIndex: 30 }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "18px 28px 0 28px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "#7c2d2d",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: 18,
                flex: "none",
                letterSpacing: "-0.02em",
              }}
            >
              {initial}
            </div>
            <div>
              <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1, whiteSpace: "nowrap" }}>
                {trip.name}
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#a09487", letterSpacing: "0.02em", marginTop: 4 }}>
                {tripMeta(trip.startDate, trip.days.length)}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {trip.members.map((m) => {
                const pill: CSSProperties = {
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  background: `oklch(0.97 0.02 ${m.hue})`,
                  border: `1px solid oklch(0.91 0.045 ${m.hue})`,
                  padding: "5px 12px 5px 8px",
                  borderRadius: 999,
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "#5f554c",
                };
                return (
                  <span key={m.id} style={pill}>
                    <span style={{ width: 18, height: 18, borderRadius: "50%", background: `oklch(0.58 0.10 ${m.hue})` }} />
                    {m.user.username}
                  </span>
                );
              })}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13, fontWeight: 600 }}>
              {isTripLeader && (
                <Link href={`/trips/${trip.slug}/manage`} style={{ color: "#5f554c" }}>
                  Manage
                </Link>
              )}
              {isAdmin && (
                <Link href="/admin/users" style={{ color: "#5f554c" }}>
                  Admin
                </Link>
              )}
              <Link href="/profile" style={{ color: "#211b17" }}>
                {currentUsername}
              </Link>
              <form action={logout}>
                <button
                  type="submit"
                  style={{ background: "none", border: "none", color: "#5f554c", cursor: "pointer", fontWeight: 600, fontSize: 13, padding: 0 }}
                >
                  Log out
                </button>
              </form>
            </div>
          </div>
        </div>
        <nav style={{ display: "flex", gap: 26, marginTop: 14, overflowX: "auto", borderBottom: "1px solid #ece3d8" }}>
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => onChangeTab(t.key)}
                style={{
                  appearance: "none",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: active ? 700 : 500,
                  color: active ? "#211b17" : "#9a8f84",
                  padding: "14px 2px",
                  borderBottom: active ? "2px solid #7c2d2d" : "2px solid transparent",
                  marginBottom: -1,
                  transition: "color .15s",
                  whiteSpace: "nowrap",
                }}
              >
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Update `ExpensesTab.tsx`**

In `src/app/components/ExpensesTab.tsx`, change:
```tsx
    settleText = paidA < share ? `${a.name} owes ${b.name} ${yen(diff)}` : `${b.name} owes ${a.name} ${yen(diff)}`;
```
to:
```tsx
    settleText =
      paidA < share
        ? `${a.user.username} owes ${b.user.username} ${yen(diff)}`
        : `${b.user.username} owes ${a.user.username} ${yen(diff)}`;
```

Then change:
```tsx
                {m.name} paid
```
to:
```tsx
                {m.user.username} paid
```

Then change:
```tsx
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: `oklch(0.58 0.10 ${e.paidBy.hue})` }} />
                {e.paidBy.name}
```
to:
```tsx
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: `oklch(0.58 0.10 ${e.paidBy.hue})` }} />
                {e.paidBy.user.username}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors for `Header.tsx` or `ExpensesTab.tsx` (errors remain in `trip-app.tsx`/`page.tsx`/`prisma/seed.ts` callers until Tasks 12, 14, 15 — `seed.ts` was already fixed in Task 4).

- [ ] **Step 4: Commit**

```bash
git add src/app/components/Header.tsx src/app/components/ExpensesTab.tsx
git commit -m "feat: update Header and ExpensesTab for User-backed TripMember"
```

---

### Task 12: Forward auth props through `trip-app.tsx`

**Files:**
- Modify: `src/app/trip-app.tsx`

**Interfaces:**
- Consumes: `Header`'s new props (Task 11).
- Produces: `TripApp` now requires `currentUsername: string`, `isAdmin: boolean`, `isTripLeader: boolean` props — used by Task 15.

- [ ] **Step 1: Update the component signature**

In `src/app/trip-app.tsx`, change:
```tsx
export function TripApp({ initialTrip }: { initialTrip: FullTrip }) {
```
to:
```tsx
export function TripApp({
  initialTrip,
  currentUsername,
  isAdmin,
  isTripLeader,
}: {
  initialTrip: FullTrip;
  currentUsername: string;
  isAdmin: boolean;
  isTripLeader: boolean;
}) {
```

- [ ] **Step 2: Pass the props to `Header`**

In the same file, change:
```tsx
      <Header trip={trip} tab={tab} onChangeTab={changeTab} />
```
to:
```tsx
      <Header
        trip={trip}
        tab={tab}
        onChangeTab={changeTab}
        currentUsername={currentUsername}
        isAdmin={isAdmin}
        isTripLeader={isTripLeader}
      />
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors for `src/app/trip-app.tsx` itself (errors remain in `src/app/page.tsx`, which still calls the old single-prop `TripApp` until Task 14 replaces it).

- [ ] **Step 4: Commit**

```bash
git add src/app/trip-app.tsx
git commit -m "feat: forward currentUsername/isAdmin/isTripLeader through TripApp"
```

---

### Task 13: Route protection (`proxy.ts`)

**Files:**
- Create: `src/proxy.ts`

**Interfaces:**
- Consumes: `SESSION_COOKIE` (`@/lib/session-cookie`, Task 5).
- Produces: redirects any request without a session cookie, to a non-public path, to `/login`. This is an optimistic, cookie-presence-only check — the authoritative check is the DAL (Task 8), called from every page/action. No automated test (per spec: proxy does cheap redirects only, verified manually in Task 20).

- [ ] **Step 1: Write the implementation**

Create `src/proxy.ts`:
```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session-cookie";

const PUBLIC_PATHS = ["/login", "/signup"];

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (!isPublic && !hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors for `src/proxy.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/proxy.ts
git commit -m "feat: add proxy.ts optimistic auth redirect"
```

---

### Task 14: Root redirect and trips dashboard

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/app/trips/page.tsx`

**Interfaces:**
- Consumes: `getCurrentUser`, `requireUser` (`@/lib/dal`, Task 8); `getTripsForUser` (`@/lib/trip`, Task 9).

- [ ] **Step 1: Replace the root page**

Replace the full contents of `src/app/page.tsx` with:
```tsx
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";

export default async function Home() {
  const user = await getCurrentUser();
  redirect(user ? "/trips" : "/login");
}
```

- [ ] **Step 2: Write the trips dashboard**

Create `src/app/trips/page.tsx`:
```tsx
import Link from "next/link";
import { requireUser } from "@/lib/dal";
import { getTripsForUser } from "@/lib/trip";
import { TripRole } from "@/generated/prisma/client";

export default async function TripsDashboard() {
  const user = await requireUser();
  const trips = await getTripsForUser(user.id);

  return (
    <div style={{ minHeight: "100vh", background: "#f6f1ea", padding: "48px 28px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 24 }}>Your trips</h1>
        {trips.length === 0 && <p style={{ color: "#6f655b" }}>You don&apos;t have access to any trips yet.</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {trips.map((trip) => (
            <Link
              key={trip.id}
              href={`/trips/${trip.slug}`}
              style={{
                display: "block",
                background: "#fffdfa",
                border: "1px solid #ece3d8",
                borderRadius: 14,
                padding: "16px 20px",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 16 }}>{trip.name}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "#a09487", marginTop: 4 }}>
                {trip.members[0]?.tripRole === TripRole.LEADER ? "Trip Leader" : "Member"}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors for either file. (`page.tsx` no longer imports `getFullTripBySlug`/`TripApp` — that moves to Task 15.)

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx src/app/trips/page.tsx
git commit -m "feat: redirect root to /trips or /login; add trips dashboard"
```

---

### Task 15: Trip dynamic route (`/trips/[slug]`)

**Files:**
- Create: `src/app/trips/[slug]/page.tsx`

**Interfaces:**
- Consumes: `getFullTripBySlug` (`@/lib/trip`, Task 9); `requireTripAccess` (`@/lib/dal`, Task 8); `isAdmin`, `canLeadTrip` (`@/lib/permissions`, Task 6); `TripApp` (`@/app/trip-app`, Task 12).

- [ ] **Step 1: Write the page**

Create `src/app/trips/[slug]/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import { getFullTripBySlug } from "@/lib/trip";
import { requireTripAccess } from "@/lib/dal";
import { isAdmin, canLeadTrip } from "@/lib/permissions";
import { TripApp } from "@/app/trip-app";

export default async function TripPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const trip = await getFullTripBySlug(slug).catch(() => null);
  if (!trip) notFound();

  const { user, membership } = await requireTripAccess(trip.id);

  return (
    <TripApp
      initialTrip={trip}
      currentUsername={user.username}
      isAdmin={isAdmin(user)}
      isTripLeader={canLeadTrip(user, membership)}
    />
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors anywhere in the project (this was the last caller of the old `TripApp` shape).

- [ ] **Step 3: Commit**

```bash
git add "src/app/trips/[slug]/page.tsx"
git commit -m "feat: add /trips/[slug] dynamic route guarded by requireTripAccess"
```

---

### Task 16: Invite redemption (`/signup/[token]`)

**Files:**
- Create: `src/app/signup/[token]/actions.ts`
- Create: `src/app/signup/[token]/signup-form.tsx`
- Create: `src/app/signup/[token]/page.tsx`

**Interfaces:**
- Consumes: `findInviteByToken`, `isInviteUsable` (`@/lib/invite`, Task 7); `hashPassword` (`@/lib/password`, Task 1); `validateUsername`, `validatePasswordComplexity` (`@/lib/validation`, Task 2); `createSession` (`@/lib/session`, Task 5); `prisma` (`@/lib/prisma`).
- Produces: `SignupFormState` interface `{ error?: string }`; `redeemInvite(token: string, prevState: SignupFormState, formData: FormData): Promise<SignupFormState>` — used only within this task's own page.

- [ ] **Step 1: Write the actions**

Create `src/app/signup/[token]/actions.ts`:
```ts
"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { findInviteByToken, isInviteUsable } from "@/lib/invite";
import { hashPassword, validatePasswordComplexity } from "@/lib/password";
import { validateUsername } from "@/lib/validation";
import { createSession } from "@/lib/session";

export interface SignupFormState {
  error?: string;
}

export async function redeemInvite(
  token: string,
  _prevState: SignupFormState,
  formData: FormData
): Promise<SignupFormState> {
  const invite = await findInviteByToken(token);
  if (!invite || !isInviteUsable(invite)) {
    return { error: "This invite link is invalid or has expired." };
  }

  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const usernameError = validateUsername(username);
  if (usernameError) return { error: usernameError };
  const passwordError = validatePasswordComplexity(password);
  if (passwordError) return { error: passwordError };

  const existingUsername = await prisma.user.findUnique({ where: { username } });
  if (existingUsername) return { error: "That username is already taken." };

  const existingEmail = await prisma.user.findUnique({ where: { email: invite.email } });
  if (existingEmail) return { error: "An account with this email already exists." };

  const passwordHash = await hashPassword(password);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { username, email: invite.email, passwordHash, role: invite.role },
    });

    for (const tripId of invite.tripIds) {
      const count = await tx.tripMember.count({ where: { tripId } });
      await tx.tripMember.create({
        data: { tripId, userId: created.id, hue: (count * 67) % 360, order: count },
      });
    }

    await tx.invite.update({ where: { id: invite.id }, data: { usedAt: new Date(), usedById: created.id } });
    return created;
  });

  await createSession(user.id, false);
  redirect("/trips");
}
```

- [ ] **Step 2: Write the form component**

Create `src/app/signup/[token]/signup-form.tsx`:
```tsx
"use client";

import { useActionState } from "react";
import { redeemInvite, type SignupFormState } from "./actions";

const initialState: SignupFormState = {};

export function SignupForm({ token, email }: { token: string; email: string }) {
  const action = redeemInvite.bind(null, token);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f6f1ea",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 28,
      }}
    >
      <form
        action={formAction}
        style={{
          background: "#fffdfa",
          border: "1px solid #ece3d8",
          borderRadius: 14,
          padding: 32,
          width: "100%",
          maxWidth: 360,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <h1 style={{ fontSize: 21, fontWeight: 800, margin: 0 }}>Create your account</h1>
        <p style={{ fontSize: 13, color: "#a09487", margin: 0 }}>{email}</p>
        <label style={{ fontSize: 13, fontWeight: 600, color: "#5f554c" }}>
          Username
          <input
            name="username"
            required
            style={{ display: "block", width: "100%", marginTop: 4, padding: "8px 10px", borderRadius: 8, border: "1px solid #ece3d8" }}
          />
        </label>
        <label style={{ fontSize: 13, fontWeight: 600, color: "#5f554c" }}>
          Password
          <input
            name="password"
            type="password"
            required
            style={{ display: "block", width: "100%", marginTop: 4, padding: "8px 10px", borderRadius: 8, border: "1px solid #ece3d8" }}
          />
        </label>
        {state.error && <p style={{ color: "#7c2d2d", fontSize: 13, margin: 0 }}>{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          style={{
            background: "#7c2d2d",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "10px 14px",
            fontWeight: 700,
            cursor: pending ? "default" : "pointer",
          }}
        >
          {pending ? "Creating…" : "Create account"}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Write the page**

Create `src/app/signup/[token]/page.tsx`:
```tsx
import { findInviteByToken, isInviteUsable } from "@/lib/invite";
import { SignupForm } from "./signup-form";

export default async function SignupPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await findInviteByToken(token);

  if (!invite || !isInviteUsable(invite)) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#f6f1ea",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 28,
        }}
      >
        <p style={{ maxWidth: 360, textAlign: "center", color: "#5f554c" }}>
          This invite link is invalid or has expired — ask your admin for a new one.
        </p>
      </div>
    );
  }

  return <SignupForm token={token} email={invite.email} />;
}
```

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors for any file under `src/app/signup/`.

- [ ] **Step 5: Commit**

```bash
git add src/app/signup
git commit -m "feat: add invite redemption signup flow"
```

---

### Task 17: Admin user management (`/admin/users`)

**Files:**
- Create: `src/app/admin/users/actions.ts`
- Create: `src/app/admin/users/invite-form.tsx`
- Create: `src/app/admin/users/page.tsx`

**Interfaces:**
- Consumes: `requireAdmin` (`@/lib/dal`, Task 8); `createInvite` (`@/lib/invite`, Task 7); `hashPassword` (`@/lib/password`, Task 1); `validateEmail`, `validateUsername`, `validatePasswordComplexity` (`@/lib/validation`, Task 2); `prisma`, `Role` (`@/generated/prisma/client`).
- Produces: `AdminFormState` interface `{ error?: string; inviteUrl?: string }`; `createPlatformInvite`, `updateUser`, `deleteUser`, `resetUserPassword`, `grantTripAccess`, `revokeTripAccess` — used only within this task's own page.

- [ ] **Step 1: Write the actions**

Create `src/app/admin/users/actions.ts`:
```ts
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/dal";
import { createInvite } from "@/lib/invite";
import { hashPassword, validatePasswordComplexity } from "@/lib/password";
import { validateEmail, validateUsername } from "@/lib/validation";
import { Role } from "@/generated/prisma/client";

export interface AdminFormState {
  error?: string;
  inviteUrl?: string;
}

export async function createPlatformInvite(
  _prevState: AdminFormState,
  formData: FormData
): Promise<AdminFormState> {
  const admin = await requireAdmin();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = formData.get("role") === "ADMIN" ? Role.ADMIN : Role.USER;
  const tripIds = formData.getAll("tripIds").map(String);

  const emailError = validateEmail(email);
  if (emailError) return { error: emailError };

  const { token } = await createInvite({ email, role, tripIds, createdById: admin.id });
  revalidatePath("/admin/users");
  return { inviteUrl: `/signup/${token}` };
}

export async function updateUser(userId: string, formData: FormData): Promise<void> {
  await requireAdmin();
  const username = String(formData.get("username") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = formData.get("role") === "ADMIN" ? Role.ADMIN : Role.USER;

  const usernameError = validateUsername(username);
  if (usernameError) throw new Error(usernameError);
  const emailError = validateEmail(email);
  if (emailError) throw new Error(emailError);

  const emailOwner = await prisma.user.findUnique({ where: { email } });
  if (emailOwner && emailOwner.id !== userId) throw new Error("Another account already uses this email.");
  const usernameOwner = await prisma.user.findUnique({ where: { username } });
  if (usernameOwner && usernameOwner.id !== userId) throw new Error("Another account already uses this username.");

  if (role === Role.USER) {
    const current = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (current.role === Role.ADMIN) {
      const adminCount = await prisma.user.count({ where: { role: Role.ADMIN } });
      if (adminCount <= 1) throw new Error("Cannot demote the last remaining admin.");
    }
  }

  await prisma.user.update({ where: { id: userId }, data: { username, email, role } });
  revalidatePath("/admin/users");
}

export async function deleteUser(userId: string): Promise<void> {
  const admin = await requireAdmin();
  if (admin.id === userId) {
    const adminCount = await prisma.user.count({ where: { role: Role.ADMIN } });
    if (adminCount <= 1) throw new Error("Cannot delete the last remaining admin.");
  }
  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/admin/users");
}

export async function resetUserPassword(userId: string, formData: FormData): Promise<void> {
  await requireAdmin();
  const password = String(formData.get("password") ?? "");
  const passwordError = validatePasswordComplexity(password);
  if (passwordError) throw new Error(passwordError);

  const passwordHash = await hashPassword(password);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  revalidatePath("/admin/users");
}

export async function grantTripAccess(userId: string, tripId: string): Promise<void> {
  await requireAdmin();
  const count = await prisma.tripMember.count({ where: { tripId } });
  await prisma.tripMember.upsert({
    where: { tripId_userId: { tripId, userId } },
    update: {},
    create: { tripId, userId, hue: (count * 67) % 360, order: count },
  });
  revalidatePath("/admin/users");
}

export async function revokeTripAccess(userId: string, tripId: string): Promise<void> {
  await requireAdmin();
  await prisma.tripMember.delete({ where: { tripId_userId: { tripId, userId } } });
  revalidatePath("/admin/users");
}
```

- [ ] **Step 2: Write the invite form component**

Create `src/app/admin/users/invite-form.tsx`:
```tsx
"use client";

import { useActionState } from "react";
import { createPlatformInvite, type AdminFormState } from "./actions";
import { Role } from "@/generated/prisma/browser";

const initialState: AdminFormState = {};

export function InviteForm({ trips }: { trips: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(createPlatformInvite, initialState);

  return (
    <form
      action={formAction}
      style={{ background: "#fffdfa", border: "1px solid #ece3d8", borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 10 }}
    >
      <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Invite a user</h2>
      <input name="email" type="email" placeholder="Email" required style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ece3d8" }} />
      <select name="role" defaultValue={Role.USER} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ece3d8" }}>
        <option value={Role.USER}>User</option>
        <option value={Role.ADMIN}>Admin</option>
      </select>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {trips.map((trip) => (
          <label key={trip.id} style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
            <input type="checkbox" name="tripIds" value={trip.id} />
            {trip.name}
          </label>
        ))}
      </div>
      <button
        type="submit"
        disabled={pending}
        style={{ background: "#7c2d2d", color: "#fff", border: "none", borderRadius: 8, padding: "10px 14px", fontWeight: 700, cursor: pending ? "default" : "pointer" }}
      >
        {pending ? "Creating…" : "Create invite link"}
      </button>
      {state.error && <p style={{ color: "#7c2d2d", fontSize: 13, margin: 0 }}>{state.error}</p>}
      {state.inviteUrl && (
        <p style={{ fontSize: 13, margin: 0 }}>
          Share this link: <code>{state.inviteUrl}</code>
        </p>
      )}
    </form>
  );
}
```

- [ ] **Step 3: Write the page**

Create `src/app/admin/users/page.tsx`:
```tsx
import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/client";
import { InviteForm } from "./invite-form";
import { updateUser, deleteUser, resetUserPassword, grantTripAccess, revokeTripAccess } from "./actions";

export default async function AdminUsersPage() {
  const admin = await requireAdmin();
  const users = await prisma.user.findMany({
    orderBy: { username: "asc" },
    include: { tripAccess: { include: { trip: true } } },
  });
  const trips = await prisma.trip.findMany({ orderBy: { name: "asc" } });

  return (
    <div style={{ minHeight: "100vh", background: "#f6f1ea", padding: "48px 28px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", flexDirection: "column", gap: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Manage users</h1>

        <InviteForm trips={trips} />

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {users.map((user) => {
            const accessTripIds = new Set(user.tripAccess.map((a) => a.tripId));
            return (
              <div key={user.id} style={{ background: "#fffdfa", border: "1px solid #ece3d8", borderRadius: 14, padding: 20 }}>
                <form action={updateUser.bind(null, user.id)} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <input name="username" defaultValue={user.username} style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #ece3d8" }} />
                  <input name="email" defaultValue={user.email} style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #ece3d8" }} />
                  <select name="role" defaultValue={user.role} style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #ece3d8" }}>
                    <option value={Role.USER}>User</option>
                    <option value={Role.ADMIN}>Admin</option>
                  </select>
                  <button
                    type="submit"
                    style={{ background: "#7c2d2d", color: "#fff", border: "none", borderRadius: 6, padding: "6px 12px", fontWeight: 600, cursor: "pointer" }}
                  >
                    Save
                  </button>
                </form>
                <form action={resetUserPassword.bind(null, user.id)} style={{ display: "flex", gap: 10, marginTop: 10 }}>
                  <input name="password" type="password" placeholder="New password" style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #ece3d8" }} />
                  <button
                    type="submit"
                    style={{ background: "#ece3d8", border: "none", borderRadius: 6, padding: "6px 12px", fontWeight: 600, cursor: "pointer" }}
                  >
                    Reset password
                  </button>
                </form>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                  {trips.map((trip) => {
                    const has = accessTripIds.has(trip.id);
                    const action = has ? revokeTripAccess : grantTripAccess;
                    return (
                      <form key={trip.id} action={action.bind(null, user.id, trip.id)}>
                        <button
                          type="submit"
                          style={{
                            background: has ? "#7c2d2d" : "#ece3d8",
                            color: has ? "#fff" : "#5f554c",
                            border: "none",
                            borderRadius: 999,
                            padding: "4px 12px",
                            fontSize: 12.5,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          {trip.name}
                        </button>
                      </form>
                    );
                  })}
                </div>
                <form action={deleteUser.bind(null, user.id)} style={{ marginTop: 10 }}>
                  <button
                    type="submit"
                    disabled={user.id === admin.id}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#7c2d2d",
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: user.id === admin.id ? "default" : "pointer",
                      opacity: user.id === admin.id ? 0.4 : 1,
                    }}
                  >
                    Remove user
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors for any file under `src/app/admin/`.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin
git commit -m "feat: add admin user management page"
```

---

### Task 18: Trip Leader management (`/trips/[slug]/manage`)

**Files:**
- Create: `src/app/trips/[slug]/manage/actions.ts`
- Create: `src/app/trips/[slug]/manage/trip-invite-form.tsx`
- Create: `src/app/trips/[slug]/manage/page.tsx`

**Interfaces:**
- Consumes: `requireTripLeader` (`@/lib/dal`, Task 8); `createInvite` (`@/lib/invite`, Task 7); `validateEmail` (`@/lib/validation`, Task 2); `prisma`, `Role`, `TripRole` (`@/generated/prisma/client`).
- Produces: `TripInviteFormState` interface `{ error?: string; inviteUrl?: string }`; `createTripInvite`, `removeTripMember`, `setTripMemberRole`, `updateTripDetails` — used only within this task's own page.

- [ ] **Step 1: Write the actions**

Create `src/app/trips/[slug]/manage/actions.ts`:
```ts
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireTripLeader } from "@/lib/dal";
import { createInvite } from "@/lib/invite";
import { Role, TripRole } from "@/generated/prisma/client";
import { validateEmail } from "@/lib/validation";

export interface TripInviteFormState {
  error?: string;
  inviteUrl?: string;
}

export async function createTripInvite(
  tripId: string,
  _prevState: TripInviteFormState,
  formData: FormData
): Promise<TripInviteFormState> {
  const { user } = await requireTripLeader(tripId);
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const emailError = validateEmail(email);
  if (emailError) return { error: emailError };

  const { token } = await createInvite({ email, role: Role.USER, tripIds: [tripId], createdById: user.id });
  revalidatePath("/trips");
  return { inviteUrl: `/signup/${token}` };
}

export async function removeTripMember(tripId: string, userId: string): Promise<void> {
  await requireTripLeader(tripId);
  await prisma.tripMember.delete({ where: { tripId_userId: { tripId, userId } } });
  revalidatePath("/trips");
}

export async function setTripMemberRole(tripId: string, userId: string, tripRole: TripRole): Promise<void> {
  await requireTripLeader(tripId);
  await prisma.tripMember.update({ where: { tripId_userId: { tripId, userId } }, data: { tripRole } });
  revalidatePath("/trips");
}

export async function updateTripDetails(tripId: string, formData: FormData): Promise<void> {
  await requireTripLeader(tripId);
  const name = String(formData.get("name") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "");
  if (!name || !startDate) throw new Error("Name and start date are required.");

  await prisma.trip.update({ where: { id: tripId }, data: { name, startDate: new Date(startDate) } });
  revalidatePath("/trips");
}
```

- [ ] **Step 2: Write the trip-invite form component**

Create `src/app/trips/[slug]/manage/trip-invite-form.tsx`:
```tsx
"use client";

import { useActionState } from "react";
import { createTripInvite, type TripInviteFormState } from "./actions";

const initialState: TripInviteFormState = {};

export function TripInviteForm({ tripId }: { tripId: string }) {
  const action = createTripInvite.bind(null, tripId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form
      action={formAction}
      style={{ background: "#fffdfa", border: "1px solid #ece3d8", borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 10 }}
    >
      <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Invite someone to this trip</h2>
      <input name="email" type="email" placeholder="Email" required style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ece3d8" }} />
      <button
        type="submit"
        disabled={pending}
        style={{ background: "#7c2d2d", color: "#fff", border: "none", borderRadius: 8, padding: "10px 14px", fontWeight: 700, cursor: pending ? "default" : "pointer" }}
      >
        {pending ? "Creating…" : "Create invite link"}
      </button>
      {state.error && <p style={{ color: "#7c2d2d", fontSize: 13, margin: 0 }}>{state.error}</p>}
      {state.inviteUrl && (
        <p style={{ fontSize: 13, margin: 0 }}>
          Share this link: <code>{state.inviteUrl}</code>
        </p>
      )}
    </form>
  );
}
```

- [ ] **Step 3: Write the page**

Create `src/app/trips/[slug]/manage/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireTripLeader } from "@/lib/dal";
import { TripRole } from "@/generated/prisma/client";
import { removeTripMember, setTripMemberRole, updateTripDetails } from "./actions";
import { TripInviteForm } from "./trip-invite-form";

export default async function TripManagePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const trip = await prisma.trip.findUnique({ where: { slug } });
  if (!trip) notFound();

  await requireTripLeader(trip.id);
  const members = await prisma.tripMember.findMany({
    where: { tripId: trip.id },
    orderBy: { order: "asc" },
    include: { user: true },
  });

  return (
    <div style={{ minHeight: "100vh", background: "#f6f1ea", padding: "48px 28px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", gap: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Manage &ldquo;{trip.name}&rdquo;</h1>

        <form
          action={updateTripDetails.bind(null, trip.id)}
          style={{ background: "#fffdfa", border: "1px solid #ece3d8", borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 10 }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Trip details</h2>
          <input name="name" defaultValue={trip.name} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ece3d8" }} />
          <input
            name="startDate"
            type="date"
            defaultValue={trip.startDate.toISOString().slice(0, 10)}
            style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ece3d8" }}
          />
          <button
            type="submit"
            style={{ background: "#7c2d2d", color: "#fff", border: "none", borderRadius: 8, padding: "10px 14px", fontWeight: 700, cursor: "pointer" }}
          >
            Save
          </button>
        </form>

        <TripInviteForm tripId={trip.id} />

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {members.map((member) => (
            <div
              key={member.id}
              style={{ background: "#fffdfa", border: "1px solid #ece3d8", borderRadius: 14, padding: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}
            >
              <span style={{ fontWeight: 600 }}>
                {member.user.username} {member.tripRole === TripRole.LEADER ? "— Leader" : ""}
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <form
                  action={setTripMemberRole.bind(
                    null,
                    trip.id,
                    member.userId,
                    member.tripRole === TripRole.LEADER ? TripRole.MEMBER : TripRole.LEADER
                  )}
                >
                  <button
                    type="submit"
                    style={{ background: "#ece3d8", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
                  >
                    {member.tripRole === TripRole.LEADER ? "Demote" : "Promote to Leader"}
                  </button>
                </form>
                <form action={removeTripMember.bind(null, trip.id, member.userId)}>
                  <button
                    type="submit"
                    style={{ background: "none", border: "none", color: "#7c2d2d", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
                  >
                    Remove
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors for any file under `src/app/trips/[slug]/manage/`.

- [ ] **Step 5: Commit**

```bash
git add "src/app/trips/[slug]/manage"
git commit -m "feat: add trip leader management page (members, roles, trip details, invites)"
```

---

### Task 19: Profile page (`/profile`)

**Files:**
- Create: `src/app/profile/actions.ts`
- Create: `src/app/profile/profile-forms.tsx`
- Create: `src/app/profile/page.tsx`

**Interfaces:**
- Consumes: `requireUser` (`@/lib/dal`, Task 8); `getTripsForUser` (`@/lib/trip`, Task 9); `hashPassword`, `verifyPassword` (`@/lib/password`, Task 1); `validateUsername`, `validateEmail`, `validatePasswordComplexity` (`@/lib/validation`, Task 2); `prisma`.
- Produces: `ProfileFormState` interface `{ error?: string; success?: string }`; `updateProfile`, `changePassword` — used only within this task's own page.

- [ ] **Step 1: Write the actions**

Create `src/app/profile/actions.ts`:
```ts
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/dal";
import { hashPassword, verifyPassword, validatePasswordComplexity } from "@/lib/password";
import { validateUsername, validateEmail } from "@/lib/validation";

export interface ProfileFormState {
  error?: string;
  success?: string;
}

export async function updateProfile(_prevState: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const user = await requireUser();
  const username = String(formData.get("username") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  const usernameError = validateUsername(username);
  if (usernameError) return { error: usernameError };
  const emailError = validateEmail(email);
  if (emailError) return { error: emailError };

  const emailOwner = await prisma.user.findUnique({ where: { email } });
  if (emailOwner && emailOwner.id !== user.id) return { error: "Another account already uses this email." };
  const usernameOwner = await prisma.user.findUnique({ where: { username } });
  if (usernameOwner && usernameOwner.id !== user.id) return { error: "Another account already uses this username." };

  await prisma.user.update({ where: { id: user.id }, data: { username, email } });
  revalidatePath("/profile");
  return { success: "Profile updated." };
}

export async function changePassword(_prevState: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const user = await requireUser();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");

  const record = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await verifyPassword(currentPassword, record.passwordHash))) {
    return { error: "Current password is incorrect." };
  }

  const passwordError = validatePasswordComplexity(newPassword);
  if (passwordError) return { error: passwordError };

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  return { success: "Password changed." };
}
```

- [ ] **Step 2: Write the forms component**

Create `src/app/profile/profile-forms.tsx`:
```tsx
"use client";

import { useActionState } from "react";
import { updateProfile, changePassword, type ProfileFormState } from "./actions";

const initialState: ProfileFormState = {};

export function ProfileForms({ username, email }: { username: string; email: string }) {
  const [profileState, profileAction, profilePending] = useActionState(updateProfile, initialState);
  const [passwordState, passwordAction, passwordPending] = useActionState(changePassword, initialState);

  return (
    <>
      <form
        action={profileAction}
        style={{ background: "#fffdfa", border: "1px solid #ece3d8", borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 10 }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Account details</h2>
        <input name="username" defaultValue={username} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ece3d8" }} />
        <input name="email" type="email" defaultValue={email} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ece3d8" }} />
        <button
          type="submit"
          disabled={profilePending}
          style={{ background: "#7c2d2d", color: "#fff", border: "none", borderRadius: 8, padding: "10px 14px", fontWeight: 700, cursor: profilePending ? "default" : "pointer" }}
        >
          Save
        </button>
        {profileState.error && <p style={{ color: "#7c2d2d", fontSize: 13, margin: 0 }}>{profileState.error}</p>}
        {profileState.success && <p style={{ color: "#3a6b4c", fontSize: 13, margin: 0 }}>{profileState.success}</p>}
      </form>

      <form
        action={passwordAction}
        style={{ background: "#fffdfa", border: "1px solid #ece3d8", borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 10 }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Change password</h2>
        <input name="currentPassword" type="password" placeholder="Current password" style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ece3d8" }} />
        <input name="newPassword" type="password" placeholder="New password" style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ece3d8" }} />
        <button
          type="submit"
          disabled={passwordPending}
          style={{ background: "#7c2d2d", color: "#fff", border: "none", borderRadius: 8, padding: "10px 14px", fontWeight: 700, cursor: passwordPending ? "default" : "pointer" }}
        >
          Change password
        </button>
        {passwordState.error && <p style={{ color: "#7c2d2d", fontSize: 13, margin: 0 }}>{passwordState.error}</p>}
        {passwordState.success && <p style={{ color: "#3a6b4c", fontSize: 13, margin: 0 }}>{passwordState.success}</p>}
      </form>
    </>
  );
}
```

- [ ] **Step 3: Write the page**

Create `src/app/profile/page.tsx`:
```tsx
import { requireUser } from "@/lib/dal";
import { getTripsForUser } from "@/lib/trip";
import { ProfileForms } from "./profile-forms";

export default async function ProfilePage() {
  const user = await requireUser();
  const trips = await getTripsForUser(user.id);

  return (
    <div style={{ minHeight: "100vh", background: "#f6f1ea", padding: "48px 28px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column", gap: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Your profile</h1>
        <ProfileForms username={user.username} email={user.email} />
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Your trips</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
            {trips.map((trip) => (
              <a
                key={trip.id}
                href={`/trips/${trip.slug}`}
                style={{ background: "#fffdfa", border: "1px solid #ece3d8", borderRadius: 10, padding: "10px 14px", fontWeight: 600 }}
              >
                {trip.name}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors anywhere in the project.

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: All `vitest` suites from Tasks 1, 2, 5, 6, 7 pass (35 tests total).

- [ ] **Step 6: Run lint**

Run: `npm run lint`
Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add src/app/profile
git commit -m "feat: add profile page (edit own details, change password, list own trips)"
```

---

### Task 20: Manual end-to-end verification

**Files:** none (manual verification pass; no code changes).

**Interfaces:** none — exercises the whole feature built in Tasks 1–19.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Expected: Server starts at `http://localhost:3000` with no errors.

- [ ] **Step 2: Verify unauthenticated redirect**

In a browser, visit `http://localhost:3000/`.
Expected: Redirected to `/login`.

- [ ] **Step 3: Log in as the seeded admin**

On `/login`, enter the admin email/password printed by the Task 4 seed run (default `tristan@example.com` / `ChangeMe123!` unless `ADMIN_EMAIL`/`ADMIN_PASSWORD` env vars were set). Leave "Remember me" unchecked.
Expected: Redirected to `/trips`, showing "Kyoto & Osaka" with a "Trip Leader" label.

- [ ] **Step 4: Open the trip and confirm Leader/Admin links**

Click into the trip.
Expected: Header shows the admin's username (linking to `/profile`), an "Admin" link, and a "Manage" link. Member pills show "Tristan" and "TestUser" with their colors. Expenses tab shows the same split/settle-up text as before, now driven by usernames.

- [ ] **Step 5: Verify admin user management**

Visit `/admin/users`.
Expected: Both seeded users listed; trip-access pills shown per user; editing a username/email and clicking Save persists (reload to confirm); "Remove user" is disabled for the currently logged-in admin.

- [ ] **Step 6: Verify trip-leader management**

Visit `/trips/kyoto-osaka/manage`.
Expected: Trip details form pre-filled; both members listed with a "Demote"/"Promote to Leader" toggle and a "Remove" action; the invite form accepts an email and returns a `/signup/...` link.

- [ ] **Step 7: Verify invite redemption**

Copy the `/signup/...` URL from Step 6 and open it in a private/incognito window.
Expected: Signup form shown with the invited email read-only; submitting a username and a password that satisfies the complexity rule creates the account, logs it in, and redirects to `/trips`, which now lists "Kyoto & Osaka".

- [ ] **Step 8: Verify an expired/used invite is rejected**

Reopen the same `/signup/...` URL from Step 7 a second time.
Expected: "This invite link is invalid or has expired" message (it was single-use).

- [ ] **Step 9: Verify the profile page**

While logged in as the account created in Step 7, visit `/profile`.
Expected: Own username/email editable; password change form present; "Your trips" lists "Kyoto & Osaka".

- [ ] **Step 10: Verify role gating**

While still logged in as the non-admin account from Step 7, attempt to visit `/admin/users` directly.
Expected: Redirected away (to `/trips`) — not shown the admin panel.

- [ ] **Step 11: Verify "remember me"**

Log out, then log back in as the admin with "Remember me" checked. Inspect the `session` cookie in browser dev tools.
Expected: Cookie has an `Expires`/`Max-Age` roughly 30 days out, versus no `Expires` (session cookie) when unchecked.

- [ ] **Step 12: Verify trip-access revocation**

From `/trips/kyoto-osaka/manage` (as the admin), click "Remove" on the TestUser member, then while logged in as TestUser (or via incognito), try to visit `/trips/kyoto-osaka`.
Expected: Redirected away from the trip — access denied.

No commit for this task (verification only). If any step fails, fix the underlying code in the relevant earlier task's files and re-run the failed step.
