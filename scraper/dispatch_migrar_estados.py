#!/usr/bin/env python3
"""
Despacha um workflow de migração de fotos por estado em paralelo.
Cada estado roda em um job separado no GitHub Actions.

Uso: python dispatch_migrar_estados.py
"""

import json
import os
import time
import urllib.request
import urllib.error

GH_TOKEN = os.environ.get("GH_TOKEN", "")
REPO     = "euvitorfx/imoveis-caixa"

# Estados com imóveis pendentes (ordem decrescente de volume)
ESTADOS = [
    "RJ",  # 8.161
    "GO",  # 4.268
    "SP",  # 2.867
    "PE",  # 1.343
    "MG",  # 916
    "PB",  # 807
    "RS",  # 782
    "BA",  # 776
    "PI",  # 751
    "RN",  # 739
    "CE",  # 640
    "PR",  # 609
    "SE",  # 437
    "PA",  # 229
    "AM",  # 219
    "MA",  # 204
    "MS",  # 180
    "MT",  # 165
    "SC",  # 146
    "AL",  # 113
    "DF",  # 80
    "ES",  # 70
    "RO",  # 34
    "AC",  # 25
    "TO",  # 19
    "RR",  # 6
    "AP",  # 2
]

HEADERS = {
    "Authorization": f"Bearer {GH_TOKEN}",
    "Accept": "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
}


def get_workflow_id() -> int:
    req = urllib.request.Request(
        f"https://api.github.com/repos/{REPO}/actions/workflows",
        headers=HEADERS,
    )
    with urllib.request.urlopen(req) as r:
        data = json.loads(r.read())
    for w in data["workflows"]:
        if "migrar_fotos" in w["path"]:
            return w["id"]
    raise RuntimeError("Workflow migrar_fotos.yml não encontrado")


def dispatch(workflow_id: int, estado: str) -> bool:
    body = json.dumps({
        "ref": "main",
        "inputs": {"estado": estado, "limite": "0"},
    }).encode()
    req = urllib.request.Request(
        f"https://api.github.com/repos/{REPO}/actions/workflows/{workflow_id}/dispatches",
        data=body,
        method="POST",
        headers=HEADERS,
    )
    try:
        with urllib.request.urlopen(req) as r:
            return r.status == 204
    except urllib.error.HTTPError as e:
        print(f"    ERRO HTTP {e.code}: {e.read().decode()}")
        return False


def main():
    if not GH_TOKEN:
        print("ERRO: defina a variável de ambiente GH_TOKEN com seu Personal Access Token.")
        print("  Windows: $env:GH_TOKEN = 'ghp_...'")
        print("  Linux:   export GH_TOKEN=ghp_...")
        return

    print("Buscando workflow ID...")
    wf_id = get_workflow_id()
    print(f"Workflow ID: {wf_id}")
    print()
    print(f"Disparando {len(ESTADOS)} jobs em paralelo...\n")

    ok = 0
    for estado in ESTADOS:
        if dispatch(wf_id, estado):
            print(f"  [OK] {estado}")
            ok += 1
        else:
            print(f"  [ERRO] {estado}")
        time.sleep(0.5)  # evita rate limit da API do GitHub

    print()
    print(f"Total disparado: {ok}/{len(ESTADOS)} estados")
    print("Acompanhe em: https://github.com/euvitorfx/imoveis-caixa/actions")


if __name__ == "__main__":
    main()
