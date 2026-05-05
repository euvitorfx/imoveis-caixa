#!/usr/bin/env python3
"""
Scraper completo — Caixa Imóveis → MongoDB
-------------------------------------------
Uso:
  python run.py                    # todos os 27 estados
  python run.py --estados RN SP    # estados específicos
  python run.py --headless         # sem abrir janela (GitHub Actions)
  python run.py --sem-detalhes     # só lista básica, sem enriquecer detalhe
  python run.py --debug            # salva respostas brutas em debug/
"""

import sys
import time
from datetime import datetime, timezone

from dotenv import load_dotenv

from mongo import ensure_indexes, upsert_imoveis, marcar_inativos, total_por_estado, registrar_sync, get_db
from scraper import CaixaScraper, ALL_ESTADOS
from geocoder import geocode_batch

load_dotenv()


def parse_args():
    args      = sys.argv[1:]
    estados   = ALL_ESTADOS
    headless  = "--headless"      in args
    debug     = "--debug"         in args
    sem_det   = "--sem-detalhes"  in args
    sem_geo   = "--sem-geocode"   in args

    if "--estados" in args:
        idx = args.index("--estados")
        estados = [e.upper() for e in args[idx + 1:] if not e.startswith("--")]

    return estados, headless, debug, sem_det, sem_geo


def main():
    estados, headless, debug, sem_detalhes, sem_geocode = parse_args()

    inicio = datetime.now(timezone.utc)
    print()
    print("=" * 60)
    print("  Caixa Imóveis → MongoDB")
    print(f"  Início: {inicio.strftime('%d/%m/%Y %H:%M:%S')} UTC")
    print(f"  Estados: {', '.join(estados)}")
    print(f"  Modo: {'headless' if headless else 'com janela'}")
    print("=" * 60)

    ensure_indexes()

    scraper = CaixaScraper(headless=headless, debug=debug)
    totais  = {"inseridos": 0, "atualizados": 0, "erros": 0, "imoveis": 0}
    falhas  = []   # estados que falharam mesmo após retry

    try:
        for i, estado in enumerate(estados, 1):
            print(f"\n[{i}/{len(estados)}] Estado: {estado}")
            t0 = time.time()

            # Retry automático: tenta até 2 vezes antes de desistir
            props = []
            for tentativa in range(1, 3):
                props = scraper.scrape_estado(estado, com_fotos=not sem_detalhes)
                if props:
                    break
                if tentativa == 1:
                    print(f"  ⚠ {estado}: download falhou, nova tentativa em 10s...")
                    time.sleep(10)

            if props:
                stats = upsert_imoveis(props)
                hdns  = [p["hdnImovel"] for p in props if p.get("hdnImovel")]
                inat  = marcar_inativos(estado, hdns)

                totais["inseridos"]   += stats["inseridos"]
                totais["atualizados"] += stats["atualizados"]
                totais["erros"]       += stats["erros"]
                totais["imoveis"]     += len(props)

                elapsed = time.time() - t0
                print(
                    f"  ✓ {estado}: {len(props)} imóveis | "
                    f"+{stats['inseridos']} novos | "
                    f"~{stats['atualizados']} atualizados | "
                    f"{inat or 0} marcados inativos | "
                    f"{elapsed:.0f}s"
                )
            else:
                falhas.append(estado)
                print(f"  ✗ {estado}: falhou após 2 tentativas — inativos NÃO atualizados")

            # Pausa entre estados para não sobrecarregar o servidor
            if i < len(estados):
                time.sleep(2)

    except KeyboardInterrupt:
        print("\n  Interrompido pelo usuário.")
    finally:
        scraper.close()

    # ── Geocodificação dos imóveis sem coordenadas ────────────────────────────
    if not sem_geocode and totais["imoveis"] > 0:
        print("\n  Geocodificando imóveis novos...")
        col = get_db()[__import__("os").environ.get("MONGODB_COLLECTION", "imoveis")]
        geocode_batch(col, limit=500, debug=debug)

    # ── Registra timestamp do sync ────────────────────────────────────────────
    registrar_sync(totais["imoveis"])

    # ── Resumo final ─────────────────────────────────────────────────────────
    fim     = datetime.now(timezone.utc)
    duracao = (fim - inicio).seconds // 60

    print()
    print("=" * 60)
    print("  RESUMO FINAL")
    print("=" * 60)
    print(f"  Imóveis processados : {totais['imoveis']:,}")
    print(f"  Inseridos (novos)   : {totais['inseridos']:,}")
    print(f"  Atualizados         : {totais['atualizados']:,}")
    print(f"  Erros               : {totais['erros']:,}")
    print(f"  Duração             : ~{duracao} minutos")
    if falhas:
        print(f"  ⚠ Estados com falha : {', '.join(falhas)}")
    print()
    print("  Totais no banco por estado:")
    for uf, total in total_por_estado().items():
        print(f"    {uf}: {total:,}")
    print("=" * 60)
    print()


if __name__ == "__main__":
    main()
