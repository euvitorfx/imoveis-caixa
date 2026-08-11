"""
Diagnóstico: baixa o HTML de 5 imóveis enriquecidos sem matriculaUrl
e imprime TODOS os ExibeDoc encontrados na página para descobrir o padrão real.
"""
from dotenv import load_dotenv
from mongo import get_db
from scraper import CaixaScraper
import os, re, random

load_dotenv()

col = get_db()[os.environ["MONGODB_COLLECTION"]]

docs = list(col.find(
    {"ativo": True, "enriched": True, "matriculaUrl": {"$exists": False}},
    {"hdnImovel": 1, "urlDetalhe": 1}
).limit(200))

amostra = random.sample(docs, min(5, len(docs)))
scraper = CaixaScraper(headless=True)

try:
    for doc in amostra:
        hdn = doc["hdnImovel"]
        url = doc.get("urlDetalhe") or \
              f"https://venda-imoveis.caixa.gov.br/sistema/detalhe-imovel.asp?hdnImovel={hdn}"

        print(f"\n{'='*60}")
        print(f"  Imóvel: {hdn}")
        print(f"  URL   : {url}")

        try:
            scraper.page.goto(url, timeout=30_000, wait_until="domcontentloaded")
            html = scraper.page.content()

            # Todos os ExibeDoc encontrados
            matches = re.findall(r"ExibeDoc\([^)]+\)", html, re.I)
            if matches:
                print(f"  ExibeDoc encontrados ({len(matches)}):")
                for m in matches:
                    print(f"    {m}")
            else:
                print("  Nenhum ExibeDoc encontrado na página.")

            # Também procura links/hrefs com .pdf
            pdfs = re.findall(r"""(?:href|src|onclick)=['"][^'"]*\.pdf[^'"]*['"]""", html, re.I)
            if pdfs:
                print(f"  Links PDF encontrados ({len(pdfs)}):")
                for p in pdfs[:10]:
                    print(f"    {p}")

        except Exception as e:
            print(f"  ERRO: {e}")

finally:
    scraper.close()

print(f"\n{'='*60}")
print("  Diagnóstico concluído.")
print(f"{'='*60}\n")
