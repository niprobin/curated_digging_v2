import { NextResponse } from "next/server";

const PASSCODE = process.env.AUTH_PASSCODE || "19931029RPJL";
const SESSION_COOKIE = "cd_session";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { passcode?: string; remember?: boolean };
    if (!body?.passcode) {
      return NextResponse.json({ error: "Missing passcode" }, { status: 400 });
    }
    if (body.passcode !== PASSCODE) {
      return NextResponse.json({ error: "Invalid passcode" }, { status: 401 });
    }

    const maxAge = body.remember ? 60 * 60 * 24 * 30 : 60 * 60 * 12; // 30d vs 12h
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge,
    });
    return res;
  } catch (e) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
