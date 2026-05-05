import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return new NextResponse("Missing url", { status: 400 });

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
      },
      next: { revalidate: 86400 },
    });

    if (!res.ok) return new NextResponse("Not found", { status: 404 });

    const buffer      = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") || "image/jpeg";
    const base64      = Buffer.from(buffer).toString("base64");
    const dataUrl     = `data:${contentType};base64,${base64}`;

    return new NextResponse(JSON.stringify({ dataUrl }), {
      headers: {
        "Content-Type":  "application/json",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new NextResponse("Error", { status: 500 });
  }
}
