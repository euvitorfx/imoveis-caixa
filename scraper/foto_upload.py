"""
Upload de fotos de imóveis para o Cloudflare R2.
Baixa a imagem da Caixa com requests e envia ao R2 via API S3-compatível.
Retorna a URL pública do R2 ou None em caso de falha.
"""

import os
import io
from typing import Optional
import requests
import boto3
from botocore.exceptions import ClientError
from dotenv import load_dotenv

load_dotenv()

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36"
    ),
    "Referer": "https://venda-imoveis.caixa.gov.br/",
}


def _s3_client():
    account_id = os.environ["R2_ACCOUNT_ID"]
    return boto3.client(
        "s3",
        endpoint_url=f"https://{account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
        region_name="auto",
    )


def upload_foto(hdn_imovel: str, foto_url: str) -> Optional[str]:
    """
    Faz upload da foto para o R2.
    Idempotente: se a foto já existe no R2, retorna a URL sem re-upload.
    """
    bucket     = os.environ["R2_BUCKET_NAME"]
    public_url = os.environ["R2_PUBLIC_URL"].rstrip("/")
    key        = f"imoveis-caixa/{hdn_imovel}"
    s3         = _s3_client()

    # Verifica se já existe — evita re-upload desnecessário
    try:
        s3.head_object(Bucket=bucket, Key=key)
        return f"{public_url}/{key}"
    except ClientError as e:
        if e.response["Error"]["Code"] not in ("404", "NoSuchKey"):
            print(f"    [r2] erro ao checar {hdn_imovel}: {e}")
            return None

    # Baixa da Caixa
    try:
        resp = requests.get(foto_url, headers=_HEADERS, timeout=20)
        if not resp.ok or not resp.content:
            return None
    except Exception as e:
        print(f"    [r2] erro ao baixar {hdn_imovel}: {e}")
        return None

    # Faz upload para o R2
    try:
        content_type = resp.headers.get("content-type", "image/jpeg").split(";")[0]
        s3.put_object(
            Bucket=bucket,
            Key=key,
            Body=resp.content,
            ContentType=content_type,
        )
        return f"{public_url}/{key}"
    except Exception as e:
        print(f"    [r2] erro ao fazer upload de {hdn_imovel}: {e}")
        return None
