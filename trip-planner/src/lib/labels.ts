import { ActivityLabel, SavedCategory } from "@/generated/prisma/browser";

export const ACTIVITY_LABELS: ActivityLabel[] = [
  ActivityLabel.EARLY_MORNING,
  ActivityLabel.MORNING,
  ActivityLabel.COFFEE,
  ActivityLabel.LUNCH,
  ActivityLabel.AFTERNOON,
  ActivityLabel.DINNER,
  ActivityLabel.EVENING,
  ActivityLabel.LATE_EVENING,
  ActivityLabel.TRANSIT,
];

export const LABEL_DISPLAY: Record<ActivityLabel, string> = {
  EARLY_MORNING: "Early Morning",
  MORNING: "Morning",
  COFFEE: "Coffee",
  LUNCH: "Lunch",
  AFTERNOON: "Afternoon",
  DINNER: "Dinner",
  EVENING: "Evening",
  LATE_EVENING: "Late Evening",
  TRANSIT: "Transit",
};

const LABEL_HUE: Record<ActivityLabel, number> = {
  EARLY_MORNING: 280,
  MORNING: 75,
  COFFEE: 45,
  LUNCH: 150,
  AFTERNOON: 235,
  DINNER: 25,
  EVENING: 330,
  LATE_EVENING: 270,
  TRANSIT: 205,
};

export type ChipStyle = "tonal" | "solid" | "outline";

export function chipColors(label: ActivityLabel, style: ChipStyle = "tonal") {
  const h = LABEL_HUE[label] ?? 205;
  if (style === "solid") {
    return { background: `oklch(0.56 0.11 ${h})`, color: "#fff", border: "1px solid transparent" };
  }
  if (style === "outline") {
    return {
      background: "transparent",
      color: `oklch(0.46 0.10 ${h})`,
      border: `1px solid oklch(0.80 0.07 ${h})`,
    };
  }
  return {
    background: `oklch(0.95 0.035 ${h})`,
    color: `oklch(0.44 0.10 ${h})`,
    border: "1px solid transparent",
  };
}

const SAVED_CATEGORY_HUE: Record<SavedCategory, number> = {
  FOOD: 25,
  SIGHT: 150,
  SHOP: 235,
};

export const SAVED_CATEGORY_DISPLAY: Record<SavedCategory, string> = {
  FOOD: "Food",
  SIGHT: "Sight",
  SHOP: "Shop",
};

export function savedCategoryColors(cat: SavedCategory) {
  const h = SAVED_CATEGORY_HUE[cat];
  return { background: `oklch(0.95 0.035 ${h})`, color: `oklch(0.44 0.10 ${h})` };
}
