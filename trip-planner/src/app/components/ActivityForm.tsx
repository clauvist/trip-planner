"use client";

import { ACTIVITY_LABELS, LABEL_DISPLAY } from "@/lib/labels";
import type { ActivityDraft } from "../types";

const fieldLabelStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 5,
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.04em",
  textTransform: "uppercase" as const,
  color: "#a09487",
};

const inputStyle = {
  width: "100%",
  fontFamily: "var(--font-sans)",
  fontSize: 13.5,
  color: "#211b17",
  background: "#fff",
  border: "1px solid #e3d6c6",
  borderRadius: 8,
  padding: "9px 11px",
  outline: "none",
};

const monoInputStyle = { ...inputStyle, fontFamily: "var(--font-mono)", fontSize: 13 };

export function ActivityForm({
  mode,
  draft,
  onChange,
  onSave,
  onCancel,
  onDelete,
  pending,
}: {
  mode: "new" | "edit";
  draft: ActivityDraft;
  onChange: (patch: Partial<ActivityDraft>) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
  pending: boolean;
}) {
  return (
    <div
      style={{
        background: "#fffdfa",
        border: "1px solid #e3d6c6",
        borderRadius: 13,
        padding: 16,
        marginBottom: 12,
        boxShadow: "0 6px 22px rgba(60,40,20,0.08)",
        display: "flex",
        flexDirection: "column",
        gap: 13,
      }}
    >
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: "#7c2d2d", fontWeight: 600 }}>
        {mode === "new" ? "New activity" : "Edit activity"}
      </div>
      <div style={{ display: "flex", gap: 11, flexWrap: "wrap" }}>
        <label style={{ ...fieldLabelStyle, flex: 2, minWidth: 150 }}>
          Label
          <select
            value={draft.label}
            onChange={(e) => onChange({ label: e.target.value as ActivityDraft["label"] })}
            style={{ ...inputStyle, cursor: "pointer" }}
          >
            {ACTIVITY_LABELS.map((l) => (
              <option key={l} value={l}>
                {LABEL_DISPLAY[l]}
              </option>
            ))}
          </select>
        </label>
        <label style={{ ...fieldLabelStyle, flex: 1, minWidth: 110 }}>
          Time
          <input
            value={draft.time}
            onChange={(e) => onChange({ time: e.target.value })}
            placeholder="e.g. 1000h"
            style={monoInputStyle}
          />
        </label>
      </div>
      <label style={fieldLabelStyle}>
        Title
        <input
          value={draft.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="What's the plan?"
          style={inputStyle}
        />
      </label>
      <label style={fieldLabelStyle}>
        Location
        <input
          value={draft.place}
          onChange={(e) => onChange({ place: e.target.value })}
          placeholder="Address or area"
          style={inputStyle}
        />
      </label>
      <label style={fieldLabelStyle}>
        Notes
        <textarea
          value={draft.note}
          onChange={(e) => onChange({ note: e.target.value })}
          rows={2}
          placeholder="Hours, tips, reservations…"
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.45 }}
        />
      </label>
      <label style={fieldLabelStyle}>
        Booking ref
        <input value={draft.ref} onChange={(e) => onChange({ ref: e.target.value })} placeholder="optional" style={monoInputStyle} />
      </label>
      <div style={{ display: "flex", gap: 8, alignItems: "center", paddingTop: 2 }}>
        <button
          onClick={onSave}
          disabled={pending}
          style={{
            appearance: "none",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
            color: "#fff",
            background: "#7c2d2d",
            border: "none",
            padding: "9px 16px",
            borderRadius: 8,
          }}
        >
          {mode === "new" ? "Add activity" : "Save changes"}
        </button>
        <button
          onClick={onCancel}
          style={{
            appearance: "none",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
            color: "#6f655b",
            background: "transparent",
            border: "1px solid #e3d6c6",
            padding: "9px 14px",
            borderRadius: 8,
          }}
        >
          Cancel
        </button>
        <span style={{ flex: 1 }} />
        {onDelete && (
          <button
            onClick={onDelete}
            disabled={pending}
            style={{
              appearance: "none",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              color: "#b1452f",
              background: "transparent",
              border: "1px solid #ecc9bf",
              padding: "9px 14px",
              borderRadius: 8,
            }}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
