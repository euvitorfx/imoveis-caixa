import { NextRequest, NextResponse } from "next/server";
import { getLaudoById, updateLaudo } from "@/lib/laudos";

type Ctx = { params: Promise<{ id: string }> };

function checkAdmin(req: NextRequest) {
  return req.cookies.get("admin_token")?.value === process.env.ADMIN_SECRET;
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

interface OverpassElement {
  tags?: { name?: string; amenity?: string; shop?: string; railway?: string };
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
}

function distanciaKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function categoriaLabel(tags: OverpassElement["tags"]): string | null {
  const { amenity, shop, railway } = tags ?? {};
  if (railway === "subway_entrance" || railway === "station") return "Metro / Trem";
  if (amenity === "hospital") return "Hospital";
  if (amenity === "pharmacy") return "Farmácia";
  if (amenity === "school") return "Escola";
  if (amenity === "university") return "Universidade";
  if (amenity === "supermarket" || shop === "supermarket") return "Supermercado";
  if (shop === "convenience") return "Mercadinho";
  return null;
}

// POST /api/admin/laudos/[id]/localidade
// Body: { endereco: string } — endereço para geocodificar
// Ou { lat, lng } — coordenadas diretas
// Salva localizacao e proximidades no laudo
export async function POST(req: NextRequest, { params }: Ctx) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const { id } = await params;
  const laudo = await getLaudoById(id);
  if (!laudo) return NextResponse.json({ error: "Laudo não encontrado" }, { status: 404 });

  const body = await req.json() as { endereco?: string; lat?: number; lng?: number };

  let lat: number;
  let lng: number;
  let enderecoMaps = body.endereco ?? laudo.localizacao?.enderecoMaps ?? "";

  if (body.lat != null && body.lng != null) {
    lat = body.lat;
    lng = body.lng;
  } else if (enderecoMaps) {
    const geo = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(enderecoMaps)}&format=json&limit=1&countrycodes=br`,
      { headers: { "User-Agent": "BuscaLeiloesCaixa/1.0 (noreply@buscaleiloescaixa.com.br)" } }
    );
    if (!geo.ok) return NextResponse.json({ error: "Falha no geocoding" }, { status: 502 });
    const geoJson = (await geo.json()) as NominatimResult[];
    if (!geoJson.length) return NextResponse.json({ error: "Endereço não encontrado" }, { status: 404 });
    lat = parseFloat(geoJson[0].lat);
    lng = parseFloat(geoJson[0].lon);
  } else {
    return NextResponse.json({ error: "Informe o endereço ou as coordenadas" }, { status: 400 });
  }

  // Overpass — categorias de interesse num raio de 1 km
  const raio = 1000;
  const overpassQuery = `
[out:json][timeout:20];
(
  node["amenity"~"^(supermarket|hospital|pharmacy|school|university)$"](around:${raio},${lat},${lng});
  node["shop"="supermarket"](around:${raio},${lat},${lng});
  node["shop"="convenience"](around:${raio},${lat},${lng});
  node["railway"~"^(subway_entrance|station)$"](around:${raio},${lat},${lng});
  way["amenity"~"^(supermarket|hospital|pharmacy|school|university)$"](around:${raio},${lat},${lng});
  way["railway"~"^(subway_entrance|station)$"](around:${raio},${lat},${lng});
);
out center;
`.trim();

  const OVERPASS_MIRRORS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  ];

  async function queryOverpass(endpoint: string): Promise<Response> {
    return fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(overpassQuery)}`,
      signal: AbortSignal.timeout(22000),
    });
  }

  let ovResp: Response | null = null;
  let lastError = "";
  for (const mirror of OVERPASS_MIRRORS) {
    try {
      const r = await queryOverpass(mirror);
      if (r.ok) { ovResp = r; break; }
      lastError = `HTTP ${r.status} em ${mirror}`;
    } catch (e) {
      lastError = `${mirror}: ${e instanceof Error ? e.message : e}`;
    }
  }
  if (!ovResp) return NextResponse.json({ error: `Falha na consulta Overpass: ${lastError}` }, { status: 502 });

  const ovJson = (await ovResp.json()) as { elements: OverpassElement[] };

  const proximidades = ovJson.elements
    .filter((el) => el.tags?.name)
    .map((el) => {
      const elLat = el.lat ?? el.center?.lat ?? 0;
      const elLng = el.lon ?? el.center?.lon ?? 0;
      const categoria = categoriaLabel(el.tags);
      if (!categoria) return null;
      return {
        categoria,
        nome: el.tags!.name!,
        distanciaM: Math.round(distanciaKm(lat, lng, elLat, elLng)),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => a.distanciaM - b.distanciaM)
    .slice(0, 30);

  await updateLaudo(id, {
    localizacao: { enderecoMaps, lat, lng },
    proximidades,
  } as Parameters<typeof updateLaudo>[1]);

  return NextResponse.json({ ok: true, lat, lng, total: proximidades.length, proximidades });
}

// PATCH /api/admin/laudos/[id]/localidade
// Atualiza só o enderecoMaps sem re-geocodificar
export async function PATCH(req: NextRequest, { params }: Ctx) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const { id } = await params;
  if (!(await getLaudoById(id))) return NextResponse.json({ error: "Laudo não encontrado" }, { status: 404 });

  const { enderecoMaps } = await req.json() as { enderecoMaps: string };
  await updateLaudo(id, {
    localizacao: { enderecoMaps },
  } as Parameters<typeof updateLaudo>[1]);

  return NextResponse.json({ ok: true });
}
