import { getFullTripBySlug } from "@/lib/trip";
import { TripApp } from "./trip-app";

export default async function Home() {
  const trip = await getFullTripBySlug("kyoto-osaka");
  return <TripApp initialTrip={trip} />;
}
