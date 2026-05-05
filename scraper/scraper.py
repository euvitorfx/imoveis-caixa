"""
Scraper — Caixa Imóveis via download-lista.asp
-----------------------------------------------
Usa Playwright (headless) para baixar os CSVs oficiais da Caixa.
Não precisa de captcha. Funciona em GitHub Actions.
"""

import csv
import io
import re
import time
from datetime import datetime
from typing import Optional

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

BASE_URL = "https://venda-imoveis.caixa.gov.br"
DL_URL   = f"{BASE_URL}/sistema/download-lista.asp"
DET_URL  = f"{BASE_URL}/sistema/detalhe-imovel.asp"

# 27 UFs + "geral" para baixar o Brasil todo de uma vez
ALL_ESTADOS = [
    "AC","AL","AM","AP","BA","CE","DF","ES","GO",
    "MA","MG","MS","MT","PA","PB","PE","PI","PR",
    "RJ","RN","RO","RR","RS","SC","SE","SP","TO",
]


def _parse_date_br(date_str: str) -> Optional[datetime]:
    """Converte 'DD/MM/YYYY' → datetime UTC para armazenar como ISODate no MongoDB."""
    try:
        return datetime.strptime(date_str.strip(), "%d/%m/%Y")
    except (ValueError, AttributeError):
        return None


def _br_float(text: str) -> Optional[float]:
    """Converte '1.234,56' → 1234.56"""
    if not text:
        return None
    clean = re.sub(r"[^\d,]", "", str(text).strip()).replace(",", ".")
    try:
        return float(clean)
    except ValueError:
        return None


def _parse_descricao(desc: str) -> dict:
    """
    Extrai tipo, área total, área privativa e área do terreno da coluna Descrição.
    Ex: 'Casa, 98.00 de área total, 98.00 de área privativa, 250.00 de área do terreno,'
    """
    result: dict = {}
    desc = str(desc).strip()

    # Tipo: primeira palavra/frase antes da vírgula
    parts = desc.split(",")
    if parts:
        result["tipo"] = parts[0].strip()

    m = re.search(r"([\d.]+)\s*de\s*[áa]rea\s*total", desc, re.I)
    if m:
        result["areaTotal"] = float(m.group(1))

    m = re.search(r"([\d.]+)\s*de\s*[áa]rea\s*privativa", desc, re.I)
    if m:
        result["areaUtil"] = float(m.group(1))

    m = re.search(r"([\d.]+)\s*de\s*[áa]rea\s*do\s*terreno", desc, re.I)
    if m:
        result["areaTerreno"] = float(m.group(1))

    m = re.search(r"(\d+)\s*quarto", desc, re.I)
    if m:
        result["quartos"] = int(m.group(1))

    m = re.search(r"(\d+)\s*vaga", desc, re.I)
    if m:
        result["vagas"] = int(m.group(1))

    m = re.search(r"(\d+)\s*su[íi]te", desc, re.I)
    if m:
        result["suites"] = int(m.group(1))

    return result


def _csv_to_docs(csv_bytes: bytes) -> list[dict]:
    """Converte os bytes do CSV da Caixa em lista de dicts normalizados."""
    text = csv_bytes.decode("latin-1")
    lines = text.splitlines()

    # Localiza o cabeçalho (linha com 'imóvel' ou 'imovel')
    header_idx = None
    for i, line in enumerate(lines):
        if ("imóvel" in line.lower() or "imovel" in line.lower()) and ";" in line:
            header_idx = i
            break

    if header_idx is None:
        return []

    data_text = "\n".join(lines[header_idx:])
    reader = csv.DictReader(io.StringIO(data_text), delimiter=";")

    docs = []
    for row in reader:
        # Normaliza as chaves (remove espaços e caracteres especiais)
        row = {k.strip(): v.strip() for k, v in row.items() if k}

        hdn = row.get("N° do imóvel", "").strip()
        if not hdn:
            continue

        url_detalhe = row.get("Link de acesso", "").strip()
        # O CSV às vezes trunca a URL — reconstrói a partir do hdnImovel
        if hdn and (not url_detalhe or len(url_detalhe) < 60):
            url_detalhe = f"{DET_URL}?hdnimovel={hdn}"

        desc_fields = _parse_descricao(row.get("Descrição", ""))

        doc = {
            "hdnImovel":    hdn,
            "estado":       row.get("UF", "").strip(),
            "cidade":       row.get("Cidade", "").strip().upper(),
            "bairro":       row.get("Bairro", "").strip().upper(),
            "endereco":     row.get("Endereço", "").strip(),
            "preco":        _br_float(row.get("Preço")),
            "precoAval":    _br_float(row.get("Valor de avaliação")),
            "desconto":     _br_float(row.get("Desconto")),
            "financiamento": row.get("Financiamento", "").strip(),
            "modalidade":   row.get("Modalidade de venda", "").strip(),
            "urlDetalhe":   url_detalhe,
            "fotoUrl":      f"{BASE_URL}/fotos/F{hdn}21.jpg",
            "ativo":        True,
            **desc_fields,
        }
        docs.append(doc)

    return docs


