"""
Upload de fotos de imóveis para o Cloudinary.
Baixa a imagem localmente com requests (para contornar CORS da Caixa)
e envia os bytes ao Cloudinary.
Retorna a URL segura do Cloudinary ou None em caso de falha.
"""

import os
import io
from typing import Optional
import requests
import cloudinary
import cloudinary.uploader
from dotenv import load_dotenv

load_dotenv()

cloudinary.config(
    cloud_name=os.environ["CLOUDINARY_CLOUD_NAME"],
    api_key=os.environ["CLOUDINARY_API_KEY"],
    api_secret=os.environ["CLOUDINARY_API_SECRET"],
    secure=True,
)

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36"
    ),
    "Referer": "https://venda-imoveis.caixa.gov.br/",
}


def upload_foto(hdn_imovel: str, foto_url: str) -> Optional[str]:
    """
    Baixa a foto da Caixa e faz upload para o Cloudinary.
    O public_id é baseado no hdnImovel (idempotente — não reprocessa se já existe).
    """
    try:
        # Baixa a imagem com headers que a Caixa aceita
        resp = requests.get(foto_url, headers=_HEADERS, timeout=20)
        if not resp.ok or not resp.content:
            return None

        result = cloudinary.uploader.upload(
            io.BytesIO(resp.content),
            public_id=f"imoveis-caixa/{hdn_imovel}",
            overwrite=False,
            resource_type="image",
            timeout=30,
        )
        return result.get("secure_url")
    except Exception as e:
        print(f"    [cloudinary] erro ao fazer upload de {hdn_imovel}: {e}")
        return None
