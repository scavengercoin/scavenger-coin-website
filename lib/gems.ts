export const GEM_CATEGORIES = ["cafe", "lunch", "dinner", "bar", "sunset", "landmark"] as const;
export type GemCategory = (typeof GEM_CATEGORIES)[number];

export const CATEGORY_META: Record<GemCategory, { label: string; emoji: string }> = {
  cafe: { label: "Cafe", emoji: "☕" },
  lunch: { label: "Lunch", emoji: "🥪" },
  dinner: { label: "Dinner", emoji: "🍽️" },
  bar: { label: "Bar", emoji: "🍸" },
  sunset: { label: "Sunset", emoji: "🌇" },
  landmark: { label: "Landmark", emoji: "🗽" },
};

export type Gem = {
  id: string;
  name: string;
  category: GemCategory;
  neighborhood: string | null;
  address: string | null;
  description: string | null;
  photo_url: string | null;
  hunt_week: string | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
};

export function isGemCategory(value: unknown): value is GemCategory {
  return typeof value === "string" && (GEM_CATEGORIES as readonly string[]).includes(value);
}

// hunt_week uses the same labels as coins.week ("hunt-002"), so show those as
// "Hunt #2"; anything without a number is shown as typed.
export function huntLabel(week: string): string {
  const m = week.match(/\d+/);
  return m ? `Hunt #${parseInt(m[0], 10)}` : week;
}
