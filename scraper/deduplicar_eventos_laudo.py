"""
Deduplicar eventos_laudo — remove registros duplicados causados pelo bug
de dupla contagem (sendBeacon + localStorage queue enviados juntos).

Critério de duplicata:
  Dois eventos com mesmo tipo + imovelId + chave-de-identidade (anonId OU userId)
  onde o segundo ocorreu em até 10 minutos após o primeiro.

O primeiro evento (mais antigo) é preservado; os subsequentes são removidos.
"""

import os
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

MAX_DELTA = timedelta(minutes=10)


def get_db():
    client = MongoClient(os.environ["MONGODB_URI"], serverSelectionTimeoutMS=15000)
    return client[os.environ.get("MONGODB_DB", "imoveis_caixa")]


def deduplicar(dry_run: bool = True):
    db = get_db()
    col = db["eventos_laudo"]

    total = col.count_documents({})
    print(f"Total de eventos no banco: {total}")

    # Busca todos os eventos ordenados por data ascendente
    eventos = list(col.find({}, {"_id": 1, "tipo": 1, "imovelId": 1,
                                  "userId": 1, "anonId": 1, "criadoEm": 1})
                     .sort("criadoEm", 1))

    print(f"Eventos carregados: {len(eventos)}")

    ids_para_deletar = []

    # Agrupa por (tipo, imovelId, identidade)
    # Identidade = userId se logado, anonId se anônimo
    grupos: dict[tuple, list] = {}
    for e in eventos:
        tipo = e.get("tipo", "")
        imovel = str(e.get("imovelId", ""))
        user_id = str(e.get("userId") or "")
        anon_id = str(e.get("anonId") or "")
        identidade = user_id if user_id else anon_id
        if not identidade:
            continue  # sem identidade — não dá pra deduplicar com segurança
        chave = (tipo, imovel, identidade)
        grupos.setdefault(chave, []).append(e)

    for chave, grupo in grupos.items():
        if len(grupo) < 2:
            continue

        # Dentro do grupo, marca duplicatas: eventos dentro de 10min do anterior aceito
        ultimo_aceito_ts: datetime | None = None

        for e in grupo:  # já ordenado por criadoEm asc
            ts_raw = e.get("criadoEm")
            if isinstance(ts_raw, str):
                try:
                    ts = datetime.fromisoformat(ts_raw.replace("Z", "+00:00"))
                except ValueError:
                    continue
            elif isinstance(ts_raw, datetime):
                ts = ts_raw if ts_raw.tzinfo else ts_raw.replace(tzinfo=timezone.utc)
            else:
                continue

            if ultimo_aceito_ts is None:
                # Primeiro evento do grupo: aceito
                ultimo_aceito_ts = ts
            elif ts - ultimo_aceito_ts <= MAX_DELTA:
                # Dentro da janela de 10min do último aceito → duplicata
                ids_para_deletar.append(e["_id"])
            else:
                # Fora da janela → clique legítimo separado, aceita e reseta janela
                ultimo_aceito_ts = ts

    print(f"\nDuplicatas encontradas: {len(ids_para_deletar)}")

    if not ids_para_deletar:
        print("Nada a deletar.")
        return

    # Prévia por tipo
    for e in eventos:
        if e["_id"] in set(ids_para_deletar):
            pass  # não imprime cada um para não poluir

    contagem_por_tipo: dict[str, int] = {}
    ids_set = set(ids_para_deletar)
    for e in eventos:
        if e["_id"] in ids_set:
            t = e.get("tipo", "?")
            contagem_por_tipo[t] = contagem_por_tipo.get(t, 0) + 1

    for tipo, qtd in sorted(contagem_por_tipo.items()):
        print(f"  {tipo}: {qtd} duplicatas")

    if dry_run:
        print("\n[DRY RUN] Nenhum documento foi deletado. Passe dry_run=False para aplicar.")
        return

    result = col.delete_many({"_id": {"$in": ids_para_deletar}})
    print(f"\n✓ {result.deleted_count} eventos duplicados removidos.")
    print(f"  Eventos restantes: {col.count_documents({})}")


if __name__ == "__main__":
    import sys
    aplicar = "--apply" in sys.argv
    if not aplicar:
        print("=" * 60)
        print("MODO DRY RUN — para aplicar, passe --apply")
        print("=" * 60)
    deduplicar(dry_run=not aplicar)
