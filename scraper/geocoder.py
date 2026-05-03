"""
Geocodificador via Nominatim (OpenStreetMap) — gratuito, sem API key.
Limite: 1 requisição/segundo (respeitado automaticamente).
"""

import time
import urllib.request
import urllib.parse
import json
from typing import Optional


NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
USER_AGENT    = "imoveis-caixa/1.0 (github.com/euvitorfx/imoveis-caixa)"
_last_call    = 0.0


def _get(params: dict) -> list:
    global _last_call
    # Garante no mínimo 1.1s entre chamadas (política do Nominatim)
    wait = 1.1 - (time.time() - _last_call)
    if wait > 0:
        time.sleep(wait)

    qs  = urllib.parse.urlencode(params)
    req = urllib.request.Request(
        f"{NOMINATIM_URL}?{qs}",
        headers={"User-Agent": USER_AGENT},
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except Exception:
        data = []
    finally:
        _last_call = time.time()

    return data


def geocode(endereco: str, cidade: str, estado: str) -> Optional[tuple]:
    """
    Retorna (lat, lng) float ou None se não encontrar.
    Tenta queries progressivamente menos específicas.
    """
    queries = [
        f"{endereco}, {cidade}, {estado}, Brasil",
        f"{cidade}, {estado}, Brasil",
    ]
    for q in queries:
        results = _get({"q": q, "format": "json", "limit": 1, "countrycodes": "br"})
        if results:
            try:
                return float(results[0]["lat"]), float(results[0]["lon"])
            except (KeyError, ValueError):
                continue
    return None


def geocode_batch(col, limit: int = 500, debug: bool = False) -> int:
    """
    Geocodifica imóveis sem lat/lng no MongoDB.
    Processa até `limit` por chamada para não demorar demais.
    Retorna quantos foram geocodificados com sucesso.
    """
    from pymongo import UpdateOne

    docs = list(
        col.find(
            {"ativo": True, "lat": {"$exists": False}, "endereco": {"$exists": True}},
            {"_id": 1, "endereco": 1, "cidade": 1, "estado": 1},
        ).limit(limit)
    )

    if not docs:
        return 0

    print(f"  Geocodificando {len(docs)} imóveis (≈{len(docs)}s)...")
    ops  = []
    ok   = 0

    for i, doc in enumerate(docs):
        coords = geocode(
            doc.get("endereco", ""),
            doc.get("cidade", ""),
            doc.get("estado", ""),
        )
        if coords:
            lat, lng = coords
            ops.append(UpdateOne({"_id": doc["_id"]}, {"$set": {"lat": lat, "lng": lng}}))
            ok += 1
        else:
            # Marca como tentado para não reprocessar indefinidamente
            ops.append(UpdateOne({"_id": doc["_id"]}, {"$set": {"lat": None, "lng": None}}))

        if debug and (i + 1) % 50 == 0:
            print(f"    {i+1}/{len(docs)} geocodificados...")

    if ops:
        col.bulk_write(ops, ordered=False)

    print(f"  Geocodificação: {ok}/{len(docs)} com coordenadas.")
    return ok
