import { NextResponse } from "next/server";

const WEBHOOK_URL = "https://n8n.niprobin.com/webhook/download-music";

async function triggerDownload() {
  const res = await fetch(WEBHOOK_URL, {
    method: "GET",
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Webhook failed with ${res.status}`);
  }
}

export async function POST() {
  try {
    await triggerDownload();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function GET() {
  try {
    await triggerDownload();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

