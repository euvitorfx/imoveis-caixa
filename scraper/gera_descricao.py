#!/usr/bin/env python3
"""
Geração automática de descrições para imóveis via Claude API (Haiku).

Uso:
  python gera_descricao.py                    # processa todos sem descrição
  python gera_descricao.py --limite 100       # processa até 100
  python gera_descricao.py --estado SP        # filtra por estado
  python gera_descricao.py --reprocessar      # regera descrições existentes
"""

import os
import sys
import time
from datetime import datetime, timezone
from dotenv import load_dotenv
import anthropic
from mongo import get_db

load_dotenv()

MODEL      = "claude-haiku-4-5-20251001"
MAX_TOKENS = 400
DELAY      = 0.2   # ~5 req/s — bem abaixo dos rate limits do Haiku


def parse_args():
    args        = sys.argv[1:]
    reprocessar = "--reprocessar" in args
    limite      = None
    estado      = None

    if "--limite" in args:
        idx = args.index("--limite")
        try:
            limite = int(args[idx + 1])
        except (IndexError, ValueError):
            pass

    if "--estado" in args:
        idx = args.index("--estado")
        try:
            estado = args[idx + 1].upper()
        except IndexError:
            pass

    return reprocessar, limite, estado


def fmt_brl(v: float) -> str:
    return f"R$ {v:,.0f}".replace(",", ".")


def build_prompt(doc: dict) -> str:
    linhas = []

    tipo   = doc.get("tipo", "Imóvel")
    bairro = doc.get("bairro", "")
    cidade = doc.get("cidade", "")
    estado = doc.get("estado", "")

    local = ", ".join(filter(None, [bairro, cidade]))
    if estado:
        local = f"{local}/{estado}" if local else estado

    linhas.append(f"Tipo: {tipo}")
    if local:
        linhas.append(f"Localização: {local}")
    if doc.get("areaTotal"):
        linhas.append(f"Área total: {doc['areaTotal']} m²")
    if doc.get("areaUtil"):
        linhas.append(f"Área privativa: {doc['areaUtil']} m²")
    if doc.get("areaTerreno"):
        linhas.append(f"Área do terreno: {doc['areaTerreno']} m²")
    if doc.get("quartos"):
        linhas.append(f"Quartos: {doc['quartos']}")
    if doc.get("suites"):
        linhas.append(f"Suítes: {doc['suites']}")
    if doc.get("vagas"):
        linhas.append(f"Vagas de garagem: {doc['vagas']}")
    if doc.get("ocupacao"):
        linhas.append(f"Ocupação: {doc['ocupacao']}")

    preco     = doc.get("preco")
    precoAval = doc.get("precoAval")
    if preco:
        linhas.append(f"Preço de venda: {fmt_brl(preco)}")
    if precoAval:
        linhas.append(f"Valor de avaliação: {fmt_brl(precoAval)}")
    if preco and precoAval and precoAval > preco:
        desconto = round((1 - preco / precoAval) * 100)
        economia = precoAval - preco
        linhas.append(f"Desconto: {desconto}% (economia de {fmt_brl(economia)})")

    if doc.get("modalidade"):
        linhas.append(f"Modalidade: {doc['modalidade']}")
    if doc.get("financiamento"):
        linhas.append(f"Financiamento bancário: {doc['financiamento']}")
    if doc.get("fgts") is True:
        linhas.append("FGTS: Aceita")
    if doc.get("dataLeilao1"):
        linhas.append(f"Data do leilão: {doc['dataLeilao1']}")

    dados = "\n".join(f"- {l}" for l in linhas)

    return f"""Gere uma descrição em português brasileiro para o imóvel da Caixa Econômica Federal abaixo.
Use APENAS os dados fornecidos — não invente detalhes sobre vizinhança, infraestrutura ou características não listadas.

DADOS:
{dados}

INSTRUÇÕES:
- Escreva exatamente 2 parágrafos separados por uma linha em branco
- 1º parágrafo: características físicas e localização do imóvel
- 2º parágrafo: destaque o desconto, as condições de venda e por que é uma boa oportunidade
- Máximo 140 palavras no total
- Português brasileiro natural e profissional, sem exageros
- Responda SOMENTE com os dois parágrafos — sem títulos, marcadores ou qualquer outro texto"""


def gera_descricao(client: anthropic.Anthropic, doc: dict) -> str | None:
    try:
        msg = client.messages.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            messages=[{"role": "user", "content": build_prompt(doc)}],
        )
        return msg.content[0].text.strip()
    except anthropic.RateLimitError:
        print("    Rate limit atingido — aguardando 30s...")
        time.sleep(30)
        return None
    except Exception as e:
        print(f"    Erro na API: {e}")
        return None


def main():
    reprocessar, limite, estado = parse_args()

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("  ERRO: variável ANTHROPIC_API_KEY não definida.")
        sys.exit(1)

    client = anthropic.Anthropic(api_key=api_key)
    col    = get_db()[os.environ.get("MONGODB_COLLECTION", "imoveis")]

    filtro: dict = {"ativo": True}
    if not reprocessar:
        filtro["descricao"] = {"$exists": False}
    if estado:
        filtro["estado"] = estado

    total_pendente = col.count_documents(filtro)
    a_processar    = min(total_pendente, limite) if limite else total_pendente

    modo = "reprocessar" if reprocessar else "novos"
    print()
    print("=" * 60)
    print("  Geração de Descrições — Claude Haiku")
    print(f"  Início   : {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M:%S')} UTC")
    print(f"  Modo     : {modo}")
    print(f"  Modelo   : {MODEL}")
    print(f"  Pendentes: {total_pendente:,}")
    print(f"  A gerar  : {a_processar:,}")
    if estado:
        print(f"  Estado   : {estado}")
    print("=" * 60)

    if a_processar == 0:
        print("\n  Nenhum imóvel pendente. Use --reprocessar para forçar.")
        return

    campos = {
        "hdnImovel": 1, "tipo": 1, "bairro": 1, "cidade": 1, "estado": 1,
        "areaTotal": 1, "areaUtil": 1, "areaTerreno": 1,
        "quartos": 1, "suites": 1, "vagas": 1, "ocupacao": 1,
        "preco": 1, "precoAval": 1, "modalidade": 1,
        "financiamento": 1, "fgts": 1, "dataLeilao1": 1,
    }

    gerados = erros = processados = 0

    try:
        cursor = col.find(filtro, campos).limit(a_processar or 0)

        for doc in cursor:
            hdn       = doc["hdnImovel"]
            descricao = gera_descricao(client, doc)

            if descricao:
                col.update_one(
                    {"_id": doc["_id"]},
                    {"$set": {
                        "descricao":        descricao,
                        "descricaoGeradaEm": datetime.now(timezone.utc),
                    }},
                )
                gerados += 1
            else:
                erros += 1

            processados += 1

            if processados % 100 == 0 or processados == a_processar:
                pct = processados / a_processar * 100 if a_processar else 0
                print(f"  [{processados:,}/{a_processar:,}] {pct:.1f}% | gerados={gerados:,} erros={erros}")

            time.sleep(DELAY)

    except KeyboardInterrupt:
        print(f"\n  Interrompido após {processados:,} registros.")

    print()
    print("=" * 60)
    print("  RESUMO")
    print(f"  Processados: {processados:,}")
    print(f"  Gerados    : {gerados:,}")
    print(f"  Erros      : {erros}")
    print("=" * 60)
    print()


if __name__ == "__main__":
    main()
