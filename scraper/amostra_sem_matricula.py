from dotenv import load_dotenv
from mongo import get_db
import os, random

load_dotenv()

col = get_db()[os.environ["MONGODB_COLLECTION"]]

# 10 imóveis enriquecidos mas sem matriculaUrl
docs = list(col.find(
    {"ativo": True, "enriched": True, "matriculaUrl": {"$exists": False}},
    {"hdnImovel": 1, "urlDetalhe": 1, "tipo": 1, "cidade": 1, "estado": 1, "modalidade": 1}
).limit(500))

amostra = random.sample(docs, min(10, len(docs)))

print()
print("=" * 70)
print("  10 imóveis enriquecidos SEM matriculaUrl — abra no browser e verifique")
print("=" * 70)
for d in amostra:
    url = d.get("urlDetalhe") or f"https://venda-imoveis.caixa.gov.br/sistema/detalhe-imovel.asp?hdnImovel={d['hdnImovel']}"
    print(f"\n  {d.get('tipo','?')} · {d.get('cidade','?')}/{d.get('estado','?')} [{d.get('modalidade','?')}]")
    print(f"  {url}")
print()
print("  Verifique se a página da Caixa mostra o botão 'Matrícula' para esses imóveis.")
print("  Se sim → o regex do scraper precisa ser ampliado.")
print("  Se não → a Caixa realmente não disponibiliza o PDF para esses imóveis.")
print("=" * 70)
print()
