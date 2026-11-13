import { CATEGORY_RATINGS, cleanRatings, isGemCategory, type GemCategory, type Ratings } from "@/lib/gems";

export type GemFields = {
  name: string;
  category: GemCategory;
  neighborhood: string | null;
  address: string | null;
  description: string | null;
  photo_url: string | null;
  hunt_week: string | null;
  ratings: Ratings;
  price: number | null;
  certified: boolean;
};

// Trim, cap length, and store blank fields as null rather than "".
function clean(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim().slice(0, max);
  return v || null;
}

function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

// Shared by the add (POST) and edit (PATCH) routes so both enforce the same rules.
export function parseGemInput(body: unknown): { ok: true; fields: GemFields } | { ok: false; error: string } {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;

  const name = clean(b.name, 120);
  if (!name) return { ok: false, error: "Name is required" };
  if (!isGemCategory(b.category)) return { ok: false, error: "Pick a valid category" };

  const photoUrl = clean(b.photoUrl, 2000);
  if (photoUrl && !isHttpUrl(photoUrl)) {
    return { ok: false, error: "Photo URL must start with http:// or https://" };
  }

  const price = b.price ?? null;
  if (price !== null && !(typeof price === "number" && Number.isInteger(price) && price >= 1 && price <= 4)) {
    return { ok: false, error: "Price must be 1 to 4" };
  }

  // Drop any rating that doesn't belong to this category (e.g. after switching it).
  const allowed = CATEGORY_RATINGS[b.category];
  const ratings = Object.fromEntries(
    Object.entries(cleanRatings(b.ratings)).filter(([key]) => (allowed as string[]).includes(key))
  ) as Ratings;

  return {
    ok: true,
    fields: {
      name,
      category: b.category,
      neighborhood: clean(b.neighborhood, 120),
      address: clean(b.address, 240),
      description: clean(b.description, 1000),
      photo_url: photoUrl,
      hunt_week: clean(b.huntWeek, 60),
      ratings,
      price,
      certified: b.certified === true,
    },
  };
}
