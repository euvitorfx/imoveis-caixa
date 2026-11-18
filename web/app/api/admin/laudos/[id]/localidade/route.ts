import { NextRequest, NextResponse } from "next/server";
import { getLaudoById, updateLaudo } from "@/lib/laudos";

type Ctx = { params: Promise<{ id: string }> };

function checkAdmin(req: NextRequest) {
  return req.cookies.get("admin_token")?.value === process.env.ADMIN_SECRET;
}

interface NominatimResult {
  lat: string;
  lon: string;
}

// POST /api/admin/laudos/[id]/localidade
// Body { endereco } ou { lat, lng }  → geocodifica e retorna { lat, lng }
// Body { lat, lng, proximidades }    → salva diretamente (Overpass feito no browser)
export async function POST(req: NextRequest, { params }: Ctx) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const { id } = await params;
  const laudo = await getLaudoById(id);
  if (!laudo) return NextResponse.json({ error: "Laudo não encontrado" }, { status: 404 });

  const body = await req.json() as { endereco?: string; lat?: number; lng?: number; proximidades?: unknown[] };

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

  // Modo salvar: cliente já processou o Overpass no browser e envia os resultados prontos
  if (body.proximidades !== undefined) {
    type Prox = { categoria: string; nome: string; distanciaM: number };
    const proximidades = body.proximidades as Prox[];
    await updateLaudo(id, {
      localizacao: { enderecoMaps, lat, lng },
      proximidades,
    } as Parameters<typeof updateLaudo>[1]);
    return NextResponse.json({ ok: true, lat, lng, total: proximidades.length });
  }

  // Modo geocodificar: apenas retorna lat/lng para o cliente usar no Overpass
  await updateLaudo(id, {
    localizacao: { enderecoMaps, lat, lng },
  } as Parameters<typeof updateLaudo>[1]);

  return NextResponse.json({ ok: true, lat, lng });
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
