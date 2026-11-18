from pymongo import MongoClient
from collections import defaultdict

uri = 'mongodb://admin:%40Acesso00@ac-jmn2ibr-shard-00-00.98n0hxa.mongodb.net:27017,ac-jmn2ibr-shard-00-01.98n0hxa.mongodb.net:27017,ac-jmn2ibr-shard-00-02.98n0hxa.mongodb.net:27017/?ssl=true&replicaSet=atlas-pjrbdp-shard-0&authSource=admin&appName=imoveis-caixa'

col = MongoClient(uri)['imoveis_caixa']['imoveis']

pipeline = [
    {"$group": {"_id": {"estado": "$estado", "cidade": "$cidade"}, "imoveis": {"$sum": 1}}},
    {"$sort": {"_id.estado": 1, "_id.cidade": 1}}
]
resultado = list(col.aggregate(pipeline))

# Agrupar por estado
estados = defaultdict(list)
for r in resultado:
    estado = r["_id"]["estado"]
    cidade = r["_id"]["cidade"]
    imoveis = r["imoveis"]
    estados[estado].append((cidade, imoveis))

# Nomes completos dos estados
nomes_estados = {
    "AC": "Acre", "AL": "Alagoas", "AM": "Amazonas", "AP": "Amapá",
    "BA": "Bahia", "CE": "Ceará", "DF": "Distrito Federal", "ES": "Espírito Santo",
    "GO": "Goiás", "MA": "Maranhão", "MG": "Minas Gerais", "MS": "Mato Grosso do Sul",
    "MT": "Mato Grosso", "PA": "Pará", "PB": "Paraíba", "PE": "Pernambuco",
    "PI": "Piauí", "PR": "Paraná", "RJ": "Rio de Janeiro", "RN": "Rio Grande do Norte",
    "RO": "Rondônia", "RR": "Roraima", "RS": "Rio Grande do Sul", "SC": "Santa Catarina",
    "SE": "Sergipe", "SP": "São Paulo", "TO": "Tocantins"
}

linhas = []
linhas.append("IMÓVEIS CAIXA — CIDADES DISPONÍVEIS POR ESTADO")
linhas.append("=" * 60)
linhas.append("")

total_cidades = 0
total_imoveis = 0

for uf in sorted(estados.keys()):
    cidades = estados[uf]
    nome = nomes_estados.get(uf, uf)
    linhas.append(f"{uf} — {nome} ({len(cidades)} cidades, {sum(q for _, q in cidades)} imóveis)")
    linhas.append("-" * 60)
    for cidade, qtd in cidades:
        linhas.append(f"  {cidade:<40} {qtd:>5} imóvel(is)")
    linhas.append("")
    total_cidades += len(cidades)
    total_imoveis += sum(q for _, q in cidades)

linhas.append("=" * 60)
linhas.append(f"TOTAL: {total_cidades} cidades | {total_imoveis} imóveis | 27 estados")

output = "\n".join(linhas)
print(output)

with open("cidades_por_estado.txt", "w", encoding="utf-8") as f:
    f.write(output)

print("\n\nArquivo salvo: cidades_por_estado.txt")
