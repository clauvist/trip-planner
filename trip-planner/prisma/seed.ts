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
