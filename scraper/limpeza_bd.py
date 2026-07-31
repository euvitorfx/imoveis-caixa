"""
Limpeza do MongoDB Atlas para liberar espaço (M0 = 512 MB).

Operações:
  1. Apara historicoPreco para as últimas 30 entradas em todos os documentos
  2. Deleta imóveis com ativo=false (já vendidos/removidos da Caixa)

Uso:
  python limpeza_bd.py           # executa tudo
  python limpeza_bd.py --dry-run # só conta, não altera nada
"""

import os
import sys
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

DRY_RUN = "--dry-run" in sys.argv

uri = os.environ["MONGODB_URI"]
db_name = os.environ.get("MONGODB_DB", "imoveis_caixa")
col_name = os.environ.get("MONGODB_COLLECTION", "imoveis")

client = MongoClient(uri, serverSelectionTimeoutMS=15000)
col = client[db_name][col_name]

print("=" * 60)
print("  Limpeza do MongoDB Atlas")
print(f"  Modo: {'DRY-RUN (sem alterações)' if DRY_RUN else 'EXECUÇÃO REAL'}")
print("=" * 60)

# 1. Contar e deletar ativo=false
total_inativos = col.count_documents({"ativo": False})
print(f"\n[1] Imóveis inativos (ativo=false): {total_inativos:,}")

if not DRY_RUN and total_inativos > 0:
    result = col.delete_many({"ativo": False})
    print(f"    Deletados: {result.deleted_count:,}")
elif DRY_RUN:
    print(f"    (dry-run) Seriam deletados: {total_inativos:,}")

# 2. Aparar historicoPreco para últimas 30 entradas
print(f"\n[2] Aparando historicoPreco para as últimas 30 entradas...")

docs_com_historico = col.count_documents({"historicoPreco.30": {"$exists": True}})
print(f"    Documentos com mais de 30 entradas: {docs_com_historico:,}")

if not DRY_RUN and docs_com_historico > 0:
    atualizado = 0
    cursor = col.find(
        {"historicoPreco.30": {"$exists": True}},
        {"_id": 1, "historicoPreco": 1},
        batch_size=500,
    )
    ops = []
    from pymongo import UpdateOne as UOne
    for doc in cursor:
        historico = doc.get("historicoPreco", [])
        trimmed = historico[-30:]
        ops.append(UOne({"_id": doc["_id"]}, {"$set": {"historicoPreco": trimmed}}))
        if len(ops) >= 500:
            col.bulk_write(ops, ordered=False)
            atualizado += len(ops)
            print(f"    ...{atualizado:,} documentos processados")
            ops = []
    if ops:
        col.bulk_write(ops, ordered=False)
        atualizado += len(ops)
    print(f"    Total aparados: {atualizado:,}")
elif DRY_RUN:
    print(f"    (dry-run) Seriam aparados: {docs_com_historico:,}")

# 3. Resumo final
total_ativo = col.count_documents({"ativo": True})
total_geral = col.count_documents({})
print(f"\n[3] Estado final da collection:")
print(f"    Imóveis ativos:  {total_ativo:,}")
print(f"    Total geral:     {total_geral:,}")

print("\n  Verifique o tamanho do banco em: https://cloud.mongodb.com")
print("=" * 60)
