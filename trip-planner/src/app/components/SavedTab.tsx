"use client";

import type { FullTrip } from "@/lib/trip";
import { savedCategoryColors, SAVED_CATEGORY_DISPLAY } from "@/lib/labels";

export function SavedTab({ trip }: { trip: FullTrip }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
      {trip.savedPlaces.map((p) => {
        const colors = savedCategoryColors(p.category);
        return (
          <div key={p.id} style={{ background: "#fffdfa", border: "1px solid #ece3d8", borderRadius: 14, overflow: "hidden" }}>
            <div
              style={{
                height: 118,
                background: "repeating-linear-gradient(45deg,#efe7dc,#efe7dc 8px,#e8ddcc 8px,#e8ddcc 16px)",
                display: "flex",
                alignItems: "flex-end",
                padding: 9,
              }}
            >
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#a89c8d", background: "rgba(255,253,250,0.85)", padding: "2px 6px", borderRadius: 4 }}>
                photo
              </span>
            </div>
            <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "3px 9px",
                  borderRadius: 999,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  width: "fit-content",
                  ...colors,
                }}
              >
                {SAVED_CATEGORY_DISPLAY[p.category]}
              </span>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#211b17", letterSpacing: "-0.01em", lineHeight: 1.25 }}>{p.name}</div>
              <div style={{ fontSize: 12.5, color: "#8a7e74", lineHeight: 1.4 }}>{p.note}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
