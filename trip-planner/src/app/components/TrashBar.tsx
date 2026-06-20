"use client";

import { useDroppable } from "@dnd-kit/core";

export function TrashBar({ visible }: { visible: boolean }) {
  const { isOver, setNodeRef } = useDroppable({ id: "trash" });

  return (
    <div
      ref={setNodeRef}
      style={{
        position: "fixed",
        left: "50%",
        bottom: 26,
        transform: isOver ? "translateX(-50%) scale(1.04)" : "translateX(-50%)",
        zIndex: 60,
        display: visible ? "flex" : "none",
        alignItems: "center",
        gap: 11,
        padding: "14px 24px",
        borderRadius: 14,
        fontSize: 13.5,
        fontWeight: 700,
        border: `2px dashed ${isOver ? "#7c2d2d" : "#e0b3a8"}`,
        background: isOver ? "#7c2d2d" : "rgba(255,253,250,0.97)",
        color: isOver ? "#fff" : "#b1452f",
        boxShadow: isOver ? "0 10px 34px rgba(124,45,45,0.34)" : "0 8px 24px rgba(60,40,20,0.14)",
        transition: "transform .15s, background .15s, color .15s, box-shadow .15s",
        backdropFilter: "blur(4px)",
      }}
    >
      <span style={{ width: 22, height: 22, borderRadius: "50%", border: "2px solid currentColor", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, flex: "none" }}>
        &#10005;
      </span>
      Release to delete this card
    </div>
  );
}
