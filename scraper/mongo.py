import os
from datetime import datetime, timezone
from typing import Optional
from dotenv import load_dotenv
from pymongo import MongoClient, UpdateOne, ASCENDING
from pymongo.errors import BulkWriteError

load_dotenv()

_client: Optional[MongoClient] = None


def get_db():
    global _client
    if _client is None:
        uri = os.environ["MONGODB_URI"]
        _client = MongoClient(uri, serverSelectionTimeoutMS=15000)
    db_name = os.environ.get("MONGODB_DB", "imoveis_caixa")
    return _client[db_name]


def ensure_indexes():
    col = get_db()[os.environ.get("MONGODB_COLLECTION", "imoveis")]
    col.create_index([("hdnImovel", ASCENDING)], unique=True)
    col.create_index([("estado", ASCENDING)])
    col.create_index([("cidade", ASCENDING)])
    col.create_index([("modalidade", ASCENDING)])
    col.create_index([("preco", ASCENDING)])
    col.create_index([("tipo", ASCENDING)])
    col.create_index([("ativo", ASCENDING)])
    print("  Índices criados/verificados.")


def upsert_imoveis(imoveis: list[dict]) -> dict:
    """
    Insere ou atualiza uma lista de imóveis.
    Usa hdnImovel como chave única.
    Retorna estatísticas da operação.
    """
    if not imoveis:
        return {"inseridos": 0, "atualizados": 0, "erros": 0}

    col = get_db()[os.environ.get("MONGODB_COLLECTION", "imoveis")]
    now = datetime.now(timezone.utc)

    ops = []
    for doc in imoveis:
        chave = doc.get("hdnImovel")
        if not chave:
            continue
        doc["dataAtualizacao"] = now
        ops.append(UpdateOne(
            {"hdnImovel": chave},
            {
                "$set": doc,
                "$setOnInsert": {"dataInsercao": now},
            },
            upsert=True,
        ))

    if not ops:
        return {"inseridos": 0, "atualizados": 0, "erros": 0}

    try:
        result = col.bulk_write(ops, ordered=False)
        return {
            "inseridos":   result.upserted_count,
            "atualizados": result.modified_count,
            "erros":       0,
        }
    except BulkWriteError as e:
        ok   = e.details.get("nUpserted", 0) + e.details.get("nModified", 0)
        errs = len(e.details.get("writeErrors", []))
        return {"inseridos": ok, "atualizados": 0, "erros": errs}


def marcar_inativos(estado: str, hdnimoveis_ativos: list[str]):
    """Marca como inativos imóveis do estado que não vieram na última raspagem."""
    if not hdnimoveis_ativos:
        return
    col = get_db()[os.environ.get("MONGODB_COLLECTION", "imoveis")]
    result = col.update_many(
        {"estado": estado, "hdnImovel": {"$nin": hdnimoveis_ativos}},
        {"$set": {"ativo": False, "dataAtualizacao": datetime.now(timezone.utc)}},
    )
    return result.modified_count


def total_por_estado() -> dict:
    col = get_db()[os.environ.get("MONGODB_COLLECTION", "imoveis")]
    pipeline = [
        {"$match": {"ativo": True}},
        {"$group": {"_id": "$estado", "total": {"$sum": 1}}},
        {"$sort": {"total": -1}},
    ]
    return {r["_id"]: r["total"] for r in col.aggregate(pipeline)}
