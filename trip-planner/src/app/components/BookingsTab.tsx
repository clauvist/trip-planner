"use client";

import type { FullTrip } from "@/lib/trip";

export function BookingsTab({ trip }: { trip: FullTrip }) {
  const groups = new Map<string, FullTrip["bookings"]>();
  for (const b of trip.bookings) {
    const list = groups.get(b.groupName) ?? [];
    list.push(b);
    groups.set(b.groupName, list);
  }

  return (
    <div style={{ maxWidth: 680, display: "flex", flexDirection: "column", gap: 28 }}>
      {[...groups.entries()].map(([name, items]) => (
        <div key={name}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#a09487", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 11 }}>
            {name}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {items.map((b) => (
              <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 15, background: "#fffdfa", border: "1px solid #ece3d8", borderRadius: 13, padding: "15px 18px" }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    flex: "none",
                    borderRadius: 10,
                    background: "#f6eceb",
                    color: "#7c2d2d",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 17,
                  }}
                >
                  {b.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#211b17", letterSpacing: "-0.01em" }}>{b.title}</div>
                  <div style={{ fontSize: 12.5, color: "#8a7e74", marginTop: 2 }}>{b.sub}</div>
                </div>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11.5,
                    fontWeight: 600,
                    letterSpacing: "0.02em",
                    color: b.tbc ? "#b08968" : "#7c2d2d",
                    background: b.tbc ? "#f6ecde" : "#f6eceb",
                    padding: "4px 9px",
                    borderRadius: 6,
                    whiteSpace: "nowrap",
                  }}
                >
                  {b.ref}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
