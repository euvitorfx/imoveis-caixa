from pymongo import MongoClient
from datetime import datetime, timezone, timedelta

uri = (
    "mongodb://admin:%40Acesso00@"
    "ac-jmn2ibr-shard-00-00.98n0hxa.mongodb.net:27017,"
    "ac-jmn2ibr-shard-00-01.98n0hxa.mongodb.net:27017,"
    "ac-jmn2ibr-shard-00-02.98n0hxa.mongodb.net:27017"
    "/?ssl=true&replicaSet=atlas-pjrbdp-shard-0&authSource=admin&appName=imoveis-caixa"
)
col = MongoClient(uri)["imoveis_caixa"]["imoveis"]

# Desde quando o enrich falhou (22/mai)
desde = datetime(2026, 5, 22, tzinfo=timezone.utc)

# 1. Imóveis ativos sem enriquecimento (enriched != True)
sem_enrich = col.count_documents({"ativo": True, "enriched": {"$ne": True}})

# 2. Imóveis adicionados pelo scraper desde 22/mai (potencialmente sem enrich)
novos_sem_enrich = col.count_documents({
    "enriched": {"$ne": True},
    "dataInsercao": {"$gte": desde}
})

# 3. Impacto nos filtros: quantos ativos têm fgts, ocupacao, dataLeilao1
total_ativos = col.count_documents({"ativo": True})
com_fgts     = col.count_documents({"ativo": True, "fgts": {"$exists": True}})
com_ocupacao = col.count_documents({"ativo": True, "ocupacao": {"$exists": True, "$ne": None, "$ne": ""}})
com_leilao   = col.count_documents({"ativo": True, "dataLeilao1Date": {"$exists": True}})
com_foto_caixa = col.count_documents({"ativo": True, "fotoUrl": {"$regex": "caixa.gov.br"}})
com_foto_cloudinary = col.count_documents({"ativo": True, "fotoUrl": {"$regex": "cloudinary"}})

print("=" * 55)
print("  IMPACTO DO ENRICH PARADO (desde ~22/mai)")
print("=" * 55)
print(f"  Total de imóveis ativos:            {total_ativos:>7,}")
print(f"  Sem enriquecimento (enriched!=true): {sem_enrich:>7,}")
print(f"  Novos desde 22/mai sem enrich:       {novos_sem_enrich:>7,}")
print()
print("  CAMPOS QUE DEPENDEM DO ENRICH:")
print(f"  Com campo 'fgts':                   {com_fgts:>7,}  ({com_fgts/total_ativos*100:.1f}%)")
print(f"  Com campo 'ocupacao':               {com_ocupacao:>7,}  ({com_ocupacao/total_ativos*100:.1f}%)")
print(f"  Com 'dataLeilao1Date':              {com_leilao:>7,}  ({com_leilao/total_ativos*100:.1f}%)")
print()
print("  FOTOS:")
print(f"  URL ainda no caixa.gov.br:          {com_foto_caixa:>7,}  (PDF quebrado)")
print(f"  URL já no Cloudinary:               {com_foto_cloudinary:>7,}")
print("=" * 55)
