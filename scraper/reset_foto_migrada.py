#!/usr/bin/env python3
"""
Remove o flag fotoMigrada de todos os registros que ainda apontam para
URLs da Caixa (ou seja, nunca foram de fato migrados para o R2).

Uso: python reset_foto_migrada.py
"""

import os
from dotenv import load_dotenv
from mongo import get_db

load_dotenv()


def main():
    col = get_db()[os.environ.get("MONGODB_COLLECTION", "imoveis")]

    # Antes
    total_flag = col.count_documents({"fotoMigrada": True})
    pendentes  = col.count_documents({
        "fotoUrl": {"$regex": "caixa\\.gov\\.br", "$options": "i"}
    })

    print(f"Registros com fotoMigrada=True : {total_flag:,}")
    print(f"Registros ainda com URL Caixa  : {pendentes:,}")
    print()

    # Remove fotoMigrada de todos que ainda têm URL da Caixa
    result = col.update_many(
        {"fotoUrl": {"$regex": "caixa\\.gov\\.br", "$options": "i"}},
        {"$unset": {"fotoMigrada": ""}},
    )

    print(f"Flags removidos: {result.modified_count:,}")

    # Confere
    restantes = col.count_documents({"fotoMigrada": True})
    print(f"Ainda com fotoMigrada=True: {restantes:,}")
    print()
    print("Pronto — todos os imóveis com URL Caixa estão prontos para re-migração.")


if __name__ == "__main__":
    main()
