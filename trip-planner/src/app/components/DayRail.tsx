"use client";

import { useDroppable } from "@dnd-kit/core";
import type { FullTrip, DayWithActivities } from "@/lib/trip";
import { dayDate, fmtDate, fmtDow } from "@/lib/dates";
import styles from "./DayRail.module.css";

function DayButton({
  trip,
  day,
  index,
  active,
  onSelect,
}: {
  trip: FullTrip;
  day: DayWithActivities;
  index: number;
  active: boolean;
  onSelect: () => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: `day:${day.id}` });
  const d = dayDate(trip.startDate, index);
  const total = day.activities.length;
  const done = day.activities.filter((a) => a.done).length;

  return (
    <button
      ref={setNodeRef}
      onClick={onSelect}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 3,
        width: "100%",
        textAlign: "left",
        appearance: "none",
        cursor: "pointer",
        padding: "11px 12px 11px 13px",
        borderRadius: 9,
        border: `1px solid ${isOver ? "#7c2d2d" : active ? "#ecdfd0" : "transparent"}`,
        background: isOver ? "#faf0ee" : active ? "#ffffff" : "transparent",
        borderLeft: active ? "3px solid #7c2d2d" : "3px solid transparent",
        boxShadow: active ? "0 1px 2px rgba(40,30,20,0.05)" : "none",
        transition: "all .15s",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: active ? "#211b17" : "#4a4138" }}>Day {index + 1}</span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: done === total && total > 0 ? "#5b8a5b" : "#b3a89b",
            fontWeight: 600,
          }}
        >
          {done}/{total}
        </span>
      </div>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "-0.02em", color: "#a89c8f", textTransform: "uppercase" }}>
        {fmtDate(d)} &middot; {fmtDow(d)}
      </span>
      <span style={{ fontSize: 11.5, color: "#8a7e74", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {day.title}
      </span>
    </button>
  );
}

export function DayRail({
  trip,
  selectedDayId,
  onSelectDay,
  onAddDay,
  pending,
}: {
  trip: FullTrip;
  selectedDayId: string;
  onSelectDay: (dayId: string) => void;
  onAddDay: () => void;
  pending: boolean;
}) {
  return (
    <aside
      className={styles.rail}
      style={{ flex: "1 1 178px", minWidth: 170, maxWidth: 222, display: "flex", flexDirection: "column", gap: 5 }}
    >
      {trip.days.map((day, i) => (
        <DayButton key={day.id} trip={trip} day={day} index={i} active={day.id === selectedDayId} onSelect={() => onSelectDay(day.id)} />
      ))}
      <button
        onClick={onAddDay}
        disabled={pending}
        style={{
          appearance: "none",
          cursor: "pointer",
          width: "100%",
          fontSize: 12.5,
          fontWeight: 600,
          color: "#8a7e74",
          background: "transparent",
          border: "1px dashed #d8cab8",
          borderRadius: 9,
          padding: 11,
          marginTop: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
        }}
      >
        + Add day
      </button>
    </aside>
  );
}
