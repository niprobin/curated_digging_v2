import { revalidateTag } from "next/cache";

export async function POST(request: Request) {
  try {
    const { tag } = (await request.json()) as { tag?: string };
    if (!tag) {
      return new Response(JSON.stringify({ error: "Missing tag" }), { status: 400 });
    }
    revalidateTag(tag);
    return new Response(JSON.stringify({ revalidated: true, tag }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400 });
  }
}

