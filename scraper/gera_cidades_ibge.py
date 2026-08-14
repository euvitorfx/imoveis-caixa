"""
Gera web/public/cidades.json com TODOS os municípios do Brasil via API do IBGE.
Nomes normalizados: maiúsculas + sem acento, para bater com o formato da Caixa.
"""
import gzip
import json
import unicodedata
import urllib.request
from collections import defaultdict

IBGE_URL = "https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome"

def normalizar(nome: str) -> str:
    """Remove acentos e converte para maiúsculas — mesmo formato que a Caixa usa."""
    sem_acento = unicodedata.normalize("NFD", nome)
    sem_acento = "".join(c for c in sem_acento if unicodedata.category(c) != "Mn")
    return sem_acento.upper()

print("Buscando municípios na API do IBGE...")
req = urllib.request.Request(IBGE_URL, headers={"Accept-Encoding": "identity"})
with urllib.request.urlopen(req, timeout=30) as resp:
    raw = resp.read()
    try:
        municipios = json.loads(raw)
    except Exception:
        municipios = json.loads(gzip.decompress(raw))

print(f"  {len(municipios)} municípios recebidos")

cidades_por_estado: dict[str, list[str]] = defaultdict(list)
for m in municipios:
    try:
        uf = m["microrregiao"]["mesorregiao"]["UF"]["sigla"]
    except (TypeError, KeyError):
        # Fallback: alguns municípios usam estrutura diferente
        uf = (m.get("regiao-imediata") or {}).get("regiao-intermediaria", {}).get("UF", {}).get("sigla")
    if not uf:
        continue
    nome_normalizado = normalizar(m["nome"])
    cidades_por_estado[uf].append(nome_normalizado)

# Ordena estados e cidades
saida = {uf: sorted(set(cidades)) for uf, cidades in sorted(cidades_por_estado.items())}

destino = "../web/public/cidades.json"
with open(destino, "w", encoding="utf-8") as f:
    json.dump(saida, f, ensure_ascii=False, separators=(",", ":"))

total = sum(len(v) for v in saida.values())
print(f"\ncidades.json gerado: {len(saida)} estados, {total} municípios")
for uf, cids in saida.items():
    print(f"  {uf}: {len(cids)} municípios")
