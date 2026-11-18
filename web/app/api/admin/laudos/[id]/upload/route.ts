import { NextRequest, NextResponse } from "next/server";
import { getLaudoById, updateLaudo } from "@/lib/laudos";
import { uploadArquivo } from "@/lib/r2";

type Ctx = { params: Promise<{ id: string }> };

function checkAdmin(req: NextRequest) {
  return req.cookies.get("admin_token")?.value === process.env.ADMIN_SECRET;
}

// POST /api/admin/laudos/[id]/upload
// Body: FormData com campo "tipo" (screenshot | foto) e "arquivo" (File)
export async function POST(req: NextRequest, { params }: Ctx) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const { id } = await params;
  const laudo = await getLaudoById(id);
  if (!laudo) return NextResponse.json({ error: "Laudo não encontrado" }, { status: 404 });

  const formData = await req.formData();
  const tipo = formData.get("tipo") as string;
  const arquivo = formData.get("arquivo") as File | null;

  if (!arquivo) return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 });
  if (!["screenshot", "foto"].includes(tipo)) {
    return NextResponse.json({ error: "Tipo inválido (screenshot|foto)" }, { status: 400 });
  }

  const arrayBuffer = await arquivo.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const ext = arquivo.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const contentType = arquivo.type || "image/jpeg";

  let url: string;
  if (tipo === "screenshot") {
    url = await uploadArquivo(`laudos/${id}/screenshot_caixa.${ext}`, buffer, contentType);
    await updateLaudo(id, { screenshotCaixaUrl: url } as Parameters<typeof updateLaudo>[1]);
  } else {
    const ts = Date.now();
    url = await uploadArquivo(`laudos/${id}/fotos/${ts}.${ext}`, buffer, contentType);
    const fotos = (laudo.fotosAdicionais ?? []).concat(url);
    await updateLaudo(id, { fotosAdicionais: fotos } as Parameters<typeof updateLaudo>[1]);
  }

  return NextResponse.json({ ok: true, url });
}

// DELETE /api/admin/laudos/[id]/upload
// Body: { tipo: "screenshot" | "foto", url: string }
export async function DELETE(req: NextRequest, { params }: Ctx) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const { id } = await params;
  const laudo = await getLaudoById(id);
  if (!laudo) return NextResponse.json({ error: "Laudo não encontrado" }, { status: 404 });

  const { tipo, url } = await req.json() as { tipo: string; url: string };

  if (tipo === "screenshot") {
    await updateLaudo(id, { screenshotCaixaUrl: undefined } as Parameters<typeof updateLaudo>[1]);
  } else if (tipo === "foto") {
    const fotos = (laudo.fotosAdicionais ?? []).filter((f) => f !== url);
    await updateLaudo(id, { fotosAdicionais: fotos } as Parameters<typeof updateLaudo>[1]);
  }

  return NextResponse.json({ ok: true });
}
