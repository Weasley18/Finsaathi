"""Behavioural tests for the ML service.

Each test builds ~6 months of realistic history ending today, so the suite is
independent of the calendar date it runs on.

Run:  pip install -r requirements-dev.txt && pytest
"""
import random
from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)
TODAY = date.today()


def steady_history(months_back: int = 6, seed: int = 7, include_income: bool = True):
    """Salary 25k on the 1st, rent 8k on the 5th, small regular food/grocery/transport spends."""
    rng = random.Random(seed)
    start = (TODAY.replace(day=1) - timedelta(days=months_back * 30)).replace(day=1)
    txns, d = [], start
    while d <= TODAY:
        if d.day == 1 and include_income:
            txns.append({"amount": 25000, "category": "Salary", "date": d.isoformat(), "merchant": "ACME PVT LTD", "type": "INCOME"})
        if d.day == 5:
            txns.append({"amount": 8000, "category": "Rent", "date": d.isoformat(), "merchant": "Landlord", "type": "EXPENSE"})
        if d.toordinal() % 2 == 0:
            txns.append({"amount": rng.randint(100, 220), "category": "Food", "date": d.isoformat(), "merchant": "Swiggy", "type": "EXPENSE"})
        if d.weekday() == 6:
            txns.append({"amount": rng.randint(700, 900), "category": "Groceries", "date": d.isoformat(), "merchant": "BigBasket", "type": "EXPENSE"})
        if d.toordinal() % 3 == 0:
            txns.append({"amount": rng.randint(40, 90), "category": "Transport", "date": d.isoformat(), "merchant": "Rapido", "type": "EXPENSE"})
        d += timedelta(days=1)
    return txns


def typical_month_total(txns):
    """Average expense total over complete past months."""
    totals = {}
    for t in txns:
        if t["type"] != "EXPENSE":
            continue
        key = t["date"][:7]
        if key == TODAY.isoformat()[:7]:
            continue
        totals[key] = totals.get(key, 0) + t["amount"]
    return sum(totals.values()) / len(totals)


def test_health():
    assert client.get("/health").json()["status"] == "ok"


def test_income_is_never_reported_as_an_expense_anomaly():
    res = client.post("/anomalies", json={"transactions": steady_history()}).json()
    flagged = [a["category"] for a in res["anomalies"]] + [t["category"] for t in res["largeTransactions"]]
    assert "Salary" not in flagged


def test_steady_spending_has_no_anomalies_and_rent_is_not_flagged():
    res = client.post("/anomalies", json={"transactions": steady_history()}).json()
    assert res["anomalies"] == []
    assert res["largeTransactions"] == []


def test_genuine_one_off_large_expense_is_flagged():
    txns = steady_history()
    txns.append({"amount": 32000, "category": "Electronics", "date": (TODAY - timedelta(days=1)).isoformat(), "merchant": "Croma", "type": "EXPENSE"})
    res = client.post("/anomalies", json={"transactions": txns}).json()
    assert any(t["amount"] == 32000 and t["category"] == "Electronics" for t in res["largeTransactions"])


def test_category_spike_this_month_is_flagged():
    txns = steady_history()
    for i in range(3):
        txns.append({"amount": 2500 + i, "category": "Food", "date": TODAY.isoformat(), "merchant": f"Party caterer {i}", "type": "EXPENSE"})
    res = client.post("/anomalies", json={"transactions": txns}).json()
    assert any(a["category"] == "Food" for a in res["anomalies"])


def test_forecast_for_steady_spender_is_close_to_a_normal_month():
    txns = steady_history()
    res = client.post("/forecast", json={"transactions": txns}).json()
    expected = typical_month_total(txns)
    projected = res["projection"]["projected"]
    assert abs(projected - expected) / expected < 0.15, (projected, expected)
    assert abs(res["historicalAvg"] - expected) / expected < 0.01
    assert res["projection"]["low"] <= projected <= res["projection"]["high"]
    # the band must be useful, not "anything from 0 to 10x"
    assert res["projection"]["high"] < projected * 1.5


def test_forecast_ignores_income_rows():
    with_income = client.post("/forecast", json={"transactions": steady_history(include_income=True)}).json()
    without_income = client.post("/forecast", json={"transactions": steady_history(include_income=False)}).json()
    assert with_income["projection"]["projected"] == without_income["projection"]["projected"]
    assert with_income["historicalAvg"] == without_income["historicalAvg"]


def test_forecast_never_projects_less_than_already_spent():
    res = client.post("/forecast", json={"transactions": steady_history()}).json()
    assert res["projection"]["low"] >= res["currentMonth"]["totalSpentSoFar"]
    assert res["projection"]["projected"] >= res["currentMonth"]["totalSpentSoFar"]


def test_budget_alert_fires_only_for_categories_that_will_overshoot():
    txns = steady_history()
    res = client.post("/forecast", json={
        "transactions": txns,
        "budgets": [{"category": "Food", "limit": 500}, {"category": "Groceries", "limit": 50000}],
    }).json()
    alerted = {a["category"] for a in res["budgetAlerts"]}
    assert "Food" in alerted and "Groceries" not in alerted


def test_too_little_data_returns_empty_forecast():
    res = client.post("/forecast", json={"transactions": steady_history()[:5]}).json()
    assert res["projection"] is None


def test_adaptive_budget_counts_unspent_income_as_savings():
    res = client.post("/adaptive-budget", json={
        "incomeRange": "FROM_25K_TO_50K",
        "monthlyIncome": 30000,
        "currentSpending": {"Rent": 8000, "Groceries": 3000, "Food": 2000},
    }).json()
    assert res["actual"]["savings"]["amount"] == 17000
    assert not any("less than recommended" in tip for tip in res["insights"])


def test_adaptive_budget_warns_when_overspending():
    res = client.post("/adaptive-budget", json={
        "incomeRange": "FROM_25K_TO_50K",
        "monthlyIncome": 30000,
        "currentSpending": {"Rent": 15000, "Shopping": 12000, "Food": 3000},
    }).json()
    assert res["actual"]["savings"]["amount"] == 0
    assert any("less than recommended" in tip for tip in res["insights"])


def test_category_insights_only_cover_expenses():
    res = client.post("/category-insights", json={"transactions": steady_history()}).json()
    assert "Salary" not in {c["category"] for c in res["categoryPatterns"]}
    assert "ACME PVT LTD" not in {m["merchant"] for m in res["merchantInsights"]}
