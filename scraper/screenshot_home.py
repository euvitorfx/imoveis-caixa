"""
Captura screenshots da home do site e salva como PNG na pasta Downloads.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

DESTINO = Path.home() / "Downloads"
URL = "https://www.buscaleiloescaixa.com.br"

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1280, "height": 800})

    print(f"Abrindo {URL} ...")
    page.goto(URL, wait_until="networkidle", timeout=30000)

    # Fecha popup se existir
    try:
        page.locator("button:has-text('×'), button[aria-label='Fechar'], button:has-text('Fechar')").first.click(timeout=3000)
    except Exception:
        pass

    # 1. Slide 1 (visível no carregamento)
    page.wait_for_timeout(1500)
    page.screenshot(path=str(DESTINO / "home_slide1.png"))
    print("  ✓ home_slide1.png")

    # 2. Slide 2 — clica na seta »
    try:
        page.locator("button[aria-label='Próximo slide']").click()
        page.wait_for_timeout(1000)
        page.screenshot(path=str(DESTINO / "home_slide2.png"))
        print("  ✓ home_slide2.png")
    except Exception as e:
        print(f"  ! slide2: {e}")

    # 3. Página completa (full-page)
    page.goto(URL, wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(1500)
    try:
        page.locator("button:has-text('×'), button[aria-label='Fechar']").first.click(timeout=2000)
    except Exception:
        pass
    page.screenshot(path=str(DESTINO / "home_full.png"), full_page=True)
    print("  ✓ home_full.png  (página inteira)")

    browser.close()

print(f"\nArquivos salvos em: {DESTINO}")
