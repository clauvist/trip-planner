import type { ActivityLabel } from "@/generated/prisma/client";

export type Tab = "itinerary" | "map" | "bookings" | "saved" | "expenses";

export interface ActivityDraft {
  label: ActivityLabel;
  time: string;
  title: string;
  place: string;
  note: string;
  ref: string;
}

export interface EditingState {
  dayId: string;
  activityId: string | null;
}
