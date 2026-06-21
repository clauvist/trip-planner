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
