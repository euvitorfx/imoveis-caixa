from pymongo import MongoClient

uri = 'mongodb://admin:%40Acesso00@ac-jmn2ibr-shard-00-00.98n0hxa.mongodb.net:27017,ac-jmn2ibr-shard-00-01.98n0hxa.mongodb.net:27017,ac-jmn2ibr-shard-00-02.98n0hxa.mongodb.net:27017/?ssl=true&replicaSet=atlas-pjrbdp-shard-0&authSource=admin&appName=imoveis-caixa'

col = MongoClient(uri)['imoveis_caixa']['imoveis']

pipeline = [
    {"$group": {"_id": "$estado", "cidades": {"$addToSet": "$cidade"}, "imoveis": {"$sum": 1}}},
    {"$project": {"estado": "$_id", "num_cidades": {"$size": "$cidades"}, "imoveis": 1, "_id": 0}},
    {"$sort": {"num_cidades": -1}}
]
resultado = list(col.aggregate(pipeline))

print(f"Estados cobertos: {len(resultado)}\n")
print("Estado   Cidades  Imoveis")
print("-" * 30)
total_cidades = 0
for r in resultado:
    print(f"{str(r['estado']):<8} {r['num_cidades']:>7} {r['imoveis']:>9}")
    total_cidades += r['num_cidades']
print("-" * 30)
print(f"{'TOTAL':<8} {total_cidades:>7}")
