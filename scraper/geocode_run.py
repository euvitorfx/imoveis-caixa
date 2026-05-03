#!/usr/bin/env python3
"""
Geocodificação em massa — Nominatim (OpenStreetMap)
----------------------------------------------------
Roda em lotes contínuos até processar todos os imóveis sem coordenadas.
Pode ser interrompido com Ctrl+C e retomado a qualquer momento.

Uso:
  python geocode_run.py                  # lotes de 500, todos os estados
  python geocode_run.py --lote 200       # lotes menores
  python geocode_run.py --estados RN SP  # só esses estados
  python geocode_run.py --retry-falhas   # reprocessa lat=null além dos sem lat
  python geocode_run.py --dry-run        # só mostra quantos faltam, não executa
"""

import sys
import time
import os
from datetime import datetime, timezone, timedelta

from dotenv import load_dotenv
from pymongo import UpdateOne

load_dotenv()

from mongo import get_db
from geocoder import geocode

COLLECTION = os.environ.get("MONGODB_COLLECTION", "imoveis")


def parse_args():
    args       = sys.argv[1:]
    lote       = 500
    estados    = []
    retry      = "--retry-falhas" in args
    dry_run    = "--dry-run"      in args

    if "--lote" in args:
        idx  = args.index("--lote")
        lote = int(args[idx + 1])

    if "--estados" in args:
        idx    = args.index("--estados")
        estados = [e.upper() for e in args[idx + 1:] if not e.startswith("--")]

    return lote, estados, retry, dry_run


def contar_pendentes(col, estados: list, retry_falhas: bool) -> int:
    filtro: dict = {"ativo": True}
    if estados:
        filtro["estado"] = {"$in": estados}
    if retry_falhas:
        filtro["$or"] = [{"lat": {"$exists": False}}, {"lat": None}]
    else:
        filtro["lat"] = {"$exists": False}
    return col.count_documents(filtro)


def geocode_lote(col, lote: int, estados: list, retry_falhas: bool) -> tuple[int, int]:
    """Processa um lote. Retorna (ok, total_lote)."""
    filtro: dict = {"ativo": True, "endereco": {"$exists": True}}
    if estados:
        filtro["estado"] = {"$in": estados}
    if retry_falhas:
        filtro["$or"] = [{"lat": {"$exists": False}}, {"lat": None}]
    else:
        filtro["lat"] = {"$exists": False}

    docs = list(
        col.find(filtro, {"_id": 1, "endereco": 1, "cidade": 1, "estado": 1}).limit(lote)
    )
    if not docs:
        return 0, 0

    ops = []
    ok  = 0
    for doc in docs:
        coords = geocode(
            doc.get("endereco", ""),
            doc.get("cidade",   ""),
            doc.get("estado",   ""),
        )
        if coords:
            lat, lng = coords
            ops.append(UpdateOne({"_id": doc["_id"]}, {"$set": {"lat": lat, "lng": lng}}))
            ok += 1
        else:
            ops.append(UpdateOne({"_id": doc["_id"]}, {"$set": {"lat": None, "lng": None}}))

    if ops:
        col.bulk_write(ops, ordered=False)

    return ok, len(docs)


def fmt_eta(segundos: float) -> str:
    if segundos < 60:
        return f"{int(segundos)}s"
    if segundos < 3600:
        return f"{int(segundos/60)}min"
    h = int(segundos // 3600)
    m = int((segundos % 3600) // 60)
    return f"{h}h{m:02d}min"


def main():
    lote, estados, retry_falhas, dry_run = parse_args()

    col = get_db()[COLLECTION]

    pendentes = contar_pendentes(col, estados, retry_falhas)
    total_geo = col.count_documents(
        {"ativo": True, "lat": {"$exists": True, "$ne": None},
         **({"estado": {"$in": estados}} if estados else {})}
    )

    print()
    print("=" * 60)
    print("  Geocodificação em massa — Imóveis Caixa")
    print("=" * 60)
    print(f"  Já geocodificados : {total_geo:,}")
    print(f"  Pendentes         : {pendentes:,}")
    print(f"  Lote por rodada   : {lote}")
    print(f"  Retry de falhas   : {'sim' if retry_falhas else 'não'}")
    if estados:
        print(f"  Filtro estados    : {', '.join(estados)}")
    print(f"  Tempo estimado    : ~{fmt_eta(pendentes * 1.15)}")
    print("=" * 60)

    if dry_run:
        print("\n  [dry-run] Nenhuma alteração feita.")
        return

    if pendentes == 0:
        print("\n  Todos os imóveis já têm coordenadas!")
        return

    print("\n  Iniciando... (Ctrl+C para pausar e retomar depois)\n")

    total_ok      = 0
    total_proc    = 0
    lotes_rodados = 0
    inicio        = time.time()

    try:
        while True:
            ok, proc = geocode_lote(col, lote, estados, retry_falhas)
            if proc == 0:
                break

            total_ok   += ok
            total_proc += proc
            lotes_rodados += 1

            restantes  = contar_pendentes(col, estados, retry_falhas)
            decorrido  = time.time() - inicio
            velocidade = total_proc / decorrido if decorrido > 0 else 1
            eta        = restantes / velocidade if velocidade > 0 else 0

            pct_lote   = round(ok / proc * 100) if proc else 0
            now_str    = datetime.now().strftime("%H:%M:%S")

            print(
                f"  [{now_str}] Lote {lotes_rodados:>4} | "
                f"{ok}/{proc} com coord ({pct_lote}%) | "
                f"Total proc: {total_proc:,} | "
                f"Restam: {restantes:,} | "
                f"ETA: {fmt_eta(eta)}"
            )

            if restantes == 0:
                break

    except KeyboardInterrupt:
        print("\n\n  ⏸  Pausado. Rode novamente para continuar de onde parou.")

    decorrido = time.time() - inicio
    restantes_final = contar_pendentes(col, estados, retry_falhas)

    print()
    print("=" * 60)
    print("  RESUMO")
    print("=" * 60)
    print(f"  Processados nessa rodada : {total_proc:,}")
    print(f"  Com coordenadas (sucesso): {total_ok:,}")
    print(f"  Taxa de sucesso          : {round(total_ok/total_proc*100) if total_proc else 0}%")
    print(f"  Ainda pendentes          : {restantes_final:,}")
    print(f"  Duração                  : {fmt_eta(decorrido)}")
    print("=" * 60)
    print()


if __name__ == "__main__":
    main()
