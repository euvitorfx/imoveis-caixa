#!/usr/bin/env python3
"""
Popula a coleção cidades_caixa com todas as cidades que já passaram
pela base de imóveis (ativas + inativas).

Executar uma única vez após o deploy da feature.
"""

import os
from datetime import datetime, timezone
from dotenv import load_dotenv
from pymongo import MongoClient, UpdateOne, ASCENDING

load_dotenv()

client = MongoClient(os.environ["MONGODB_URI"], serverSelectionTimeoutMS=15000)
db = client[os.environ.get("MONGODB_DB", "imoveis_caixa")]

col_imoveis  = db[os.environ.get("MONGODB_COLLECTION", "imoveis")]
col_cidades  = db["cidades_caixa"]

# Índice único
col_cidades.create_index([("uf", ASCENDING), ("cidade", ASCENDING)], unique=True)

# Todas as combinações UF+cidade na base (ativas e inativas)
pipeline = [
    {"$group": {"_id": {"uf": "$estado", "cidade": "$cidade"}}},
    {"$sort": {"_id.uf": 1, "_id.cidade": 1}},
]

now = datetime.now(timezone.utc)
ops = []
for row in col_imoveis.aggregate(pipeline):
    uf     = row["_id"].get("uf")
    cidade = row["_id"].get("cidade")
    if not uf or not cidade:
        continue
    ops.append(UpdateOne(
        {"uf": uf, "cidade": cidade},
        {
            "$set": {"ultimaVezVisto": now},
            "$setOnInsert": {"uf": uf, "cidade": cidade, "primeiraVezVisto": now},
        },
        upsert=True,
    ))

if ops:
    result = col_cidades.bulk_write(ops, ordered=False)
    print(f"✓ {result.upserted_count} cidades inseridas, {result.modified_count} atualizadas.")
else:
    print("Nenhuma cidade encontrada na base.")

print(f"  Total na coleção cidades_caixa: {col_cidades.count_documents({})}")
