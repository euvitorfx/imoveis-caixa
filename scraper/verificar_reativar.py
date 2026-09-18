#!/usr/bin/env python3
"""
Verifica imóveis inativados no banco que ainda constam no CSV da Caixa.
Reativa automaticamente os que forem encontrados.

Uso:
  python verificar_reativar.py            # reativa de verdade
  python verificar_reativar.py --dry-run  # só mostra o que faria, sem alterar
"""

import sys
import os
from datetime import datetime, timezone
from collections import Counter
from dotenv import load_dotenv

load_dotenv()

from scraper import CaixaScraper, _csv_to_docs
from mongo import get_db

DRY_RUN = "--dry-run" in sys.argv


def main():
    print()
    print("=" * 60)
    print("  Verificar & Reativar — Caixa Imóveis")
    print(f"  Modo: {'DRY-RUN (sem alterações)' if DRY_RUN else 'REAL (vai alterar o banco)'}")
    print("=" * 60)

    # ── 1. Baixar CSV da Caixa ────────────────────────────────────────────────
    print("\n[1/4] Baixando CSV geral da Caixa...")
    scraper = CaixaScraper(headless=True)
    hdns_caixa: set[str] = set()

    try:
        for tentativa in range(1, 4):
            csv_bytes = scraper.download_csv("geral")
            if csv_bytes:
                break
            print(f"  ⚠ Tentativa {tentativa}/3 falhou, aguardando 15s...")
            import time; time.sleep(15)

        if not csv_bytes:
            print("  ✗ Falha ao baixar o CSV após 3 tentativas. Encerrando.")
            return

        docs_csv = _csv_to_docs(csv_bytes)
        hdns_caixa = {d["hdnImovel"] for d in docs_csv if d.get("hdnImovel")}
        print(f"  ✓ {len(hdns_caixa):,} imóveis no CSV atual da Caixa")
    finally:
        scraper.close()

    if not hdns_caixa:
        print("  ✗ CSV vazio. Encerrando.")
        return

    # ── 2. Buscar inativos no MongoDB ─────────────────────────────────────────
    print("\n[2/4] Consultando inativos no MongoDB...")
    col = get_db()[os.environ.get("MONGODB_COLLECTION", "imoveis")]

    total_inativos = col.count_documents({"ativo": False})
    total_ativos   = col.count_documents({"ativo": True})
    print(f"  Ativos  : {total_ativos:,}")
    print(f"  Inativos: {total_inativos:,}")

    # Carrega todos os inativos (só hdnImovel para não explodir memória)
    inativos = list(col.find({"ativo": False}, {"hdnImovel": 1, "estado": 1}))
    hdns_inativos = {d["hdnImovel"] for d in inativos if d.get("hdnImovel")}
    print(f"  HDNs inativos carregados: {len(hdns_inativos):,}")

    # ── 3. Cruzamento ─────────────────────────────────────────────────────────
    print("\n[3/4] Cruzando CSV × inativos...")
    reativar = hdns_inativos & hdns_caixa
    print(f"  Inativos no banco        : {len(hdns_inativos):,}")
    print(f"  Presentes no CSV da Caixa: {len(hdns_caixa):,}")
    print(f"  *** A REATIVAR           : {len(reativar):,} ***")

    if not reativar:
        print("\n  Nenhum imóvel a reativar. Banco consistente com CSV da Caixa.")
        return

    # Detalhe por estado
    docs_reativar = {d["hdnImovel"]: d for d in inativos if d.get("hdnImovel") in reativar}
    por_estado = Counter(d.get("estado") for d in docs_reativar.values())
    print("\n  Por estado:")
    for uf, n in sorted(por_estado.items(), key=lambda x: -x[1]):
        print(f"    {uf or '?':>3}: {n:>6}")

    # ── 4. Reativar ───────────────────────────────────────────────────────────
    print(f"\n[4/4] {'[DRY-RUN] Simulando reativação...' if DRY_RUN else 'Reativando no MongoDB...'}")

    if DRY_RUN:
        print(f"  Seriam reativados: {len(reativar):,} imóveis")
        print("  Execute sem --dry-run para aplicar.")
    else:
        now = datetime.now(timezone.utc)
        result = col.update_many(
            {"hdnImovel": {"$in": list(reativar)}, "ativo": False},
            {
                "$set": {"ativo": True, "dataAtualizacao": now},
                "$unset": {"dataInativacao": ""},
            }
        )
        print(f"  ✓ {result.modified_count:,} imóveis reativados com sucesso")

    print()
    print("=" * 60)
    print("  Concluído.")
    print("=" * 60)
    print()


if __name__ == "__main__":
    main()
