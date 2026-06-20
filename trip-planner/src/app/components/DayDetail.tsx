"use client";

import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { FullTrip, DayWithActivities } from "@/lib/trip";
import { dayDate, fmtDate, fmtDow } from "@/lib/dates";
import { findConflicts } from "@/lib/time";
import { ActivityCard } from "./ActivityCard";
import { ActivityForm } from "./ActivityForm";
import type { ActivityDraft, EditingState } from "../types";

export function DayDetail({
  trip,
  day,
  dayIndex,
  dir,
  expandedIds,
  editing,
  draft,
  renamingDayId,
  dayTitleDraft,
  pending,
  onToggleExpand,
  onToggleDone,
  onStartEdit,
  onStartNew,
  onCancelEdit,
  onSaveEdit,
  onDeleteActivity,
  onDraftChange,
  onViewOnMap,
  onStartRename,
  onDayTitleInput,
  onSaveRename,
  onDeleteDay,
}: {
  trip: FullTrip;
  day: DayWithActivities;
  dayIndex: number;
  dir: number;
  expandedIds: Set<string>;
  editing: EditingState | null;
  draft: ActivityDraft | null;
  renamingDayId: string | null;
  dayTitleDraft: string;
  pending: boolean;
  onToggleExpand: (id: string) => void;
  onToggleDone: (id: string) => void;
  onStartEdit: (activityId: string) => void;
  onStartNew: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDeleteActivity: () => void;
  onDraftChange: (patch: Partial<ActivityDraft>) => void;
  onViewOnMap: (activityId: string) => void;
  onStartRename: () => void;
  onDayTitleInput: (v: string) => void;
  onSaveRename: () => void;
  onDeleteDay: () => void;
}) {
  const d = dayDate(trip.startDate, dayIndex);
  const isRenaming = renamingDayId === day.id;
  const editingHere = editing?.dayId === day.id;
  const addingNew = editingHere && editing?.activityId == null;
  const conflicts = findConflicts(day.activities.map((a) => a.time));
  const canDeleteDay = trip.days.length > 1;
  const showAddActivity = !editingHere;
  const dayEmpty = day.activities.length === 0 && !addingNew;

  return (
    <section style={{ flex: "3 1 460px", minWidth: 300 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0, fontSize: 25, fontWeight: 800, letterSpacing: "-0.025em", whiteSpace: "nowrap" }}>Day {dayIndex + 1}</h2>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#a09487", letterSpacing: "-0.01em" }}>
          {fmtDate(d)} &middot; {fmtDow(d)}
        </span>
        {isRenaming ? (
          <span style={{ display: "inline-flex", gap: 7, alignItems: "center" }}>
            <input
              value={dayTitleDraft}
              onChange={(e) => onDayTitleInput(e.target.value)}
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 15,
                fontWeight: 500,
                color: "#211b17",
                background: "#fff",
                border: "1px solid #7c2d2d",
                borderRadius: 7,
                padding: "5px 10px",
                outline: "none",
                minWidth: 190,
              }}
            />
            <button
              onClick={onSaveRename}
              disabled={pending}
              style={{
                appearance: "none",
                cursor: "pointer",
                fontSize: 12.5,
                fontWeight: 600,
                color: "#fff",
                background: "#7c2d2d",
                border: "none",
                padding: "7px 13px",
                borderRadius: 7,
              }}
            >
              Save
            </button>
          </span>
        ) : (
          <>
            <span style={{ fontSize: 16, color: "#6f655b", fontWeight: 500 }}>&mdash; {day.title}</span>
            <button
              onClick={onStartRename}
              style={{
                appearance: "none",
                cursor: "pointer",
                fontSize: 11.5,
                fontWeight: 600,
                color: "#a89c8d",
                background: "transparent",
                border: "none",
                padding: "3px 7px",
                borderRadius: 6,
              }}
            >
              Rename
            </button>
          </>
        )}
        {canDeleteDay && (
          <button
            onClick={onDeleteDay}
            style={{
              marginLeft: "auto",
              appearance: "none",
              cursor: "pointer",
              fontSize: 11.5,
              fontWeight: 600,
              color: "#b1452f",
              background: "transparent",
              border: "1px solid #ecc9bf",
              padding: "6px 12px",
              borderRadius: 7,
            }}
          >
            Delete day
          </button>
        )}
      </div>

      <div>
        <SortableContext items={day.activities.map((a) => a.id)} strategy={verticalListSortingStrategy}>
          {day.activities.map((activity, i) => {
            if (editing?.activityId === activity.id) {
              return (
                <ActivityForm
                  key={activity.id}
                  mode="edit"
                  draft={draft ?? { label: activity.label, time: activity.time, title: activity.title, place: activity.place, note: activity.note, ref: activity.ref }}
                  onChange={onDraftChange}
                  onSave={onSaveEdit}
                  onCancel={onCancelEdit}
                  onDelete={onDeleteActivity}
                  pending={pending}
                />
              );
            }
            return (
              <ActivityCard
                key={activity.id}
                activity={activity}
                dir={dir}
                isLast={i === day.activities.length - 1}
                hasConflict={conflicts[i]}
                expanded={expandedIds.has(activity.id)}
                dragDisabled={!!editing}
                onToggleExpand={() => onToggleExpand(activity.id)}
                onToggleDone={() => onToggleDone(activity.id)}
                onEdit={() => onStartEdit(activity.id)}
                onViewOnMap={() => onViewOnMap(activity.id)}
              />
            );
          })}
        </SortableContext>

        {addingNew && draft && (
          <ActivityForm mode="new" draft={draft} onChange={onDraftChange} onSave={onSaveEdit} onCancel={onCancelEdit} pending={pending} />
        )}

        {dayEmpty && <div style={{ textAlign: "center", padding: 18, color: "#b3a89b", fontSize: 13.5 }}>No activities yet for this day.</div>}

        {showAddActivity && (
          <button
            onClick={onStartNew}
            style={{
              appearance: "none",
              cursor: "pointer",
              width: "100%",
              fontSize: 13,
              fontWeight: 600,
              color: "#8a7e74",
              background: "transparent",
              border: "1px dashed #d8cab8",
              borderRadius: 11,
              padding: 13,
              marginTop: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
            }}
          >
            + Add activity
          </button>
        )}
      </div>
    </section>
  );
}
