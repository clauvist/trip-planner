"use client";

import { useState, useTransition } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import type { FullTrip } from "@/lib/trip";
import { ActivityLabel } from "@/generated/prisma/browser";
import { Header } from "./components/Header";
import { ItineraryTab } from "./components/ItineraryTab";
import { MapTab } from "./components/MapTab";
import { BookingsTab } from "./components/BookingsTab";
import { SavedTab } from "./components/SavedTab";
import { ExpensesTab } from "./components/ExpensesTab";
import {
  addActivity,
  updateActivity,
  deleteActivity,
  toggleActivityDone,
  moveActivity,
  addDay,
  renameDay,
  deleteDay,
} from "./actions";
import type { Tab, ActivityDraft, EditingState } from "./types";

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
  const [trip, setTrip] = useState(initialTrip);
  const [tab, setTab] = useState<Tab>("itinerary");
  const [dir, setDir] = useState(0);
  const [selectedDayId, setSelectedDayId] = useState(initialTrip.days[0]?.id ?? "");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [mapSel, setMapSel] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [draft, setDraft] = useState<ActivityDraft | null>(null);
  const [renamingDayId, setRenamingDayId] = useState<string | null>(null);
  const [dayTitleDraft, setDayTitleDraft] = useState("");
  const [isPending, startTransition] = useTransition();

  function changeTab(t: Tab) {
    setTab(t);
    setEditing(null);
    setDraft(null);
    setRenamingDayId(null);
  }

  function changeDay(dayId: string) {
    setSelectedDayId(dayId);
    setEditing(null);
    setDraft(null);
    setRenamingDayId(null);
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleDone(activityId: string) {
    startTransition(async () => {
      const next = await toggleActivityDone(activityId);
      setTrip(next);
    });
  }

  function startNewActivity() {
    setEditing({ dayId: selectedDayId, activityId: null });
    setDraft({ label: ActivityLabel.MORNING, time: "", title: "", place: "", note: "", ref: "" });
    setRenamingDayId(null);
  }

  function startEditActivity(activityId: string) {
    const day = trip.days.find((d) => d.id === selectedDayId);
    const activity = day?.activities.find((a) => a.id === activityId);
    if (!activity) return;
    setEditing({ dayId: selectedDayId, activityId });
    setDraft({
      label: activity.label,
      time: activity.time,
      title: activity.title,
      place: activity.place,
      note: activity.note,
      ref: activity.ref,
    });
    setRenamingDayId(null);
  }

  function cancelEdit() {
    setEditing(null);
    setDraft(null);
  }

  function updateDraft(patch: Partial<ActivityDraft>) {
    setDraft((d) => (d ? { ...d, ...patch } : d));
  }

  function saveEdit() {
    if (!editing || !draft || !draft.title.trim()) {
      setEditing(null);
      setDraft(null);
      return;
    }
    const { dayId, activityId } = editing;
    const payload = draft;
    startTransition(async () => {
      const next = activityId == null ? await addActivity(dayId, payload) : await updateActivity(activityId, payload);
      setTrip(next);
      setEditing(null);
      setDraft(null);
    });
  }

  function deleteEditingActivity() {
    if (!editing?.activityId) return;
    const id = editing.activityId;
    startTransition(async () => {
      const next = await deleteActivity(id);
      setTrip(next);
      setEditing(null);
      setDraft(null);
    });
  }

  function handleAddDay() {
    startTransition(async () => {
      const next = await addDay(trip.id);
      setTrip(next);
      const newDay = next.days[next.days.length - 1];
      if (newDay) {
        setSelectedDayId(newDay.id);
        setTab("itinerary");
        setEditing(null);
        setDraft(null);
        setRenamingDayId(newDay.id);
        setDayTitleDraft(newDay.title);
      }
    });
  }

  function startRenameDay(dayId: string) {
    const day = trip.days.find((d) => d.id === dayId);
    if (!day) return;
    setRenamingDayId(dayId);
    setDayTitleDraft(day.title);
  }

  function saveRenameDay() {
    if (!renamingDayId) return;
    const id = renamingDayId;
    const value = dayTitleDraft;
    startTransition(async () => {
      const next = await renameDay(id, value);
      setTrip(next);
      setRenamingDayId(null);
    });
  }

  function handleDeleteDay(dayId: string) {
    if (trip.days.length <= 1) return;
    if (typeof window !== "undefined" && !window.confirm("Delete this day and all its activities?")) return;
    const idx = trip.days.findIndex((d) => d.id === dayId);
    startTransition(async () => {
      const next = await deleteDay(dayId);
      setTrip(next);
      if (selectedDayId === dayId) {
        const clamped = Math.max(0, Math.min(idx, next.days.length - 1));
        setSelectedDayId(next.days[clamped]?.id ?? "");
      }
    });
  }

  function viewOnMap(activityId: string) {
    setTab("map");
    setMapSel(activityId);
  }

  function handleDragOverReorder(dayId: string, activeId: string, overId: string) {
    setTrip((prev) => {
      const day = prev.days.find((d) => d.id === dayId);
      if (!day) return prev;
      const activeIndex = day.activities.findIndex((a) => a.id === activeId);
      const overIndex = day.activities.findIndex((a) => a.id === overId);
      if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) return prev;
      return {
        ...prev,
        days: prev.days.map((d) =>
          d.id === dayId ? { ...d, activities: arrayMove(d.activities, activeIndex, overIndex) } : d
        ),
      };
    });
  }

  function handleDragReorderEnd(dayId: string, activityId: string) {
    const day = trip.days.find((d) => d.id === dayId);
    const index = day?.activities.findIndex((a) => a.id === activityId) ?? -1;
    if (index === -1) return;
    startTransition(async () => {
      const next = await moveActivity(activityId, dayId, index);
      setTrip(next);
    });
  }

  function handleDragMoveToDay(activityId: string, fromDayId: string, toDayId: string) {
    if (fromDayId === toDayId) return;
    const fromDay = trip.days.find((d) => d.id === fromDayId);
    const toDay = trip.days.find((d) => d.id === toDayId);
    const activity = fromDay?.activities.find((a) => a.id === activityId);
    if (!fromDay || !toDay || !activity) return;
    const toIndex = toDay.activities.length;

    setTrip((prev) => ({
      ...prev,
      days: prev.days.map((d) => {
        if (d.id === fromDayId) return { ...d, activities: d.activities.filter((a) => a.id !== activityId) };
        if (d.id === toDayId) return { ...d, activities: [...d.activities, activity] };
        return d;
      }),
    }));

    startTransition(async () => {
      const next = await moveActivity(activityId, toDayId, toIndex);
      setTrip(next);
    });
  }

  function handleDragDelete(activityId: string, dayId: string) {
    setTrip((prev) => ({
      ...prev,
      days: prev.days.map((d) => (d.id === dayId ? { ...d, activities: d.activities.filter((a) => a.id !== activityId) } : d)),
    }));
    startTransition(async () => {
      const next = await deleteActivity(activityId);
      setTrip(next);
    });
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f6f1ea" }}>
      <Header
        trip={trip}
        tab={tab}
        onChangeTab={changeTab}
        currentUsername={currentUsername}
        isAdmin={isAdmin}
        isTripLeader={isTripLeader}
      />
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "24px 28px 64px 28px" }}>
        {tab === "itinerary" && (
          <ItineraryTab
            trip={trip}
            selectedDayId={selectedDayId}
            onSelectDay={changeDay}
            dir={dir}
            onDirChange={setDir}
            expandedIds={expandedIds}
            onToggleExpand={toggleExpand}
            editing={editing}
            draft={draft}
            onStartNew={startNewActivity}
            onStartEdit={startEditActivity}
            onCancelEdit={cancelEdit}
            onDraftChange={updateDraft}
            onSaveEdit={saveEdit}
            onDeleteActivity={deleteEditingActivity}
            onToggleDone={toggleDone}
            onViewOnMap={viewOnMap}
            renamingDayId={renamingDayId}
            dayTitleDraft={dayTitleDraft}
            onStartRenameDay={() => startRenameDay(selectedDayId)}
            onDayTitleInput={setDayTitleDraft}
            onSaveRenameDay={saveRenameDay}
            onAddDay={handleAddDay}
            onDeleteDay={handleDeleteDay}
            pending={isPending}
            onDragOverReorder={handleDragOverReorder}
            onDragReorderEnd={handleDragReorderEnd}
            onDragMoveToDay={handleDragMoveToDay}
            onDragDelete={handleDragDelete}
          />
        )}
        {tab === "map" && <MapTab trip={trip} selectedDayId={selectedDayId} onSelectDay={changeDay} mapSel={mapSel} onSelectStop={setMapSel} />}
        {tab === "bookings" && <BookingsTab trip={trip} />}
        {tab === "saved" && <SavedTab trip={trip} />}
        {tab === "expenses" && <ExpensesTab trip={trip} />}
      </div>
    </div>
  );
}
