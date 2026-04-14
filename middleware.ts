import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const PUBLIC_PATHS = ["/login"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // API routes handle their own auth (return JSON 401 instead of HTML redirect).
  if (pathname.startsWith("/api")) return NextResponse.next();

  const hasSession = !!getSessionCookie(req, { cookiePrefix: "koku" });
  const isPublic = PUBLIC_PATHS.includes(pathname);

  if (!hasSession && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (hasSession && pathname === "/login") {
    const url = req.nextUrl.clone();
    url.pathname = "/clock";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Better Auth / jose pull CompressionStream via dynamic imports that the
// Edge runtime refuses. Pin to Node so the middleware can run them freely
// and silence the build-time warning.
export const runtime = "nodejs";

export const config = {
  matcher: [
    // Match everything except Next.js internals, static files, and the PWA
    // service worker. Route-group folders (`(app)`, `(auth)`) are invisible in
    // URLs so they don't need to be listed.
    "/((?!_next/|favicon\\.|icon-|icons/|images/|manifest\\.json|sw\\.js|sw-push\\.js|workbox-).*)",
  ],
};
