#!/usr/bin/env python3
"""
Migração de datas de leilão:
1. Converte dataLeilao1/dataLeilao2 existentes (string DD/MM/YYYY) → ISODate
2. Re-enriquece imóveis de Licitação Aberta que não têm dataLeilao1Date ainda
"""
import os
import sys
import time
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, os.path.dirname(__file__))
from mongo import get_db
from scraper import CaixaScraper, _parse_date_br

def migrar_datas_existentes(col):
    """Converte strings DD/MM/YYYY existentes para ISODate."""
    pendentes = list(col.find(
        {"dataLeilao1": {"$exists": True, "$ne": None}, "dataLeilao1Date": {"$exists": False}},
        {"_id": 1, "dataLeilao1": 1, "dataLeilao2": 1}
    ))
    print(f"Convertendo {len(pendentes)} registros com datas em string...")
    for doc in pendentes:
        update = {}
        if doc.get("dataLeilao1"):
            d = _parse_date_br(doc["dataLeilao1"])
            if d:
                update["dataLeilao1Date"] = d
        if doc.get("dataLeilao2"):
            d = _parse_date_br(doc["dataLeilao2"])
            if d:
                update["dataLeilao2Date"] = d
        if update:
            col.update_one({"_id": doc["_id"]}, {"$set": update})
    print(f"  Conversão concluída.")

def reenriquecer_licitacao(col, limite=500):
    """Re-enriquece Licitação Aberta sem dataLeilao1Date."""
    filtro = {
        "modalidade": "Licitação Aberta",
        "ativo": True,
        "dataLeilao1Date": {"$exists": False},
    }
    total = col.count_documents(filtro)
    a_processar = min(total, limite)
    print(f"\nLicitação Aberta sem data: {total:,} | Processando: {a_processar:,}")

    if a_processar == 0:
        print("  Nenhum pendente.")
        return

    scraper = CaixaScraper(headless=True)
    processados = enriquecidos = 0

    try:
        cursor = col.find(filtro, {"hdnImovel": 1}).limit(a_processar)
        for doc in cursor:
            extras = scraper.get_detalhes_imovel(doc["hdnImovel"])
            update = {}
            if extras.get("dataLeilao1Date"):
                update["dataLeilao1"]     = extras["dataLeilao1"]
                update["dataLeilao1Date"] = extras["dataLeilao1Date"]
                enriquecidos += 1
            if extras.get("dataLeilao2Date"):
                update["dataLeilao2"]     = extras["dataLeilao2"]
                update["dataLeilao2Date"] = extras["dataLeilao2Date"]
            if update:
                col.update_one({"_id": doc["_id"]}, {"$set": update})
            processados += 1
            if processados % 50 == 0:
                print(f"  [{processados}/{a_processar}] enriquecidos={enriquecidos}")
            time.sleep(0.8)
    except KeyboardInterrupt:
        print(f"\n  Interrompido após {processados} registros.")
    finally:
        scraper.close()

    print(f"\n  Processados: {processados} | Com data capturada: {enriquecidos}")

if __name__ == "__main__":
    col = get_db()[os.environ.get("MONGODB_COLLECTION", "imoveis")]
    migrar_datas_existentes(col)
    limite = int(sys.argv[1]) if len(sys.argv) > 1 else 500
    reenriquecer_licitacao(col, limite)
