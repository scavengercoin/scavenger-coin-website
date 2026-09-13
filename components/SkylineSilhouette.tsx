// Deterministic hash so the same skyline renders on the server and during
// client hydration — Math.random() here would cause a mismatch.
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

const VIEW_W = 1440;
const VIEW_H = 240;
const BASELINE = 220;
// Buildings stay one near-invisible shade — a silhouette suggestion, not a
// feature in their own right. The gold logo glow is the hero's focal point.
const BUILDING_FILL = "#111111";
const WINDOW_GOLD = "#F5C518";
const WINDOW_BLUE = "#BFE3FF";



type Ledge = { w: number; h: number };
type Rect = { x: number; y: number; w: number; h: number; seed: number; ledge?: Ledge };

/**
 * Fills a horizontal span with architecturally varied buildings: thin towers,
 * wide low blocks, and mid-rises, some topped with an inset ledge/setback.
 */
function fillRange(startX: number, endX: number, seedOffset: number): Rect[] {
  const rects: Rect[] = [];
  let x = startX;
  let i = 0;
  while (x < endX) {
    const seed = seedOffset + i;
    const typeRoll = pseudoRandom(seed);
    let w: number;
    let h: number;
    if (typeRoll < 0.3) {
      // thin tower
      w = 18 + pseudoRandom(seed + 0.1) * 14;
      h = 120 + pseudoRandom(seed + 0.2) * 75;
    } else if (typeRoll < 0.65) {
      // wide low block
      w = 55 + pseudoRandom(seed + 0.1) * 30;
      h = 40 + pseudoRandom(seed + 0.2) * 45;
    } else {
      // mid-rise
      w = 34 + pseudoRandom(seed + 0.1) * 18;
      h = 85 + pseudoRandom(seed + 0.2) * 55;
    }
    w = Math.min(w, endX - x);
    const gap = pseudoRandom(seed + 0.66) * 5;

    let ledge: Ledge | undefined;
    if (pseudoRandom(seed + 0.8) > 0.65 && w > 24) {
      const inset = w * (0.15 + pseudoRandom(seed + 0.85) * 0.15);
      ledge = { w: w - inset * 2, h: 14 + pseudoRandom(seed + 0.9) * 22 };
    }

    rects.push({ x, y: BASELINE - h, w, h, seed, ledge });
    x += w + gap;
    i++;
  }
  return rects;
}

/** Tiny lit-window rects scattered across a building face; mostly warm gold
 * with a handful of cool blue-white "fluorescent office" windows mixed in. */
function Windows({ x, y, w, h, seed }: Rect) {
  const cellW = 10;
  const cellH = 13;
  const pad = 3;
  const cols = Math.max(1, Math.floor((w - pad * 2) / cellW));
  const rows = Math.max(1, Math.floor((h - pad * 2) / cellH));
  const windows = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cellSeed = seed * 131 + r * 17 + c * 7;
      if (pseudoRandom(cellSeed) > 0.52) {
        const isBlue = pseudoRandom(cellSeed + 0.6) > 0.82;
        windows.push(
          <rect
            key={`${r}-${c}`}
            x={x + pad + c * cellW}
            y={y + pad + r * cellH}
            width={3}
            height={4}
            fill={isBlue ? WINDOW_BLUE : WINDOW_GOLD}
            opacity={0.15 + pseudoRandom(cellSeed + 0.5) * 0.1}
          />
        );
      }
    }
  }
  return <>{windows}</>;
}

function Building({ x, y, w, h, seed, ledge }: Rect) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={BUILDING_FILL} />
      <Windows x={x} y={y} w={w} h={h} seed={seed} />
      {ledge && (
        <>
          <rect
            x={x + (w - ledge.w) / 2}
            y={y - ledge.h}
            width={ledge.w}
            height={ledge.h}
            fill={BUILDING_FILL}
          />
          <Windows
            x={x + (w - ledge.w) / 2}
            y={y - ledge.h}
            w={ledge.w}
            h={ledge.h}
            seed={seed + 0.4}
          />
        </>
      )}
    </g>
  );
}

// Landmarks sit in fixed gaps left in the generic skyline below.
const CHRYSLER_GAP = { start: 240, end: 320 };
const WTC_GAP = { start: 560, end: 650 };
const EMPIRE_GAP = { start: 900, end: 1000 };

