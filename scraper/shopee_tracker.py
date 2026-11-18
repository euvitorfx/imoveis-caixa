"""
Shopee 3D Print Product Tracker
--------------------------------
Coleta produtos de impressão 3D mais vendidos na Shopee Brasil
usando o perfil real do Chrome do usuário (com cookies de sessão).

Uso:
    python -m scraper.shopee_tracker                  # scan completo
    python -m scraper.shopee_tracker --terms "vaso 3d" "suporte 3d"
    python -m scraper.shopee_tracker --top 50
"""

import csv
import json
import re
import time
import random
from datetime import datetime
from pathlib import Path
from typing import Optional

OUTPUT_DIR = Path(__file__).parent / "shopee_data"

SEARCH_TERMS = [
    "impressão 3d",
    "impresso 3d",
    "suporte 3d",
    "organizador 3d",
    "decoração 3d",
    "vaso 3d",
    "luminária 3d",
    "porta caneta 3d",
    "cachepot 3d",
    "miniatura 3d",
    "action figure 3d",
    "porta chaves 3d",
    "kit banheiro 3d",
    "porta controle 3d",
    "porta tempero 3d",
]


def _find_chrome_user_data() -> str:
    """Encontra o diretório de dados do Chrome no Windows."""
    import os
    local = os.environ.get("LOCALAPPDATA", "")
    path = Path(local) / "Google" / "Chrome" / "User Data"
    if path.exists():
        return str(path)
    # Edge como fallback
    edge = Path(local) / "Microsoft" / "Edge" / "User Data"
    if edge.exists():
        return str(edge)
    raise FileNotFoundError(
        "Chrome/Edge user data não encontrado. "
        "Instale o Chrome ou passe --chrome-path manualmente."
    )


def _intercept_api_responses(page, results: list):
    """Intercepta respostas da API da Shopee no browser."""
    def handle_response(response):
        url = response.url
        if "search_items" in url or "search/search_items" in url:
            try:
                data = response.json()
                items = data.get("items") or data.get("item") or []
                for item in items:
                    info = item.get("item_basic", item)
                    results.append({
                        "source": "shopee",
                        "item_id": str(info.get("itemid", "")),
                        "name": info.get("name", ""),
                        "price": info.get("price", 0) / 100_000,
                        "price_min": info.get("price_min", 0) / 100_000,
                        "price_max": info.get("price_max", 0) / 100_000,
                        "sold": info.get("sold", 0),
                        "historical_sold": info.get("historical_sold", 0),
                        "stock": info.get("stock", 0),
                        "rating": round(
                            info.get("item_rating", {}).get("rating_star", 0), 2
                        ),
                        "shop_location": info.get("shop_location", ""),
                        "image": (
                            f"https://down-br.img.susercontent.com/"
                            f"file/{info.get('image', '')}"
                        ),
                        "url": (
                            f"https://shopee.com.br/product/"
                            f"{info.get('shopid')}/{info.get('itemid')}"
                        ),
                        "scraped_at": datetime.now().isoformat(),
                    })
            except Exception:
                pass

    page.on("response", handle_response)


def _parse_sold(text: str) -> int:
    text = text.lower().strip()
    mult = 1000 if "mil" in text else 1
    nums = re.findall(r"[\d.,]+", text)
    if nums:
        n = nums[0].replace(".", "").replace(",", ".")
        try:
            return int(float(n) * mult)
        except ValueError:
            pass
    return 0


def _fallback_parse_page(page, keyword: str) -> list[dict]:
    """Parse visual da página se a interceptação de API falhar."""
    products = []
    try:
        page.wait_for_load_state("networkidle", timeout=10_000)
    except Exception:
        pass

    try:
        body = page.inner_text("body")
        lines = [l.strip() for l in body.split("\n") if l.strip()]

        i = 0
        while i < len(lines):
            if re.search(r"\d+[\s.]*(mil\s+)?vendido", lines[i], re.IGNORECASE):
                sold = _parse_sold(lines[i])
                name = ""
                price = 0.0
                for j in range(max(0, i - 5), i):
                    if len(lines[j]) > 10 and not re.match(r"^R?\$", lines[j]):
                        name = lines[j]
                    if re.match(r"R?\$\s*[\d.,]+", lines[j]):
                        price_text = re.sub(r"[R$\s.]", "", lines[j]).replace(",", ".")
                        nums = re.findall(r"\d+\.?\d*", price_text)
                        if nums:
                            price = float(nums[0])

                if name and len(name) > 5:
                    products.append({
                        "source": "shopee",
                        "item_id": "",
                        "name": name,
                        "price": price,
                        "price_min": price,
                        "price_max": price,
                        "sold": sold,
                        "historical_sold": sold,
                        "stock": 0,
                        "rating": 0.0,
                        "shop_location": "",
                        "image": "",
                        "url": "",
                        "keyword": keyword,
                        "scraped_at": datetime.now().isoformat(),
                    })
            i += 1
    except Exception:
        pass

    return products


