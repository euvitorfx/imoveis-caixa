#!/usr/bin/env python3
"""
Enriquecimento incremental de imóveis com dados da página de detalhe.
Extrai: CEP, leiloeiro, edital, editaiUrl, matriculaUrl,
        ocupacao, fgts, dataLeilao1, dataLeilao2, suites.

Uso:
  python enrich.py                        # processa todos os pendentes
  python enrich.py --limite 200           # processa até 200 por vez
  python enrich.py --estado RN            # filtra por estado
  python enrich.py --reprocessar          # reprocessa mesmo os já enriquecidos
  python enrich.py --headless             # sem abrir janela
"""

import os
import sys
import time
from datetime import datetime, timezone
from dotenv import load_dotenv

from mongo import get_db
from scraper import CaixaScraper

load_dotenv()

DELAY_ENTRE_REQUESTS = 0.8   # segundos entre requisições (respeitar o servidor)
BATCH_SIZE = 100


def parse_args():
    args         = sys.argv[1:]
    headless     = "--headless"    in args
    reprocessar  = "--reprocessar" in args
    limite       = None
    estado       = None

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

    return headless, reprocessar, limite, estado


def main():
    headless, reprocessar, limite, estado = parse_args()

    col = get_db()[os.environ.get("MONGODB_COLLECTION", "imoveis")]

    # Filtro de busca
    filtro: dict = {"ativo": True}
    if not reprocessar:
        filtro["enriched"] = {"$ne": True}
    if estado:
        filtro["estado"] = estado

    total_pendente = col.count_documents(filtro)
    a_processar    = min(total_pendente, limite) if limite else total_pendente

    print()
    print("=" * 60)
    print("  Enriquecimento de Imóveis — Caixa Detalhes")
    print(f"  Início : {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M:%S')} UTC")
    print(f"  Pendentes : {total_pendente:,}")
    print(f"  A processar: {a_processar:,}")
    if estado:
        print(f"  Estado  : {estado}")
    print("=" * 60)

    if a_processar == 0:
        print("\n  Nenhum imóvel pendente. Use --reprocessar para forçar.")
        return

    scraper = CaixaScraper(headless=headless)
    processados = enriquecidos = erros = 0

    try:
        cursor = col.find(filtro, {"hdnImovel": 1}).limit(a_processar or 0).batch_size(BATCH_SIZE)

        for doc in cursor:
            hdn = doc["hdnImovel"]
            extras = scraper.get_detalhes_imovel(hdn)

            update: dict = {"enriched": True}
            if extras:
                update.update(extras)
                enriquecidos += 1
            else:
                erros += 1

            col.update_one({"_id": doc["_id"]}, {"$set": update})
            processados += 1

            if processados % 50 == 0 or processados == a_processar:
                pct = processados / a_processar * 100 if a_processar else 0
                print(f"  [{processados:,}/{a_processar:,}] {pct:.1f}% | enriquecidos={enriquecidos:,} erros={erros}")

            time.sleep(DELAY_ENTRE_REQUESTS)

    except KeyboardInterrupt:
        print(f"\n  Interrompido pelo usuário após {processados:,} registros.")
    finally:
        scraper.close()

    print()
    print("=" * 60)
    print("  RESUMO")
    print(f"  Processados  : {processados:,}")
    print(f"  Enriquecidos : {enriquecidos:,}")
    print(f"  Sem dados    : {erros:,}")
    print("=" * 60)
    print()


if __name__ == "__main__":
    main()