class CaixaScraper:
    def __init__(self, headless: bool = True, debug: bool = False):
        self.headless = headless
        self.debug    = debug
        self._pw      = sync_playwright().start()
        self.browser  = self._pw.chromium.launch(
            headless=headless,
            args=["--disable-blink-features=AutomationControlled"],
        )
        self.context  = self.browser.new_context(
            viewport={"width": 1366, "height": 768},
            locale="pt-BR",
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            accept_downloads=True,
        )
        self.page = self.context.new_page()

    # ── Download CSV ──────────────────────────────────────────────────────────

    def download_csv(self, estado: str = "geral") -> Optional[bytes]:
        """
        Baixa o CSV de imóveis para um estado ou para todo o Brasil (estado='geral').
        Retorna os bytes do arquivo ou None em caso de falha.
        """
        try:
            self.page.goto(DL_URL, wait_until="domcontentloaded", timeout=30_000)
            time.sleep(1)

            # Seleciona o estado no dropdown
            self.page.select_option("select#cmb_estado", value=estado)
            time.sleep(0.5)

            # Clica em "Próximo" e captura o download
            with self.page.expect_download(timeout=120_000) as dl_info:
                self.page.locator("#btn_next1").click()

            download = dl_info.value
            path = download.path()
            with open(path, "rb") as f:
                data = f.read()

            self._log(f"  CSV {estado}: {len(data):,} bytes ({download.suggested_filename})")
            return data

        except Exception as e:
            print(f"  [ERRO] download_csv({estado}): {e}")
            return None

    # ── Enriquecimento com detalhes da página ────────────────────────────────

    # Frases que indicam que o imóvel foi removido/vendido na Caixa
    _FRASES_INATIVO = [
        "imóvel não encontrado",
        "não foi possível localizar",
        "registro não encontrado",
        "imóvel indisponível",
        "imóvel removido",
        "imovel nao encontrado",
    ]

    def get_detalhes_imovel(self, hdn: str) -> dict:
        """
        Visita a página de detalhe do imóvel e extrai campos extras:
        CEP, leiloeiro, edital, editaiUrl, matriculaUrl,
        ocupacao, fgts, dataLeilao1, dataLeilao2, suites.

        Retorna {"_inativo": True} se o imóvel não está mais disponível na Caixa.
        Retorna dict com os campos encontrados (pode ser vazio) nos demais casos.
        """
        url = f"{DET_URL}?hdnimovel={hdn}"
        extras: dict = {}
        try:
            self.page.goto(url, wait_until="domcontentloaded", timeout=25_000)
            time.sleep(1)

            # Redirecionamento = imóvel não existe mais na Caixa
            if "detalhe-imovel.asp" not in self.page.url:
                return {"_inativo": True}

            text = self.page.inner_text("body")
            html = self.page.content()

            # Texto de erro na página = imóvel removido/vendido
            texto_lower = text.lower()
            if any(frase in texto_lower for frase in self._FRASES_INATIVO):
                return {"_inativo": True}

            # CEP
            m = re.search(r"CEP[:\s]*([\d]{5}-[\d]{3})", text)
            if m:
                extras["cep"] = m.group(1)

            # Leiloeiro
            m = re.search(r"Leiloeiro\(a\):\s*(.+)", text)
            if m:
                extras["leiloeiro"] = m.group(1).strip()

            # Número do edital
            m = re.search(r"Edital:\s*([^\n]+)", text)
            if m:
                val = m.group(1).strip()
                if val:
                    extras["edital"] = val

            # URL do edital PDF (via onclick)
            m = re.search(r"ExibeDoc\(['\"]([^'\"]*(?:edital|EL)[^'\"]*\.PDF)['\"]", html, re.I)
            if m:
                path = m.group(1)
                extras["editaiUrl"] = f"{BASE_URL}{path}" if path.startswith("/") else path

            # URL da matrícula PDF (via onclick)
            m = re.search(r"ExibeDoc\(['\"]([^'\"]*matricula[^'\"]*\.pdf)['\"]", html, re.I)
            if m:
                path = m.group(1)
                extras["matriculaUrl"] = f"{BASE_URL}{path}" if path.startswith("/") else path

            # Ocupação
            m = re.search(r"\b(Desocupado|Ocupado)\b", text, re.I)
            if m:
                extras["ocupacao"] = m.group(1).capitalize()
            else:
                # fallback: procura no HTML bruto (campo pode estar em input hidden)
                m = re.search(r"\b(Desocupado|Ocupado)\b", html, re.I)
                if m:
                    extras["ocupacao"] = m.group(1).capitalize()

            # FGTS
            if re.search(r"Permite utiliza[çc][aã]o de FGTS", text, re.I):
                extras["fgts"] = True

            # Datas do leilão — Leilão SFI
            m = re.search(r"Data do 1[°º]\s*Leil[ãa]o[^\d]*([\d]{2}/[\d]{2}/[\d]{4})", text)
            if m:
                extras["dataLeilao1"] = m.group(1)
                extras["dataLeilao1Date"] = _parse_date_br(m.group(1))

            m = re.search(r"Data do 2[°º]\s*Leil[ãa]o[^\d]*([\d]{2}/[\d]{2}/[\d]{4})", text)
            if m:
                extras["dataLeilao2"] = m.group(1)
                extras["dataLeilao2Date"] = _parse_date_br(m.group(1))

            # Data da Licitação Aberta
            m = re.search(r"Data da Licita[çc][ãa]o Aberta\s*[-–]\s*([\d]{2}/[\d]{2}/[\d]{4})", text)
            if m:
                extras["dataLeilao1"] = m.group(1)
                extras["dataLeilao1Date"] = _parse_date_br(m.group(1))

            # Suítes (da descrição detalhada na página)
            m = re.search(r"(\d+)\s*su[íi]te", text, re.I)
            if m:
                extras["suites"] = int(m.group(1))

        except Exception as e:
            self._log(f"  [WARN] get_detalhes_imovel({hdn}): {e}")

        return extras

    def get_foto_url(self, url_detalhe: str) -> Optional[str]:
        """Busca a URL da foto principal na página de detalhe do imóvel."""
        if not url_detalhe:
            return None
        try:
            resp = self.context.request.get(url_detalhe, timeout=20_000)
            soup = BeautifulSoup(resp.text(), "html.parser")
            for img in soup.find_all("img"):
                src = str(img.get("src", ""))
                if any(k in src.lower() for k in ("foto", "fotos", "imagem", "imovel")):
                    if not src.startswith("http"):
                        src = f"{BASE_URL}/{src.lstrip('/')}"
                    return src
        except Exception:
            pass
        return None

    # ── Scrape completo de um estado ─────────────────────────────────────────

    def scrape_estado(self, estado: str, com_fotos: bool = False) -> list[dict]:
        """
        Baixa e parseia todos os imóveis de um estado.
        com_fotos=True visita cada página de detalhe para obter a URL da foto (lento).
        """
        csv_bytes = self.download_csv(estado)
        if not csv_bytes:
            return []

        docs = _csv_to_docs(csv_bytes)
        print(f"  {estado}: {len(docs)} imóveis no CSV")

        if com_fotos and docs:
            print(f"  {estado}: buscando fotos ({len(docs)} requisições)...")
            for i, doc in enumerate(docs):
                foto = self.get_foto_url(doc.get("urlDetalhe", ""))
                if foto:
                    doc["fotoUrl"] = foto
                if (i + 1) % 100 == 0:
                    print(f"    {i+1}/{len(docs)} fotos processadas...")
                time.sleep(0.3)

        return docs

    # ── Scrape todos os estados ───────────────────────────────────────────────

    def scrape_brasil(self, com_fotos: bool = False) -> list[dict]:
        """
        Baixa o CSV 'geral' (Brasil todo) de uma só vez.
        Muito mais rápido que estado por estado.
        """
        print("  Baixando base completa (Brasil todo)...")
        csv_bytes = self.download_csv("geral")
        if not csv_bytes:
            return []

        docs = _csv_to_docs(csv_bytes)
        print(f"  Brasil: {len(docs):,} imóveis no CSV")
        return docs

    # ── Utilitários ───────────────────────────────────────────────────────────

    def _log(self, msg: str):
        if self.debug:
            print(msg)

    def close(self):
        try:
            self.browser.close()
            self._pw.stop()
        except Exception:
            pass