def search_shopee(keyword: str, pages: int = 2,
                  browser_context=None) -> list[dict]:
    """Busca produtos na Shopee usando o browser com sessão do usuário."""
    all_products = []

    for pg in range(pages):
        api_results = []
        page = browser_context.new_page()
        _intercept_api_responses(page, api_results)

        url = (f"https://shopee.com.br/search?"
               f"keyword={keyword}&order=sold&page={pg}")
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=30_000)
            time.sleep(random.uniform(4, 6))

            # Scroll para trigger lazy loading
            for _ in range(5):
                page.mouse.wheel(0, 600)
                time.sleep(0.8)

            time.sleep(2)

            if api_results:
                for r in api_results:
                    r["keyword"] = keyword
                all_products.extend(api_results)
                print(f"  Página {pg+1}: {len(api_results)} (via API)")
            else:
                fallback = _fallback_parse_page(page, keyword)
                all_products.extend(fallback)
                print(f"  Página {pg+1}: {len(fallback)} (via parse)")

        except Exception as e:
            print(f"  [ERRO] Página {pg+1}: {e}")
        finally:
            page.close()

        time.sleep(random.uniform(2, 4))

    return all_products


def run_full_scan(terms: Optional[list[str]] = None,
                  pages_per_term: int = 2,
                  chrome_path: Optional[str] = None) -> list[dict]:
    """
    Scan completo da Shopee usando Chromium com perfil temporário.
    Não precisa fechar o Chrome.
    """
    from playwright.sync_api import sync_playwright
    import tempfile, shutil

    terms = terms or SEARCH_TERMS
    all_results = []
    temp_dir = tempfile.mkdtemp(prefix="shopee_tracker_")

    print(f"Iniciando scan — {len(terms)} termos, {pages_per_term} páginas")
    print("=" * 60)

    with sync_playwright() as p:
        context = p.chromium.launch_persistent_context(
            user_data_dir=temp_dir,
            headless=True,
            viewport={"width": 1366, "height": 768},
            locale="pt-BR",
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/125.0.0.0 Safari/537.36"
            ),
            args=[
                "--disable-blink-features=AutomationControlled",
                "--disable-dev-shm-usage",
            ],
        )

        for term in terms:
            print(f"\nBuscando: '{term}'")
            products = search_shopee(
                term, pages=pages_per_term, browser_context=context
            )
            all_results.extend(products)

        context.close()
        shutil.rmtree(temp_dir, ignore_errors=True)

    # Deduplica
    seen = {}
    for p in all_results:
        key = p.get("item_id") or p["name"]
        sold = p.get("historical_sold") or p.get("sold") or 0
        if key not in seen or sold > (
            seen[key].get("historical_sold") or seen[key].get("sold") or 0
        ):
            seen[key] = p
    unique = sorted(
        seen.values(),
        key=lambda x: x.get("historical_sold") or x.get("sold") or 0,
        reverse=True,
    )

    print(f"\n{'='*60}")
    print(f"Total coletado: {len(all_results)} | Únicos: {len(unique)}")
    return unique


