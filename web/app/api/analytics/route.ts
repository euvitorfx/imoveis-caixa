import { NextResponse } from "next/server";

export const revalidate = 3600; // cache por 1 hora

export async function GET() {
  const token     = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;

  if (!token || !projectId) {
    return NextResponse.json({ pageviews: null, visitors: null });
  }

  try {
    const to   = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const res = await fetch(
      `https://vercel.com/api/web-analytics/timeseries?projectId=${projectId}&environment=production&from=${from}&to=${to}&filter=%7B%7D`,
      {
        headers: { Authorization: `Bearer ${token}` },
        next: { revalidate: 3600 },
      }
    );

    if (!res.ok) return NextResponse.json({ pageviews: null, visitors: null });

    const json = await res.json();
    const rows: { total: number; devices: number }[] = json?.data?.groups?.all ?? [];

    const pageviews = rows.reduce((s, r) => s + r.total, 0);
    const visitors  = rows.reduce((s, r) => s + r.devices, 0);

    return NextResponse.json({ pageviews, visitors });
  } catch {
    return NextResponse.json({ pageviews: null, visitors: null });
  }
}
