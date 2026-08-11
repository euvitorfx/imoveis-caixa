from dotenv import load_dotenv
from mongo import get_db
import os

load_dotenv()

col = get_db()[os.environ["MONGODB_COLLECTION"]]

total          = col.count_documents({"ativo": True})
nao_enriquecido = col.count_documents({"ativo": True, "enriched": {"$ne": True}})
sem_matricula  = col.count_documents({"ativo": True, "enriched": True, "matriculaUrl": {"$exists": False}})
com_matricula  = col.count_documents({"ativo": True, "matriculaUrl": {"$exists": True}})

print()
print("=" * 50)
print("  Auditoria — Matrícula de imóveis")
print("=" * 50)
print(f"  Total ativo            : {total:,}")
print(f"  Não enriquecido ainda  : {nao_enriquecido:,}  ({nao_enriquecido/total*100:.1f}%)")
print(f"  Enriquecido sem PDF    : {sem_matricula:,}  ({sem_matricula/total*100:.1f}%)")
print(f"  Com matriculaUrl       : {com_matricula:,}  ({com_matricula/total*100:.1f}%)")
print("=" * 50)
print()
