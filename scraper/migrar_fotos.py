#!/usr/bin/env python3
"""
Migra as fotos existentes da Caixa para o Cloudinary.
Processa apenas imóveis com fotoUrl apontando para venda-imoveis.caixa.gov.br.

Uso:
  python migrar_fotos.py                  # migra todos os pendentes
  python migrar_fotos.py --limite 500     # processa até 500 por vez
  python migrar_fotos.py --estado SP      # filtra por estado
"""

import os
import sys
import time
from datetime import datetime, timezone
from dotenv import load_dotenv

from mongo import get_db
from foto_upload import upload_foto

load_dotenv()

DELAY = 0.5   # segundos entre uploads


def parse_args():
    args     = sys.argv[1:]
    limite   = None
    estado   = None
    recentes = "--recentes" in args  # prioriza imóveis mais recentes (desc dataInsercao)

    if "--limite" in args:
        idx = args.index("--limite")
        try:
            limite = int(args[idx + 1])
        except (IndexError, ValueError):
            pass

    if "--estado" in args:
        idx = args.index("--estado")
        try:
            estado = args[idx + 1].upper()
        except IndexError:
            pass

    return limite, estado, recentes


def main():
    limite, estado, recentes = parse_args()

    col = get_db()[os.environ.get("MONGODB_COLLECTION", "imoveis")]

    filtro: dict = {
        "ativo": True,
        "fotoUrl": {"$regex": "caixa\\.gov\\.br", "$options": "i"},
    }
    if estado:
        filtro["estado"] = estado

    total    = col.count_documents(filtro)
    a_migrar = min(total, limite) if limite else total

    print()
    print("=" * 60)
    print("  Migração de Fotos → R2")
    print(f"  Início   : {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M:%S')} UTC")
    print(f"  Pendentes: {total:,}")
    print(f"  A migrar : {a_migrar:,}")
    if estado:
        print(f"  Estado   : {estado}")
    if recentes:
        print(f"  Ordem    : mais recentes primeiro")
    print("=" * 60)

    if a_migrar == 0:
        print("\n  Nenhum imóvel pendente.")
        return

    cursor = col.find(filtro, {"hdnImovel": 1, "fotoUrl": 1})
    if recentes:
        cursor = cursor.sort("dataInsercao", -1)
    cursor = cursor.limit(a_migrar or 0)

    processados = ok = erros = 0

    try:
        for doc in cursor:
            hdn      = doc["hdnImovel"]
            foto_url = doc.get("fotoUrl", "")

            nova_url = upload_foto(hdn, foto_url)

            if nova_url:
                col.update_one(
                    {"_id": doc["_id"]},
                    {"$set": {"fotoUrl": nova_url, "fotoMigrada": True}},
                )
                ok += 1
            else:
                erros += 1

            processados += 1

            if processados % 50 == 0 or processados == a_migrar:
                pct = processados / a_migrar * 100
                print(f"  [{processados:,}/{a_migrar:,}] {pct:.1f}% | ok={ok:,} erros={erros}")

            time.sleep(DELAY)

    except KeyboardInterrupt:
        print(f"\n  Interrompido após {processados:,} registros.")
    finally:
        print()
        print("=" * 60)
        print("  RESUMO")
        print(f"  Processados : {processados:,}")
        print(f"  Migrados OK : {ok:,}")
        print(f"  Erros       : {erros}")
        print("=" * 60)
        print()


if __name__ == "__main__":
    main()
