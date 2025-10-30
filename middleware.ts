import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "cd_session";

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Allow static assets and all API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/public") ||
    pathname.startsWith("/icon-") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/sw.js" ||
    pathname.startsWith("/workbox-") ||
    pathname === "/offline" ||
    pathname.startsWith("/api/")
  ) {
    return NextResponse.next();
  }

  const hasSession = req.cookies.has(SESSION_COOKIE);

  // If user visits /login with a session, bounce them to home (or redirect target)
  if (pathname === "/login") {
    if (hasSession) {
      const redirectTo = req.nextUrl.searchParams.get("redirect");
      const url = req.nextUrl.clone();
      url.pathname = redirectTo || "/";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // For all other routes, require a session
  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    // Preserve the originally requested location for post-login redirect
    const dest = pathname + (search || "");
    url.searchParams.set("redirect", dest);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// No explicit matcher: we run on all routes and skip early for assets/API
