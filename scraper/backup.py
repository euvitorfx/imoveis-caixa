"""
Backup das coleções críticas do MongoDB para o Cloudflare R2.

Coletas exportadas:
  - users              (contas, favoritos, telefones)
  - analises_viabilidade (planilhas salvas pelos usuários)
  - imoveis            (acervo completo — inclui geocoding, fotos, descrições enriquecidas)

Formato: JSONL (uma linha por documento) comprimido com gzip.
Destino: backups/YYYY-MM-DD/<colecao>.jsonl.gz
Retenção: últimas 8 semanas (configurável via BACKUP_RETENCAO_SEMANAS).
"""

import gzip
import io
import json
import os
import sys
from datetime import datetime, timezone
from bson import ObjectId
from dotenv import load_dotenv
import boto3
from pymongo import MongoClient

load_dotenv()

COLECOES = ["users", "analises_viabilidade", os.environ.get("MONGODB_COLLECTION", "imoveis")]
RETENCAO = int(os.environ.get("BACKUP_RETENCAO_SEMANAS", 8))
PASTA_RAIZ = "backups"


# ── Serialização ────────────────────────────────────────────────────────────

def _serial(obj):
    if isinstance(obj, ObjectId):
        return str(obj)
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Tipo não serializável: {type(obj)}")


def exportar_colecao(col) -> bytes:
    """Exporta todos os documentos da coleção como JSONL gzipado."""
    buf = io.BytesIO()
    with gzip.GzipFile(fileobj=buf, mode="wb") as gz:
        for doc in col.find({}):
            linha = json.dumps(doc, default=_serial, ensure_ascii=False) + "\n"
            gz.write(linha.encode("utf-8"))
    return buf.getvalue()


# ── R2 ──────────────────────────────────────────────────────────────────────

def r2_client():
    account_id = os.environ["R2_ACCOUNT_ID"]
    return boto3.client(
        "s3",
        endpoint_url=f"https://{account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
        region_name="auto",
    )


def listar_pastas_backup(s3, bucket: str) -> list[str]:
    """Retorna lista ordenada de datas de backup (ex: ['2026-07-01', ...])."""
    resp = s3.list_objects_v2(Bucket=bucket, Prefix=f"{PASTA_RAIZ}/", Delimiter="/")
    prefixes = resp.get("CommonPrefixes", [])
    datas = sorted(
        p["Prefix"].rstrip("/").split("/")[-1]
        for p in prefixes
        if p["Prefix"].count("/") == 2
    )
    return datas


def limpar_backups_antigos(s3, bucket: str, datas: list[str]):
    """Remove pastas de backup além do limite de retenção."""
    a_remover = datas[:-RETENCAO] if len(datas) > RETENCAO else []
    for data in a_remover:
        prefixo = f"{PASTA_RAIZ}/{data}/"
        resp = s3.list_objects_v2(Bucket=bucket, Prefix=prefixo)
        objetos = [{"Key": o["Key"]} for o in resp.get("Contents", [])]
        if objetos:
            s3.delete_objects(Bucket=bucket, Delete={"Objects": objetos})
            print(f"  🗑  Backup antigo removido: {data} ({len(objetos)} arquivos)")


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    hoje = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    bucket = os.environ["R2_BUCKET_NAME"]

    print(f"=== Backup MongoDB → R2 ({hoje}) ===\n")

    # Conexão MongoDB
    client = MongoClient(os.environ["MONGODB_URI"], serverSelectionTimeoutMS=15000)
    db = client[os.environ["MONGODB_DB"]]

    # Conexão R2
    s3 = r2_client()

    manifest = {"data": hoje, "colecoes": {}}
    total_bytes = 0

    for nome_col in COLECOES:
        col = db[nome_col]
        total_docs = col.count_documents({})
        print(f"  Exportando '{nome_col}' ({total_docs:,} docs)...")

        dados = exportar_colecao(col)
        tamanho_kb = len(dados) / 1024

        chave = f"{PASTA_RAIZ}/{hoje}/{nome_col}.jsonl.gz"
        s3.put_object(
            Bucket=bucket,
            Key=chave,
            Body=dados,
            ContentType="application/gzip",
        )
        print(f"    ✓ {chave}  ({tamanho_kb:,.0f} KB)")

        manifest["colecoes"][nome_col] = {"docs": total_docs, "bytes": len(dados)}
        total_bytes += len(dados)

    # Manifesto com resumo
    manifest_json = json.dumps(manifest, ensure_ascii=False, indent=2).encode("utf-8")
    s3.put_object(
        Bucket=bucket,
        Key=f"{PASTA_RAIZ}/{hoje}/manifest.json",
        Body=manifest_json,
        ContentType="application/json",
    )

    print(f"\n  Total transferido: {total_bytes / 1024 / 1024:.1f} MB")

    # Limpeza de backups antigos
    print(f"\n  Verificando retenção (máx. {RETENCAO} semanas)...")
    datas = listar_pastas_backup(s3, bucket)
    datas_com_hoje = sorted(set(datas + [hoje]))
    limpar_backups_antigos(s3, bucket, datas_com_hoje)

    print(f"\n=== Backup concluído. {len(datas_com_hoje)} backup(s) armazenado(s). ===")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\n❌ Erro no backup: {e}", file=sys.stderr)
        sys.exit(1)
