import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let ratelimit: Ratelimit | null | undefined;

function getRatelimit(): Ratelimit | null {
  if (ratelimit !== undefined) return ratelimit;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    console.warn(
      "UPSTASH_REDIS_REST_URL/TOKEN not set — claim API rate limiting is disabled (failing open)"
    );
    ratelimit = null;
    return ratelimit;
  }

  ratelimit = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(5, "1 m"),
    prefix: "scav-claim-api",
  });
  return ratelimit;
}

/**
 * 5 requests per minute per identifier (IP). If Upstash isn't configured,
 * this fails open (allows the request) rather than taking the whole API
 * down — losing rate limiting temporarily is far better than an outage.
 */
export async function checkRateLimit(identifier: string): Promise<boolean> {
  const rl = getRatelimit();
  if (!rl) return true;

  try {
    const { success } = await rl.limit(identifier);
    return success;
  } catch (err) {
    console.error("Rate limit check failed, allowing request through:", err);
    return true;
  }
}

export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
