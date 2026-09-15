import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const UNAUTHORIZED = new NextResponse("Authentication required", {
  status: 401,
  headers: { "WWW-Authenticate": 'Basic realm="Scavenger Coin Admin"' },
});

export function proxy(request: NextRequest) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    // Never accidentally leave /admin wide open because someone forgot to
    // set the env var — fail closed, not open, for anything gated by this.
    return new NextResponse("Admin access is not configured", { status: 503 });
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Basic ")) {
    return UNAUTHORIZED;
  }

  const decoded = atob(authHeader.slice("Basic ".length));
  const password = decoded.slice(decoded.indexOf(":") + 1);

  if (password !== adminPassword) {
    return UNAUTHORIZED;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
