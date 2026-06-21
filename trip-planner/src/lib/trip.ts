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
