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

// Star ratings (1-5). Which dimensions apply depends on the category, plus a
// generic "overall" for spots that only get a single score.
export const RATING_KEYS = ["beauty", "novelty", "ambiance", "food", "drinks", "coffee", "pastries", "overall"] as const;
export type RatingKey = (typeof RATING_KEYS)[number];
export type Ratings = Partial<Record<RatingKey, number>>;

export const RATING_LABELS: Record<RatingKey, string> = {
  beauty: "Beauty",
  novelty: "Novelty",
  ambiance: "Ambiance",
  food: "Food",
  drinks: "Drinks",
  coffee: "Coffee",
  pastries: "Pastries",
  overall: "Overall",
};

export const CATEGORY_RATINGS: Record<GemCategory, RatingKey[]> = {
  cafe: ["ambiance", "coffee", "pastries", "overall"],
  lunch: ["ambiance", "food", "drinks", "overall"],
  dinner: ["ambiance", "food", "drinks", "overall"],
  bar: ["ambiance", "drinks", "overall"],
  sunset: ["beauty", "novelty", "overall"],
  landmark: ["beauty", "novelty", "overall"],
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
  ratings: Ratings | null;
  price: number | null; // 1-5, shown as $ out of $$$$$
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

// Keep only known keys with whole-number values from 1 to 5.
export function cleanRatings(input: unknown): Ratings {
  const out: Ratings = {};
  if (!input || typeof input !== "object") return out;
  for (const key of RATING_KEYS) {
    const v = (input as Record<string, unknown>)[key];
    if (typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 5) out[key] = v;
  }
  return out;
}
