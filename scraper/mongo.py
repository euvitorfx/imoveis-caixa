import os
from datetime import datetime, timezone
from typing import Optional
from dotenv import load_dotenv
from pymongo import MongoClient, UpdateOne, InsertOne, ASCENDING
from pymongo.errors import BulkWriteError

load_dotenv()

_client: Optional[MongoClient] = None

CAMPOS_MONITORADOS = ["preco", "modalidade", "situacaoOcupacao", "desconto", "tipo"]


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
    col.create_index([("dataInsercao", ASCENDING)])
    col.create_index([("dataInativacao", ASCENDING)])

    mudancas_col = get_db()["mudancas_imoveis"]
    mudancas_col.create_index([("hdnImovel", ASCENDING)])
    mudancas_col.create_index([("notificado", ASCENDING)])
    mudancas_col.create_index([("detectadoEm", ASCENDING)])
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
    mudancas_col = get_db()["mudancas_imoveis"]
    now = datetime.now(timezone.utc)

    # Snapshot dos campos monitorados para detectar mudanças
    hdns = [doc["hdnImovel"] for doc in imoveis if doc.get("hdnImovel")]
    projecao = {campo: 1 for campo in CAMPOS_MONITORADOS}
    projecao["hdnImovel"] = 1
    existentes = {
        doc["hdnImovel"]: doc
        for doc in col.find({"hdnImovel": {"$in": hdns}}, projecao)
    }

    mudancas = []
    ops = []
    for doc in imoveis:
        chave = doc.get("hdnImovel")
        if not chave:
            continue
        doc["dataAtualizacao"] = now
        preco = doc.get("preco")

        # Detectar mudanças apenas em imóveis já existentes (não em inserções novas)
        existente = existentes.get(chave)
        if existente:
            for campo in CAMPOS_MONITORADOS:
                val_novo = doc.get(campo)
                val_anterior = existente.get(campo)
                if val_novo is not None and val_anterior is not None and val_novo != val_anterior:
                    mudancas.append({
                        "hdnImovel": chave,
                        "campo": campo,
                        "de": val_anterior,
                        "para": val_novo,
                        "detectadoEm": now,
                        "notificado": False,
                    })

        # fotoUrl vai em $setOnInsert para não sobrescrever URL do R2 após migração
        foto_url = doc.pop("fotoUrl", None)
        set_on_insert: dict = {"dataInsercao": now}
        if foto_url:
            set_on_insert["fotoUrl"] = foto_url
        update: dict = {
            "$set": doc,
            "$setOnInsert": set_on_insert,
        }
        if preco is not None:
            update["$push"] = {
                "historicoPreco": {
                    "$each": [{"data": now.strftime("%Y-%m-%dT%H:%M:%SZ"), "preco": preco}],
                    "$sort": {"data": 1},
                    "$slice": -30,
                }
            }
        ops.append(UpdateOne(
            {"hdnImovel": chave},
            update,
            upsert=True,
        ))

    if mudancas:
        mudancas_col.insert_many(mudancas)

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
    """Marca como inativos imóveis do estado que não vieram na última raspagem.
    O filtro 'ativo: True' garante que dataInativacao seja gravado apenas uma vez,
    na primeira transição ativo → inativo.
    """
    if not hdnimoveis_ativos:
        return
    col = get_db()[os.environ.get("MONGODB_COLLECTION", "imoveis")]
    mudancas_col = get_db()["mudancas_imoveis"]
    now = datetime.now(timezone.utc)

    filtro = {"estado": estado, "hdnImovel": {"$nin": hdnimoveis_ativos}, "ativo": True}

    # Registrar inativações antes de aplicar o update
    a_inativar = list(col.find(filtro, {"hdnImovel": 1}))
    if a_inativar:
        mudancas_col.insert_many([
            {
                "hdnImovel": doc["hdnImovel"],
                "campo": "ativo",
                "de": True,
                "para": False,
                "detectadoEm": now,
                "notificado": False,
            }
            for doc in a_inativar
        ])

    result = col.update_many(
        filtro,
        {"$set": {"ativo": False, "dataAtualizacao": now, "dataInativacao": now}},
    )
    return result.modified_count


def registrar_sync(total_imoveis: int):
    """Grava timestamp e total do último scrape completo na coleção _meta."""
    db  = get_db()
    db["_meta"].update_one(
        {"key": "lastSync"},
        {"$set": {
            "key":          "lastSync",
            "ts":           datetime.now(timezone.utc),
            "totalImoveis": total_imoveis,
        }},
        upsert=True,
    )


def total_por_estado() -> dict:
    col = get_db()[os.environ.get("MONGODB_COLLECTION", "imoveis")]
    pipeline = [
        {"$match": {"ativo": True}},
        {"$group": {"_id": "$estado", "total": {"$sum": 1}}},
        {"$sort": {"total": -1}},
    ]
    return {r["_id"]: r["total"] for r in col.aggregate(pipeline)}
