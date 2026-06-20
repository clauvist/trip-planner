"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getFullTrip, type FullTrip } from "@/lib/trip";
import { ActivityLabel } from "@/generated/prisma/client";

export interface ActivityInput {
  label: ActivityLabel;
  time: string;
  title: string;
  place: string;
  note: string;
  ref: string;
}

async function tripIdForDay(dayId: string): Promise<string> {
  const day = await prisma.day.findUniqueOrThrow({ where: { id: dayId }, select: { tripId: true } });
  return day.tripId;
}

async function refreshed(tripId: string): Promise<FullTrip> {
  revalidatePath("/");
  return getFullTrip(tripId);
}

export async function addDay(tripId: string): Promise<FullTrip> {
  const count = await prisma.day.count({ where: { tripId } });
  await prisma.day.create({ data: { tripId, title: "New day", order: count } });
  return refreshed(tripId);
}

export async function renameDay(dayId: string, title: string): Promise<FullTrip> {
  const tripId = await tripIdForDay(dayId);
  const value = title.trim() || "Untitled day";
  await prisma.day.update({ where: { id: dayId }, data: { title: value } });
  return refreshed(tripId);
}

export async function deleteDay(dayId: string): Promise<FullTrip> {
  const tripId = await tripIdForDay(dayId);
  const count = await prisma.day.count({ where: { tripId } });
  if (count <= 1) return getFullTrip(tripId);

  await prisma.day.delete({ where: { id: dayId } });

  const remaining = await prisma.day.findMany({ where: { tripId }, orderBy: { order: "asc" } });
  await prisma.$transaction(
    remaining.map((d, i) => prisma.day.update({ where: { id: d.id }, data: { order: i } }))
  );

  return refreshed(tripId);
}

export async function addActivity(dayId: string, input: ActivityInput): Promise<FullTrip> {
  const tripId = await tripIdForDay(dayId);
  const title = input.title.trim();
  if (!title) return getFullTrip(tripId);

  const count = await prisma.activity.count({ where: { dayId } });
  await prisma.activity.create({
    data: {
      dayId,
      order: count,
      label: input.label,
      time: input.time.trim(),
      title,
      place: input.place.trim(),
      note: input.note.trim(),
      ref: input.ref.trim(),
    },
  });

  return refreshed(tripId);
}

export async function updateActivity(activityId: string, input: ActivityInput): Promise<FullTrip> {
  const activity = await prisma.activity.findUniqueOrThrow({
    where: { id: activityId },
    include: { day: true },
  });
  const tripId = activity.day.tripId;
  const title = input.title.trim();
  if (!title) return getFullTrip(tripId);

  await prisma.activity.update({
    where: { id: activityId },
    data: {
      label: input.label,
      time: input.time.trim(),
      title,
      place: input.place.trim(),
      note: input.note.trim(),
      ref: input.ref.trim(),
    },
  });

  return refreshed(tripId);
}

export async function deleteActivity(activityId: string): Promise<FullTrip> {
  const activity = await prisma.activity.findUniqueOrThrow({
    where: { id: activityId },
    include: { day: true },
  });
  const tripId = activity.day.tripId;

  await prisma.activity.delete({ where: { id: activityId } });

  const remaining = await prisma.activity.findMany({
    where: { dayId: activity.dayId },
    orderBy: { order: "asc" },
  });
  await prisma.$transaction(
    remaining.map((act, i) => prisma.activity.update({ where: { id: act.id }, data: { order: i } }))
  );

  return refreshed(tripId);
}

export async function toggleActivityDone(activityId: string): Promise<FullTrip> {
  const activity = await prisma.activity.findUniqueOrThrow({
    where: { id: activityId },
    include: { day: true },
  });
  const tripId = activity.day.tripId;

  await prisma.activity.update({ where: { id: activityId }, data: { done: !activity.done } });

  return refreshed(tripId);
}

/** Moves an activity to `toDayId` at `toIndex`, reindexing order in any affected day(s). */
export async function moveActivity(activityId: string, toDayId: string, toIndex: number): Promise<FullTrip> {
  const activity = await prisma.activity.findUniqueOrThrow({
    where: { id: activityId },
    include: { day: true },
  });
  const fromDayId = activity.dayId;
  const tripId = activity.day.tripId;

  if (fromDayId === toDayId) {
    const list = await prisma.activity.findMany({ where: { dayId: fromDayId }, orderBy: { order: "asc" } });
    const fromIdx = list.findIndex((a) => a.id === activityId);
    if (fromIdx < 0) return getFullTrip(tripId);
    const [card] = list.splice(fromIdx, 1);
    const ins = Math.max(0, Math.min(toIndex, list.length));
    list.splice(ins, 0, card);

    await prisma.$transaction(
      list.map((a, i) => prisma.activity.update({ where: { id: a.id }, data: { order: i } }))
    );
  } else {
    const fromList = await prisma.activity.findMany({ where: { dayId: fromDayId }, orderBy: { order: "asc" } });
    const toList = await prisma.activity.findMany({ where: { dayId: toDayId }, orderBy: { order: "asc" } });
    const fromIdx = fromList.findIndex((a) => a.id === activityId);
    if (fromIdx < 0) return getFullTrip(tripId);
    fromList.splice(fromIdx, 1);
    const ins = Math.max(0, Math.min(toIndex, toList.length));
    toList.splice(ins, 0, activity);

    await prisma.$transaction([
      prisma.activity.update({ where: { id: activityId }, data: { dayId: toDayId } }),
      ...fromList.map((a, i) => prisma.activity.update({ where: { id: a.id }, data: { order: i } })),
      ...toList.map((a, i) => prisma.activity.update({ where: { id: a.id }, data: { order: i } })),
    ]);
  }

  return refreshed(tripId);
}
