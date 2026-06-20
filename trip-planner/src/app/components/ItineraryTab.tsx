"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type { FullTrip } from "@/lib/trip";
import { chipColors, LABEL_DISPLAY } from "@/lib/labels";
import { DayRail } from "./DayRail";
import { DayDetail } from "./DayDetail";
import { TrashBar } from "./TrashBar";
import type { ActivityDraft, EditingState } from "../types";

const DIRS = ["Timeline", "Cards", "Editorial"];

export function ItineraryTab({
  trip,
  selectedDayId,
  onSelectDay,
  dir,
  onDirChange,
  expandedIds,
  onToggleExpand,
  editing,
  draft,
  onStartNew,
  onStartEdit,
  onCancelEdit,
  onDraftChange,
  onSaveEdit,
  onDeleteActivity,
  onToggleDone,
  onViewOnMap,
  renamingDayId,
  dayTitleDraft,
  onStartRenameDay,
  onDayTitleInput,
  onSaveRenameDay,
  onAddDay,
  onDeleteDay,
  pending,
  onDragOverReorder,
  onDragReorderEnd,
  onDragMoveToDay,
  onDragDelete,
}: {
  trip: FullTrip;
  selectedDayId: string;
  onSelectDay: (dayId: string) => void;
  dir: number;
  onDirChange: (dir: number) => void;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  editing: EditingState | null;
  draft: ActivityDraft | null;
  onStartNew: () => void;
  onStartEdit: (activityId: string) => void;
  onCancelEdit: () => void;
  onDraftChange: (patch: Partial<ActivityDraft>) => void;
  onSaveEdit: () => void;
  onDeleteActivity: () => void;
  onToggleDone: (activityId: string) => void;
  onViewOnMap: (activityId: string) => void;
  renamingDayId: string | null;
  dayTitleDraft: string;
  onStartRenameDay: () => void;
  onDayTitleInput: (v: string) => void;
  onSaveRenameDay: () => void;
  onAddDay: () => void;
  onDeleteDay: (dayId: string) => void;
  pending: boolean;
  onDragOverReorder: (dayId: string, activeId: string, overId: string) => void;
  onDragReorderEnd: (dayId: string, activityId: string) => void;
  onDragMoveToDay: (activityId: string, fromDayId: string, toDayId: string) => void;
  onDragDelete: (activityId: string, dayId: string) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const dayIndex = Math.max(0, trip.days.findIndex((d) => d.id === selectedDayId));
  const day = trip.days[dayIndex];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const total = day.activities.length;
  const done = day.activities.filter((a) => a.done).length;
  const progressPct = total ? Math.round((done / total) * 100) : 0;

  const activeActivity = activeId ? day.activities.find((a) => a.id === activeId) ?? null : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const overId = String(over.id);
    if (overId.startsWith("day:") || overId === "trash") return;
    if (active.id === over.id) return;
    onDragOverReorder(day.id, String(active.id), overId);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;
    const activityId = String(active.id);
    const overId = String(over.id);
    if (overId === "trash") {
      onDragDelete(activityId, day.id);
      return;
    }
    if (overId.startsWith("day:")) {
      const targetDayId = overId.slice(4);
      onDragMoveToDay(activityId, day.id, targetDayId);
      return;
    }
    onDragReorderEnd(day.id, activityId);
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
          <div style={{ display: "inline-flex", gap: 3, background: "#ece3d8", padding: 3, borderRadius: 9 }}>
            {DIRS.map((name, i) => {
              const active = dir === i;
              return (
                <button
                  key={name}
                  onClick={() => onDirChange(i)}
                  style={{
                    appearance: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: active ? "#211b17" : "#8a7e74",
                    background: active ? "#ffffff" : "transparent",
                    boxShadow: active ? "0 1px 2px rgba(40,30,20,0.08)" : "none",
                    padding: "6px 13px",
                    borderRadius: 7,
                    transition: "all .15s",
                  }}
                >
                  {name}
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <div style={{ width: 120, height: 6, background: "#e7ddd0", borderRadius: 999, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progressPct}%`, background: "#7c2d2d", borderRadius: 999, transition: "width .3s ease" }} />
            </div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "#8a7e74", fontWeight: 500, whiteSpace: "nowrap" }}>
              {done} / {total} done
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 26, alignItems: "flex-start", flexWrap: "wrap" }}>
          <DayRail trip={trip} selectedDayId={day.id} onSelectDay={onSelectDay} onAddDay={onAddDay} pending={pending} />
          <DayDetail
            trip={trip}
            day={day}
            dayIndex={dayIndex}
            dir={dir}
            expandedIds={expandedIds}
            editing={editing}
            draft={draft}
            renamingDayId={renamingDayId}
            dayTitleDraft={dayTitleDraft}
            pending={pending}
            onToggleExpand={onToggleExpand}
            onToggleDone={onToggleDone}
            onStartEdit={onStartEdit}
            onStartNew={onStartNew}
            onCancelEdit={onCancelEdit}
            onSaveEdit={onSaveEdit}
            onDeleteActivity={onDeleteActivity}
            onDraftChange={onDraftChange}
            onViewOnMap={onViewOnMap}
            onStartRename={onStartRenameDay}
            onDayTitleInput={onDayTitleInput}
            onSaveRename={onSaveRenameDay}
            onDeleteDay={() => onDeleteDay(day.id)}
          />
        </div>
      </div>

      <TrashBar visible={activeId != null} />

      <DragOverlay>
        {activeActivity && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              background: "#fffdfa",
              border: "1px solid #e3d6c6",
              borderRadius: 10,
              padding: "10px 14px",
              boxShadow: "0 10px 30px rgba(60,40,20,0.18)",
              maxWidth: 320,
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "3px 9px",
                borderRadius: 999,
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: "0.02em",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
                ...chipColors(activeActivity.label),
              }}
            >
              {LABEL_DISPLAY[activeActivity.label]}
            </span>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: "#211b17", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {activeActivity.title}
            </span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
