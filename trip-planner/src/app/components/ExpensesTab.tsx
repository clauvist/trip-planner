"use client";

import type { FullTrip } from "@/lib/trip";
import { yen } from "@/lib/money";

export function ExpensesTab({ trip }: { trip: FullTrip }) {
  const total = trip.expenses.reduce((sum, e) => sum + e.amountYen, 0);
  const paidByMember = new Map<string, number>();
  for (const e of trip.expenses) {
    paidByMember.set(e.paidById, (paidByMember.get(e.paidById) ?? 0) + e.amountYen);
  }
  const share = trip.members.length ? total / trip.members.length : 0;

  let settleText = "";
  if (trip.members.length === 2) {
    const [a, b] = trip.members;
    const paidA = paidByMember.get(a.id) ?? 0;
    const diff = Math.round(Math.abs(paidA - share));
    settleText =
      paidA < share
        ? `${a.user.username} owes ${b.user.username} ${yen(diff)}`
        : `${b.user.username} owes ${a.user.username} ${yen(diff)}`;
  }

  return (
    <div style={{ maxWidth: 620 }}>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 22 }}>
        <div style={{ flex: "1 1 180px", background: "#7c2d2d", color: "#fff", borderRadius: 14, padding: "18px 20px" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.75 }}>
            Trip total
          </div>
          <div style={{ fontSize: 27, fontWeight: 800, letterSpacing: "-0.02em", marginTop: 6 }}>{yen(total)}</div>
        </div>
        <div
          style={{
            flex: "1 1 180px",
            background: "#fffdfa",
            border: "1px solid #ece3d8",
            borderRadius: 14,
            padding: "18px 20px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 7,
          }}
        >
          {trip.members.map((m) => (
            <div key={m.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: "#6f655b", display: "inline-flex", alignItems: "center", gap: 7 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: `oklch(0.58 0.10 ${m.hue})` }} />
                {m.user.username} paid
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{yen(paidByMember.get(m.id) ?? 0)}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: "#fffdfa", border: "1px solid #ece3d8", borderRadius: 14, overflow: "hidden" }}>
        {trip.expenses.map((e) => (
          <div
            key={e.id}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: "14px 18px", borderBottom: "1px solid #f2ebe1" }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#211b17" }}>{e.item}</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: "#5f554c" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: `oklch(0.58 0.10 ${e.paidBy.hue})` }} />
                {e.paidBy.user.username}
              </span>
            </div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: "#332b24", whiteSpace: "nowrap" }}>{yen(e.amountYen)}</span>
          </div>
        ))}
        {settleText && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: "15px 18px", background: "#faf4ec" }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: "#7c2d2d" }}>{settleText}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#a09487" }}>split evenly</span>
          </div>
        )}
      </div>
    </div>
  );
}
