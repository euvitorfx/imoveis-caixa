#!/usr/bin/env python3
"""
Scraper completo — Caixa Imóveis → MongoDB
-------------------------------------------
Uso:
  python run.py                    # baixa CSV geral (Brasil todo) — padrão
  python run.py --headless         # sem abrir janela (GitHub Actions)
  python run.py --sem-detalhes     # só lista básica, sem enriquecer detalhe
  python run.py --debug            # salva respostas brutas em debug/
"""

import sys
import time
from datetime import datetime, timezone
from collections import defaultdict

from dotenv import load_dotenv

from mongo import ensure_indexes, upsert_imoveis, upsert_cidades, marcar_inativos, total_por_estado, registrar_sync, get_db
from scraper import CaixaScraper
from geocoder import geocode_batch

load_dotenv()


def parse_args():
    args     = sys.argv[1:]
    headless = "--headless"     in args
    debug    = "--debug"        in args
    sem_det  = "--sem-detalhes" in args
    sem_geo  = "--sem-geocode"  in args
    return headless, debug, sem_det, sem_geo


def main():
    headless, debug, sem_detalhes, sem_geocode = parse_args()

    inicio = datetime.now(timezone.utc)
    print()
    print("=" * 60)
    print("  Caixa Imóveis → MongoDB")
    print(f"  Início: {inicio.strftime('%d/%m/%Y %H:%M:%S')} UTC")
    print(f"  Modo: {'headless' if headless else 'com janela'}")
    print("=" * 60)

    ensure_indexes()

    scraper = CaixaScraper(headless=headless, debug=debug)
    totais  = {"inseridos": 0, "atualizados": 0, "erros": 0, "imoveis": 0}

    try:
        # ── Download único: CSV geral (Brasil todo) ───────────────────────────
        # Mais confiável que 27 downloads individuais por estado.
        # Se falhar, tenta mais 2 vezes antes de desistir.
        props = []
        for tentativa in range(1, 4):
            props = scraper.scrape_brasil(com_fotos=not sem_detalhes)
            if props:
                break
            print(f"  ⚠ Download geral falhou (tentativa {tentativa}/3), nova tentativa em 15s...")
            time.sleep(15)

        if not props:
            print("  ✗ Download do CSV geral falhou após 3 tentativas. Encerrando.")
            return

        print(f"\n  {len(props):,} imóveis baixados. Upserting no MongoDB...")
        stats = upsert_imoveis(props)
        upsert_cidades(props)

        totais["inseridos"]   = stats["inseridos"]
        totais["atualizados"] = stats["atualizados"]
        totais["erros"]       = stats["erros"]
        totais["imoveis"]     = len(props)

        # ── Marcar inativos por estado ────────────────────────────────────────
        # Agrupa hdnImovel por estado e, para cada estado presente no CSV,
        # marca como inativos os imóveis daquele estado que não apareceram.
        por_estado: dict[str, list[str]] = defaultdict(list)
        for p in props:
            estado = p.get("estado")
            hdn    = p.get("hdnImovel")
            if estado and hdn:
                por_estado[estado].append(hdn)

        total_inativos = 0
        for estado, hdns in sorted(por_estado.items()):
            n = marcar_inativos(estado, hdns) or 0
            if n:
                print(f"  {estado}: {n} marcado(s) inativo(s)")
            total_inativos += n

        print(
            f"\n  ✓ {len(props):,} imóveis | "
            f"+{stats['inseridos']} novos | "
            f"~{stats['atualizados']} atualizados | "
            f"{total_inativos} marcados inativos"
        )

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
    print()
    print("  Totais no banco por estado:")
    for uf, total in total_por_estado().items():
        print(f"    {uf}: {total:,}")
    print("=" * 60)
    print()


if __name__ == "__main__":
    main()
