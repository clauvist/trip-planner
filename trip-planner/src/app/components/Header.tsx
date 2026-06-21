"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import type { FullTrip } from "@/lib/trip";
import { tripMeta } from "@/lib/dates";
import { logout } from "@/app/login/actions";
import type { Tab } from "../types";

const TABS: { key: Tab; label: string }[] = [
  { key: "itinerary", label: "Itinerary" },
  { key: "map", label: "Map" },
  { key: "bookings", label: "Bookings" },
  { key: "saved", label: "Saved" },
  { key: "expenses", label: "Expenses" },
];

export function Header({
  trip,
  tab,
  onChangeTab,
  currentUsername,
  isAdmin,
  isTripLeader,
}: {
  trip: FullTrip;
  tab: Tab;
  onChangeTab: (tab: Tab) => void;
  currentUsername: string;
  isAdmin: boolean;
  isTripLeader: boolean;
}) {
  const initial = trip.name.trim().charAt(0).toUpperCase() || "T";

  return (
    <header style={{ background: "#fffdfa", borderBottom: "1px solid #ece3d8", position: "sticky", top: 0, zIndex: 30 }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "18px 28px 0 28px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "#7c2d2d",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: 18,
                flex: "none",
                letterSpacing: "-0.02em",
              }}
            >
              {initial}
            </div>
            <div>
              <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1, whiteSpace: "nowrap" }}>
                {trip.name}
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#a09487", letterSpacing: "0.02em", marginTop: 4 }}>
                {tripMeta(trip.startDate, trip.days.length)}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {trip.members.map((m) => {
                const pill: CSSProperties = {
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  background: `oklch(0.97 0.02 ${m.hue})`,
                  border: `1px solid oklch(0.91 0.045 ${m.hue})`,
                  padding: "5px 12px 5px 8px",
                  borderRadius: 999,
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "#5f554c",
                };
                return (
                  <span key={m.id} style={pill}>
                    <span style={{ width: 18, height: 18, borderRadius: "50%", background: `oklch(0.58 0.10 ${m.hue})` }} />
                    {m.user.username}
                  </span>
                );
              })}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13, fontWeight: 600 }}>
              {isTripLeader && (
                <Link href={`/trips/${trip.slug}/manage`} style={{ color: "#5f554c" }}>
                  Manage
                </Link>
              )}
              {isAdmin && (
                <Link href="/admin/users" style={{ color: "#5f554c" }}>
                  Admin
                </Link>
              )}
              <Link href="/profile" style={{ color: "#211b17" }}>
                {currentUsername}
              </Link>
              <form action={logout}>
                <button
                  type="submit"
                  style={{ background: "none", border: "none", color: "#5f554c", cursor: "pointer", fontWeight: 600, fontSize: 13, padding: 0 }}
                >
                  Log out
                </button>
              </form>
            </div>
          </div>
        </div>
        <nav style={{ display: "flex", gap: 26, marginTop: 14, overflowX: "auto", borderBottom: "1px solid #ece3d8" }}>
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => onChangeTab(t.key)}
                style={{
                  appearance: "none",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: active ? 700 : 500,
                  color: active ? "#211b17" : "#9a8f84",
                  padding: "14px 2px",
                  borderBottom: active ? "2px solid #7c2d2d" : "2px solid transparent",
                  marginBottom: -1,
                  transition: "color .15s",
                  whiteSpace: "nowrap",
                }}
              >
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
