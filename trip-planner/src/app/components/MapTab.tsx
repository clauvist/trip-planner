"use client";

import type { FullTrip } from "@/lib/trip";
import { dayDate, fmtDate, fmtDow } from "@/lib/dates";
import { chipColors, LABEL_DISPLAY } from "@/lib/labels";

const COORDS: [number, number][] = [
  [24, 28],
  [43, 20],
  [60, 34],
  [75, 24],
  [33, 52],
  [54, 60],
  [77, 55],
  [28, 74],
  [48, 82],
  [67, 76],
  [40, 40],
  [62, 46],
];

export function MapTab({
  trip,
  selectedDayId,
  onSelectDay,
  mapSel,
  onSelectStop,
}: {
  trip: FullTrip;
  selectedDayId: string;
  onSelectDay: (dayId: string) => void;
  mapSel: string | null;
  onSelectStop: (activityId: string) => void;
}) {
  const dayIndex = Math.max(0, trip.days.findIndex((d) => d.id === selectedDayId));
  const day = trip.days[dayIndex];
  const d = dayDate(trip.startDate, dayIndex);

  return (
    <div>
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 14, marginBottom: 6 }}>
        {trip.days.map((dd, i) => {
          const active = dd.id === selectedDayId;
          return (
            <button
              key={dd.id}
              onClick={() => onSelectDay(dd.id)}
              style={{
                appearance: "none",
                cursor: "pointer",
                whiteSpace: "nowrap",
                padding: "7px 12px",
                borderRadius: 999,
                border: `1px solid ${active ? "#7c2d2d" : "#e6ddd2"}`,
                background: active ? "#7c2d2d" : "#fff",
                color: active ? "#fff" : "#6f655b",
                fontSize: 12,
                fontWeight: 600,
                transition: "all .15s",
              }}
            >
              Day {i + 1}
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 22, alignItems: "stretch", flexWrap: "wrap" }}>
        <div
          style={{
            flex: "2 1 440px",
            minWidth: 300,
            minHeight: 440,
            position: "relative",
            borderRadius: 16,
            overflow: "hidden",
            border: "1px solid #e1e3da",
            background: "#eceee7",
            backgroundImage: "linear-gradient(#e1e4da 1px,transparent 1px),linear-gradient(90deg,#e1e4da 1px,transparent 1px)",
            backgroundSize: "30px 30px",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(125deg,transparent 0%,transparent 38%,#d9e6e8 38%,#d9e6e8 52%,transparent 52%)",
              opacity: 0.7,
            }}
          />
          <div style={{ position: "absolute", left: "8%", top: "55%", width: "30%", height: "34%", background: "#dde7d6", borderRadius: "40% 55% 45% 50%", opacity: 0.7 }} />
          <div style={{ position: "absolute", right: "10%", top: "8%", width: "24%", height: "26%", background: "#dde7d6", borderRadius: "50% 45% 55% 40%", opacity: 0.6 }} />
          {day.activities.map((a, i) => {
            const sel = mapSel === a.id;
            const c = COORDS[i % COORDS.length];
            return (
              <button
                key={a.id}
                onClick={() => onSelectStop(a.id)}
                style={{
                  position: "absolute",
                  left: `${c[0]}%`,
                  top: `${c[1]}%`,
                  transform: "translate(-50%,-50%)",
                  width: 27,
                  height: 27,
                  borderRadius: "50% 50% 50% 2px",
                  rotate: "45deg",
                  background: sel ? "#7c2d2d" : "#fff",
                  border: "2px solid #7c2d2d",
                  cursor: "pointer",
                  boxShadow: "0 3px 8px rgba(60,30,20,0.22)",
                  zIndex: sel ? 6 : 2,
                  transition: "all .15s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span style={{ rotate: "-45deg", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: sel ? "#fff" : "#7c2d2d" }}>
                  {i + 1}
                </span>
              </button>
            );
          })}
          <div
            style={{
              position: "absolute",
              left: 14,
              bottom: 12,
              fontFamily: "var(--font-mono)",
              fontSize: 9.5,
              color: "#8a8f82",
              background: "rgba(255,255,255,0.7)",
              padding: "4px 8px",
              borderRadius: 6,
            }}
          >
            illustrative &mdash; connect a map provider for live pins
          </div>
        </div>
        <div style={{ flex: "1 1 280px", minWidth: 250, background: "#fffdfa", border: "1px solid #ece3d8", borderRadius: 16, padding: 16, alignSelf: "flex-start" }}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "#a09487",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              marginBottom: 10,
              padding: "0 4px",
            }}
          >
            {fmtDate(d)} &middot; {fmtDow(d)} &middot; Stops
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {day.activities.map((a, i) => {
              const sel = mapSel === a.id;
              const chip = chipColors(a.label);
              return (
                <div
                  key={a.id}
                  onClick={() => onSelectStop(a.id)}
                  style={{
                    display: "flex",
                    gap: 11,
                    alignItems: "center",
                    padding: "9px 10px",
                    borderRadius: 9,
                    cursor: "pointer",
                    background: sel ? "#f4eae9" : "transparent",
                    border: `1px solid ${sel ? "#ecdcda" : "transparent"}`,
                    transition: "all .12s",
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      flex: "none",
                      borderRadius: "50%",
                      background: sel ? "#7c2d2d" : "#efe7dc",
                      color: sel ? "#fff" : "#7c2d2d",
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {i + 1}
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
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
                        ...chip,
                      }}
                    >
                      {LABEL_DISPLAY[a.label]}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#332b24", lineHeight: 1.25 }}>{a.title}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
