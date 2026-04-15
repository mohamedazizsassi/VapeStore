import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { COOKIE_NAME } from "@/lib/auth/session";

const PUBLIC = ["/login", "/api/login", "/manifest.webmanifest", "/favicon.ico"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }
  if (pathname.startsWith("/_next") || pathname.startsWith("/icon-")) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const secret = process.env.AUTH_JWT_SECRET;
  if (!token || !secret) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    const role = payload.role as string;
    const uid = payload.userId as string;
    if (!role || !uid) throw new Error("bad token");

    if (pathname.startsWith("/owner") && role !== "owner") {
      return NextResponse.redirect(new URL("/worker", req.url));
    }

    const res = NextResponse.next();
    res.headers.set("x-user-id", uid);
    res.headers.set("x-user-role", role);
    return res;
  } catch {
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = {
  matcher: ["/((?!api/health|_next/static|_next/image|icon-.*|manifest.webmanifest|favicon.ico).*)"],
};