def save_results(products: list[dict], tag: str = "") -> tuple[Path, Path]:
    OUTPUT_DIR.mkdir(exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    prefix = f"shopee_3d_{tag + '_' if tag else ''}{ts}"

    csv_path = OUTPUT_DIR / f"{prefix}.csv"
    json_path = OUTPUT_DIR / f"{prefix}.json"

    if products:
        fieldnames = list(products[0].keys())
        with open(csv_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(products)

        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(products, f, ensure_ascii=False, indent=2)

        print(f"\nSalvo em:\n  CSV:  {csv_path}\n  JSON: {json_path}")
    else:
        print("\nNenhum produto para salvar.")

    return csv_path, json_path


def print_top_products(products: list[dict], top_n: int = 30):
    print(f"\n{'='*80}")
    print(f"TOP {top_n} PRODUTOS 3D MAIS VENDIDOS — SHOPEE BRASIL")
    print(f"{'='*80}")
    print(f"{'#':>3} {'Vendidos':>9} {'Preço':>10} {'Nota':>5} {'Nome':<50}")
    print(f"{'-'*80}")

    for i, p in enumerate(products[:top_n], 1):
        name = p["name"][:48].encode("ascii", "replace").decode("ascii")
        sold = p.get("historical_sold") or p.get("sold") or 0
        rating = p.get("rating") or 0
        print(f"{i:>3} {sold:>9,} "
              f"R${p['price']:>8.2f} "
              f"{rating:>5.1f} "
              f"{name}")


def analyze_trends(products: list[dict]) -> dict:
    if not products:
        return {}

    total = len(products)
    prices = [p["price"] for p in products if p["price"] > 0]
    avg_price = sum(prices) / len(prices) if prices else 0
    avg_sold = sum(
        (p.get("historical_sold") or p.get("sold") or 0) for p in products
    ) / total

    keyword_sales = {}
    for p in products:
        kw = p.get("keyword", "")
        if not kw:
            continue
        if kw not in keyword_sales:
            keyword_sales[kw] = {"count": 0, "total_sold": 0}
        keyword_sales[kw]["count"] += 1
        keyword_sales[kw]["total_sold"] += (
            p.get("historical_sold") or p.get("sold") or 0
        )

    top_keywords = sorted(
        keyword_sales.items(), key=lambda x: x[1]["total_sold"], reverse=True
    )

    price_ranges = {"0-25": 0, "25-50": 0, "50-100": 0, "100-200": 0, "200+": 0}
    for p in products:
        pr = p["price"]
        if pr < 25:
            price_ranges["0-25"] += 1
        elif pr < 50:
            price_ranges["25-50"] += 1
        elif pr < 100:
            price_ranges["50-100"] += 1
        elif pr < 200:
            price_ranges["100-200"] += 1
        else:
            price_ranges["200+"] += 1

    location_counts = {}
    for p in products:
        loc = p.get("shop_location", "")
        if loc:
            location_counts[loc] = location_counts.get(loc, 0) + 1
    top_locations = sorted(location_counts.items(), key=lambda x: x[1],
                           reverse=True)[:10]

    analysis = {
        "total_products": total,
        "avg_price": round(avg_price, 2),
        "avg_sold": round(avg_sold, 0),
        "price_distribution": price_ranges,
        "top_keywords": [{"keyword": kw, **s} for kw, s in top_keywords[:10]],
        "top_locations": [{"location": l, "count": c} for l, c in top_locations],
        "generated_at": datetime.now().isoformat(),
    }

    print(f"\n{'='*60}")
    print("ANÁLISE DE TENDÊNCIAS — IMPRESSÃO 3D NA SHOPEE")
    print(f"{'='*60}")
    print(f"Produtos únicos: {total}")
    print(f"Preço médio: R$ {avg_price:.2f}")
    print(f"Média de vendas: {avg_sold:,.0f}")
    print(f"\nDistribuição de preço:")
    for faixa, count in price_ranges.items():
        bar = "#" * int(count / max(total, 1) * 40)
        print(f"  R$ {faixa:>7}: {count:>4} ({count/max(total,1)*100:.0f}%) {bar}")
    print(f"\nKeywords com mais vendas:")
    for item in analysis["top_keywords"][:5]:
        print(f"  '{item['keyword']}': {item['total_sold']:,} vendas "
              f"em {item['count']} produtos")
    if top_locations:
        print(f"\nLocalizações dos sellers:")
        for item in analysis["top_locations"][:5]:
            print(f"  {item['location']}: {item['count']} anúncios")

    return analysis


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Shopee 3D Product Tracker")
    parser.add_argument("--terms", nargs="+", help="Termos de busca")
    parser.add_argument("--pages", type=int, default=2, help="Páginas por termo")
    parser.add_argument("--top", type=int, default=30, help="Qtd no ranking")
    parser.add_argument("--chrome-path", help="Caminho do Chrome User Data")
    args = parser.parse_args()

    products = run_full_scan(
        terms=args.terms,
        pages_per_term=args.pages,
        chrome_path=args.chrome_path,
    )
    print_top_products(products, top_n=args.top)
    analysis = analyze_trends(products)
    csv_path, json_path = save_results(products)

    if analysis:
        analysis_path = OUTPUT_DIR / f"analysis_{datetime.now():%Y%m%d_%H%M%S}.json"
        with open(analysis_path, "w", encoding="utf-8") as f:
            json.dump(analysis, f, ensure_ascii=False, indent=2)
        print(f"  Análise: {analysis_path}")
