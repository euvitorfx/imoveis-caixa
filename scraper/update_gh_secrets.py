"""
Atualiza secrets do GitHub Actions via API.
Requer PyNaCl para criptografar os valores.
"""
import base64
import json
import urllib.request
import urllib.error
from nacl import encoding, public

import os
GH_TOKEN = os.environ.get("GH_TOKEN", "")
REPO     = os.environ.get("GH_REPO", "euvitorfx/imoveis-caixa")

SECRETS = {
    "MONGODB_URI": (
        "mongodb://admin:%40Acesso00@"
        "ac-jmn2ibr-shard-00-00.98n0hxa.mongodb.net:27017,"
        "ac-jmn2ibr-shard-00-01.98n0hxa.mongodb.net:27017,"
        "ac-jmn2ibr-shard-00-02.98n0hxa.mongodb.net:27017"
        "/?ssl=true&replicaSet=atlas-pjrbdp-shard-0&authSource=admin&appName=imoveis-caixa"
    ),
    "CLOUDINARY_CLOUD_NAME": "dhh78ri31",
    "CLOUDINARY_API_KEY":    "657395428919979",
    "CLOUDINARY_API_SECRET": "UEnns4vJlDS9H-mNmm-9x-rE0uw",
    # Cloudflare R2
    "R2_ACCOUNT_ID":        "9c301ef19c8dfcd8da1f2fa6f6b7cb6b",
    "R2_ACCESS_KEY_ID":     "ba2152cc61b340b6e32f0190ab431af9",
    "R2_SECRET_ACCESS_KEY": "e74c14db1440ce97a2f26916b882051fddc6eb9997871974646a4f9c7e7e2c27",
    "R2_BUCKET_NAME":       "imoveis-caixa",
    "R2_PUBLIC_URL":        "https://pub-55673c9129354bcdad5bb571c2237b66.r2.dev",
}


def gh_request(method, path, data=None):
    url = f"https://api.github.com{path}"
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(
        url, data=body, method=method,
        headers={
            "Authorization": f"Bearer {GH_TOKEN}",
            "Accept": "application/vnd.github+json",
            "Content-Type": "application/json",
            "X-GitHub-Api-Version": "2022-11-28",
        }
    )
    with urllib.request.urlopen(req) as r:
        body = r.read()
        return json.loads(body) if body else {}


def encrypt_secret(public_key_b64: str, secret_value: str) -> str:
    """Criptografa o secret usando SealedBox (libsodium)."""
    public_key = public.PublicKey(public_key_b64.encode(), encoding.Base64Encoder())
    sealed_box = public.SealedBox(public_key)
    encrypted = sealed_box.encrypt(secret_value.encode())
    return base64.b64encode(encrypted).decode()


def main():
    # 1. Buscar chave pública do repositório
    key_info = gh_request("GET", f"/repos/{REPO}/actions/secrets/public-key")
    key_id   = key_info["key_id"]
    key_b64  = key_info["key"]
    print(f"Chave pública obtida (key_id={key_id})")

    # 2. Criar/atualizar cada secret
    for name, value in SECRETS.items():
        encrypted = encrypt_secret(key_b64, value)
        try:
            gh_request("PUT", f"/repos/{REPO}/actions/secrets/{name}", {
                "encrypted_value": encrypted,
                "key_id": key_id,
            })
            print(f"  [OK] Secret atualizado: {name}")
        except urllib.error.HTTPError as e:
            print(f"  [ERRO] Ao atualizar {name}: {e.code} {e.read().decode()}")

    print("\nPronto! Todos os secrets foram processados.")


if __name__ == "__main__":
    main()
