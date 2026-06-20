"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ActivityRecord } from "@/lib/trip";
import { chipColors, LABEL_DISPLAY } from "@/lib/labels";

const T_CFG = [
  { spine: true, thumb: false, titleSize: "16px", cardBg: "transparent", cardBorder: "1px solid transparent", cardRadius: "0", cardPad: "1px 0 18px 0", rowMargin: "0" },
  { spine: false, thumb: false, titleSize: "15.5px", cardBg: "#ffffff", cardBorder: "1px solid #ece4d9", cardRadius: "12px", cardPad: "14px 16px", rowMargin: "10px" },
  { spine: false, thumb: true, titleSize: "20px", cardBg: "transparent", cardBorder: "1px solid transparent", cardRadius: "0", cardPad: "2px 0 6px 0", rowMargin: "26px" },
] as const;

export function ActivityCard({
  activity,
  dir,
  isLast,
  hasConflict,
  expanded,
  dragDisabled,
  onToggleExpand,
  onToggleDone,
  onEdit,
  onViewOnMap,
}: {
  activity: ActivityRecord;
  dir: number;
  isLast: boolean;
  hasConflict: boolean;
  expanded: boolean;
  dragDisabled: boolean;
  onToggleExpand: () => void;
  onToggleDone: () => void;
  onEdit: () => void;
  onViewOnMap: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: activity.id,
    disabled: dragDisabled,
  });

  const cfg = T_CFG[dir] ?? T_CFG[0];
  const done = activity.done;
  const hasTime = !!activity.time;
  const hasPlace = !!activity.place;
  const hasNote = !!activity.note && activity.note !== "—";
  const hasRef = !!activity.ref;
  const chip = chipColors(activity.label);

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        marginBottom: cfg.rowMargin,
        position: "relative",
        cursor: dragDisabled ? "default" : "grab",
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      <div style={{ width: 78, flex: "none", textAlign: "right", paddingTop: 2 }}>
        {hasTime ? (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10.5,
              letterSpacing: "-0.03em",
              whiteSpace: "nowrap",
              lineHeight: 1.3,
              display: "inline-block",
              color: hasConflict ? "#c0392b" : "#8a7e74",
              fontWeight: hasConflict ? 700 : 400,
            }}
          >
            {activity.time}
          </span>
        ) : (
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#c9bdae" }}>&middot;&middot;</span>
        )}
      </div>
      <div style={{ position: "relative", width: 20, flex: "none", display: "flex", justifyContent: "center", alignSelf: "stretch" }}>
        {cfg.spine && !isLast && (
          <div style={{ position: "absolute", top: 23, bottom: -22, left: "50%", width: 2, background: "#e6ddd0", transform: "translateX(-50%)" }} />
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleDone();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            width: 20,
            height: 20,
            borderRadius: "50%",
            border: `2px solid ${done ? "#7c2d2d" : "#cdbfb0"}`,
            background: done ? "#7c2d2d" : "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
            flex: "none",
            transition: "all .15s",
            marginTop: 1,
          }}
        >
          {done && <span style={{ color: "#fff", fontSize: 11, lineHeight: 1, fontWeight: 700 }}>&#10003;</span>}
        </button>
      </div>
      <div
        style={{
          background: cfg.cardBg,
          border: cfg.cardBorder,
          borderRadius: cfg.cardRadius,
          padding: cfg.cardPad,
          flex: 1,
          minWidth: 0,
          display: "flex",
          gap: 14,
          alignItems: "flex-start",
        }}
      >
        <div
          onClick={onToggleExpand}
          onPointerDown={(e) => e.stopPropagation()}
          style={{ cursor: "pointer", display: "flex", flexDirection: "column", gap: 7, flex: 1, minWidth: 0 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", flex: 1, minWidth: 0 }}>
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
                  background: chip.background,
                  color: chip.color,
                  border: chip.border,
                  whiteSpace: "nowrap",
                  lineHeight: 1.4,
                }}
              >
                {LABEL_DISPLAY[activity.label]}
              </span>
              {hasRef && (
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    fontWeight: 600,
                    color: "#9a8f84",
                    background: "#f1e9dd",
                    padding: "2px 7px",
                    borderRadius: 5,
                    letterSpacing: "0.02em",
                  }}
                >
                  {activity.ref}
                </span>
              )}
            </div>
            {hasConflict && (
              <span
                title="Overlaps in time with another activity on this day"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 17,
                  height: 17,
                  borderRadius: 5,
                  background: "#fbeae6",
                  color: "#c0392b",
                  fontSize: 11,
                  fontWeight: 800,
                  lineHeight: 1,
                  flex: "none",
                  cursor: "help",
                }}
              >
                !
              </span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              style={{
                appearance: "none",
                cursor: "pointer",
                fontSize: 11.5,
                fontWeight: 600,
                color: "#a89c8d",
                background: "transparent",
                border: "none",
                padding: "3px 8px",
                borderRadius: 6,
                flex: "none",
              }}
            >
              Edit
            </button>
          </div>
          <div
            style={{
              fontWeight: 600,
              fontSize: cfg.titleSize,
              color: "#211b17",
              lineHeight: 1.3,
              letterSpacing: "-0.01em",
              textDecoration: done ? "line-through" : "none",
              opacity: done ? 0.4 : 1,
              margin: 0,
            }}
          >
            {activity.title}
          </div>
          {hasPlace && (
            <div style={{ fontSize: 12.5, color: "#9a8f84", display: "flex", alignItems: "center", gap: 6, lineHeight: 1.35 }}>
              <span style={{ color: "#c2b6a6", fontSize: 11 }}>&#9678;</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{activity.place}</span>
            </div>
          )}
          {expanded && (
            <div style={{ marginTop: 4, paddingTop: 11, borderTop: "1px dashed #e6ddd0", display: "flex", flexDirection: "column", gap: 11 }}>
              {hasNote && <div style={{ fontSize: 13, color: "#5f554c", lineHeight: 1.5 }}>{activity.note}</div>}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewOnMap();
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  style={{
                    appearance: "none",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#7c2d2d",
                    background: "#f6eceb",
                    border: "1px solid #f0dede",
                    padding: "6px 12px",
                    borderRadius: 7,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  &#9678; View on map
                </button>
                {hasRef && (
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: "#6f655b",
                      background: "#f1e9dd",
                      padding: "6px 11px",
                      borderRadius: 7,
                      display: "inline-flex",
                      alignItems: "center",
                    }}
                  >
                    Ref {activity.ref}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
        {cfg.thumb && (
          <div
            style={{
              width: 108,
              height: 78,
              flex: "none",
              borderRadius: 10,
              background: "repeating-linear-gradient(45deg,#efe7dc,#efe7dc 7px,#e8ddcc 7px,#e8ddcc 14px)",
              border: "1px solid #e6ddd0",
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "flex-start",
              padding: 6,
            }}
          >
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#a89c8d", background: "rgba(255,253,250,0.85)", padding: "2px 5px", borderRadius: 4 }}>
              photo
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
