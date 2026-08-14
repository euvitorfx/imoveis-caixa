"""
Gera web/public/cidades.json a partir do MongoDB.
Lista apenas cidades que têm ao menos 1 imóvel ativo no acervo.
"""
import json
from collections import defaultdict
from pymongo import MongoClient

URI = 'mongodb://admin:%40Acesso00@ac-jmn2ibr-shard-00-00.98n0hxa.mongodb.net:27017,ac-jmn2ibr-shard-00-01.98n0hxa.mongodb.net:27017,ac-jmn2ibr-shard-00-02.98n0hxa.mongodb.net:27017/?ssl=true&replicaSet=atlas-pjrbdp-shard-0&authSource=admin&appName=imoveis-caixa'

col = MongoClient(URI)['imoveis_caixa']['imoveis']

pipeline = [
    {"$group": {"_id": {"estado": "$estado", "cidade": "$cidade"}}},
    {"$sort": {"_id.estado": 1, "_id.cidade": 1}},
]
resultado = list(col.aggregate(pipeline))

cidades_por_estado: dict[str, list[str]] = defaultdict(list)
for r in resultado:
    uf = r["_id"]["estado"]
    cidade = r["_id"]["cidade"]
    if uf and cidade:
        cidades_por_estado[uf].append(cidade)

# Ordena estados e cidades
saida = {uf: sorted(cidades) for uf, cidades in sorted(cidades_por_estado.items())}

destino = "../web/public/cidades.json"
with open(destino, "w", encoding="utf-8") as f:
    json.dump(saida, f, ensure_ascii=False, separators=(",", ":"))

total = sum(len(v) for v in saida.values())
print(f"cidades.json gerado: {len(saida)} estados, {total} cidades")
for uf, cids in saida.items():
    print(f"  {uf}: {len(cids)} cidades")
