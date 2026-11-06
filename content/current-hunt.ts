// Edit this each week when a new spotlight goes live — no code changes needed
// elsewhere, the homepage reads straight from here.
export const currentHunt = {
  status: "UPCOMING" as const, // "UPCOMING" (before the drop) | "ACTIVE" | "PAUSED" | "ENDED"
  neighborhood: "Chelsea",
  // When the coin drops. Explicit New York offset (EST, UTC-5, until DST starts
  // in March) so the countdown is the same for every visitor.
  dropsAt: "2026-11-14T09:00:00-05:00", // Saturday, Nov 14, 2026, 9:00 AM ET
};