const GENERIC_BUILDINGS = [
  ...fillRange(0, CHRYSLER_GAP.start, 1),
  ...fillRange(CHRYSLER_GAP.end, WTC_GAP.start, 40),
  ...fillRange(WTC_GAP.end, EMPIRE_GAP.start, 80),
  ...fillRange(EMPIRE_GAP.end, VIEW_W, 120),
];

function ChryslerBuilding() {
  const shaft: Rect = { x: 250, y: 90, w: 65, h: 130, seed: 501 };
  return (
    <g>
      <Building {...shaft} />
      {/* stepped Art Deco crown tapering to a needle spire */}
      <polygon points="250,90 315,90 306,72 259,72" fill={BUILDING_FILL} />
      <polygon points="259,72 306,72 298,55 267,55" fill={BUILDING_FILL} />
      <polygon points="267,55 298,55 282,15 282,15" fill={BUILDING_FILL} />
      <rect x={280.5} y={2} width={3} height={13} fill={BUILDING_FILL} />
    </g>
  );
}

function EmpireStateBuilding() {
  const shaft: Rect = { x: 925, y: 80, w: 70, h: 140, seed: 601 };
  return (
    <g>
      <Building {...shaft} />
      {/* setback tiers up to the antenna mast */}
      <rect x={937.5} y={50} width={45} height={30} fill={BUILDING_FILL} />
      <rect x={949} y={25} width={22} height={25} fill={BUILDING_FILL} />
      <rect x={958} y={4} width={4} height={21} fill={BUILDING_FILL} />
    </g>
  );
}

function OneWtcBuilding() {
  const seed = 701;
  const baseW = 66;
  const topW = 40;
  const baseX = 570;
  const shaftTopY = 55; // flat top of the tapering glass shaft
  return (
    <g>
      {/* tapering obelisk shaft, flat top (no crown), matches One WTC's massing */}
      <polygon
        points={`${baseX},${BASELINE} ${baseX + baseW},${BASELINE} ${baseX + baseW / 2 + topW / 2},${shaftTopY} ${baseX + baseW / 2 - topW / 2},${shaftTopY}`}
        fill={BUILDING_FILL}
      />
      <Windows x={baseX + 8} y={shaftTopY} w={baseW - 16} h={BASELINE - shaftTopY - 8} seed={seed} />
      {/* thin spire mast rising off the flat top */}
      <rect x={baseX + baseW / 2 - 1.5} y={shaftTopY - 45} width={3} height={45} fill={BUILDING_FILL} />
    </g>
  );
}

export function SkylineSilhouette() {
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-40 w-full sm:h-56"
    >
      <defs>
        {/* Near-black, matching the hero background exactly — no colored sky
            gradient here, just enough of a fade so the building bases don't
            hard-cut against the reflection strip below. */}
        <linearGradient id="waterGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#111111" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#0A0A0A" stopOpacity="0" />
        </linearGradient>
      </defs>

      {GENERIC_BUILDINGS.map((b) => (
        <Building key={b.seed} {...b} />
      ))}
      <ChryslerBuilding />
      <OneWtcBuilding />
      <EmpireStateBuilding />

      {/* Water reflection / shimmer along the very bottom edge */}
      <rect x={0} y={BASELINE} width={VIEW_W} height={VIEW_H - BASELINE} fill="url(#waterGradient)" />
      {Array.from({ length: 26 }, (_, i) => {
        const seed = 900 + i;
        const sx = pseudoRandom(seed) * VIEW_W;
        const sw = 20 + pseudoRandom(seed + 0.3) * 60;
        const sy = BASELINE + 2 + pseudoRandom(seed + 0.6) * (VIEW_H - BASELINE - 4);
        const isBlue = pseudoRandom(seed + 0.9) > 0.85;
        return (
          <rect
            key={seed}
            x={sx}
            y={sy}
            width={sw}
            height={1}
            fill={isBlue ? WINDOW_BLUE : WINDOW_GOLD}
            opacity={0.08 + pseudoRandom(seed + 0.2) * 0.12}
          />
        );
      })}
    </svg>
  );
}
