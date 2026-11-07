#!/usr/bin/env python3
"""
Atualiza data.json com valores públicos do Status Invest.
O parser é intencionalmente conservador: se não localizar preço e último
rendimento de forma inequívoca, falha sem substituir os dados anteriores.
"""
import json
import re
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
DATA_FILE = ROOT / "data.json"
URL = "https://statusinvest.com.br/fundos-imobiliarios/mxrf11"

def br_number(value):
    return float(value.replace(".", "").replace(",", "."))

def find_value(patterns, text):
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE | re.DOTALL)
        if match:
            return br_number(match.group(1))
    return None

def yahoo():
    u = "https://query1.finance.yahoo.com/v8/finance/chart/MXRF11.SA?range=1y&interval=1d&events=div"
    with urlopen(Request(u, headers={"User-Agent": "Mozilla/5.0"}), timeout=25) as r:
        res = json.loads(r.read())["chart"]["result"][0]
    divs = sorted(res.get("events", {}).get("dividends", {}).values(), key=lambda d: d["date"], reverse=True)
    return float(res["meta"]["regularMarketPrice"]), float(divs[0]["amount"])

def yahoo_avg12():
    import time
    u = "https://query1.finance.yahoo.com/v8/finance/chart/MXRF11.SA?range=1y&interval=1d&events=div"
    with urlopen(Request(u, headers={"User-Agent": "Mozilla/5.0"}), timeout=25) as r:
        res = json.loads(r.read())["chart"]["result"][0]
    vals = [d["amount"] for d in res.get("events", {}).get("dividends", {}).values() if d["date"] > time.time() - 366 * 86400]
    return sum(vals) / len(vals) if len(vals) >= 6 else None

def valid(price, dividend):
    return bool(price and dividend and 3 < price < 30 and 0.01 < dividend < 1)

def main():
    req = Request(URL, headers={
        "User-Agent": "Mozilla/5.0 (compatible; MXRF11-Magico/1.0; educational dashboard)",
        "Accept-Language": "pt-BR,pt;q=0.9"
    })
    with urlopen(req, timeout=25) as response:
        html = response.read().decode("utf-8", errors="replace")
    text = re.sub(r"<[^>]+>", " ", html)
    text = re.sub(r"\s+", " ", text)

    price = find_value([
        r"Valor atual\s*R\$\s*([0-9.,]+)",
        r"Cotação do MXRF11\s*R\$\s*([0-9.,]+)",
        r"Preço atual\s*R\$\s*([0-9.,]+)"
    ], text)

    # Captura o último rendimento pago, não o próximo/provisionado.
    dividend = find_value([
        r"Último rendimento\s*R\$\s*([0-9.,]+)",
        r"último rendimento do MXRF11 foi de\s*R\$\s*([0-9.,]+)"
    ], text)

    source, url = "Status Invest", URL
    if not valid(price, dividend):
        try:
            price, dividend = yahoo()
            source, url = "Yahoo Finance (MXRF11.SA)", "https://finance.yahoo.com/quote/MXRF11.SA"
        except Exception:
            price = dividend = None
    if not valid(price, dividend):
        raise RuntimeError(
            "Não foi possível identificar preço e último rendimento com segurança. "
            "data.json foi preservado; revise o parser ou atualize manualmente."
        )

    try:
        avg12 = yahoo_avg12()
    except Exception:
        avg12 = None
    if avg12 is not None and not (0.01 < avg12 < 1):
        avg12 = None

    br_tz = timezone(timedelta(hours=-3))
    updated = datetime.now(br_tz).isoformat(timespec="seconds")
    data = {
        "ticker": "MXRF11",
        "price": round(price, 2),
        "dividend": round(dividend, 4),
        "dividend12m": round(avg12, 4) if avg12 else None,
        "updatedAt": updated,
        "source": source,
        "priceSource": url,
        "dividendSource": url,
        "note": "Último rendimento identificado na página consultada. Verifique comunicados oficiais."
    }
    DATA_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(data, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERRO: {exc}", file=sys.stderr)
        sys.exit(1)
