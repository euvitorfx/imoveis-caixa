import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

function checkAdmin(req: NextRequest) {
  return req.cookies.get("admin_token")?.value === process.env.ADMIN_SECRET;
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  const [items, sprints] = await Promise.all([
    db.collection("roadmap_items").find({}).sort({ themeOrder: 1, order: 1 }).toArray(),
    db.collection("sprints").find({}).sort({ order: 1 }).toArray(),
  ]);

  // Serialize _id to string and group items by theme
  const serializedItems = items.map((doc) => ({
    ...doc,
    _id: doc._id.toString(),
  }));

  const themeMap = new Map<string, { theme: string; color: string; themeOrder: number; items: typeof serializedItems }>();
  for (const item of serializedItems) {
    if (!themeMap.has(item.theme)) {
      themeMap.set(item.theme, { theme: item.theme, color: item.themeColor, themeOrder: item.themeOrder, items: [] });
    }
    themeMap.get(item.theme)!.items.push(item);
  }

  const themes = Array.from(themeMap.values()).sort((a, b) => a.themeOrder - b.themeOrder);
  const serializedSprints = sprints.map((s) => ({ ...s, _id: s._id.toString() }));

  return NextResponse.json({ themes, sprints: serializedSprints });
}
