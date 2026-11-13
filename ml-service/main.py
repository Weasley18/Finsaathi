"""
FinSaathi ML Microservice
=========================
FastAPI service providing:
- Isolation Forest anomaly detection
- Prophet time-series spending forecast
- Adaptive budgeting (50/30/20 or 60/20/20)

All spending analysis runs on EXPENSE transactions only (see expense_frame).
- Merchant-level category insights
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings('ignore')

app = FastAPI(title="FinSaathi ML Service", version="1.0.0")

# ─── Pydantic Models ──────────────────────────────────────────────

class TransactionItem(BaseModel):
    amount: float
    category: str
    date: str  # ISO date string
    merchant: Optional[str] = None
    type: Optional[str] = "EXPENSE"

class BudgetItem(BaseModel):
    category: str
    limit: float
    spent: float = 0

class AnomalyRequest(BaseModel):
    transactions: list[TransactionItem]

class ForecastRequest(BaseModel):
    transactions: list[TransactionItem]
    budgets: list[BudgetItem] = []

class AdaptiveBudgetRequest(BaseModel):
    incomeRange: str  # BELOW_10K, FROM_10K_TO_25K, etc.
    monthlyIncome: float
    currentSpending: dict[str, float]  # category -> amount

class CategoryInsightsRequest(BaseModel):
    transactions: list[TransactionItem]


# ─── Health Check ─────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "finsaathi-ml-service", "models": ["IsolationForest", "Prophet"]}


# ─── Shared helpers ───────────────────────────────────────────────

def expense_frame(transactions: list[TransactionItem]) -> pd.DataFrame:
    """Spending analysis must only ever see EXPENSE rows.

    Callers may send a mixed list (income + expense); salary credits must never
    be treated as spending, so everything that is not an expense is dropped here.
    """
    rows = [t.model_dump() for t in transactions if (t.type or "EXPENSE").upper() == "EXPENSE" and t.amount > 0]
    df = pd.DataFrame(rows, columns=["amount", "category", "date", "merchant", "type"])
    if df.empty:
        return df
    df["date"] = pd.to_datetime(df["date"]).dt.normalize()
    df["merchant"] = df["merchant"].fillna("")
    df["month"] = df["date"].dt.to_period("M")
    return df.sort_values("date").reset_index(drop=True)


def flag_recurring(df: pd.DataFrame) -> pd.Series:
    """Mark fixed monthly payments (rent, EMI, insurance, subscriptions ...).

    A payment is recurring when the same category+merchant is charged a similar
    amount (within 15% of the group median) in at least 3 different months, about
    once per month. These are expected, so they are neither anomalies nor part of
    the day-to-day spending rate that Prophet models.
    """
    recurring = pd.Series(False, index=df.index)
    for _, group in df.groupby(["category", "merchant"]):
        median = group["amount"].median()
        if median <= 0:
            continue
        similar = group[(group["amount"] - median).abs() <= 0.15 * median]
        months = similar["month"].nunique()
        if months >= 3 and len(similar) / months <= 1.25:
            recurring.loc[similar.index] = True
    return recurring


def month_bounds(now: datetime):
    start = datetime(now.year, now.month, 1)
    nxt = datetime(now.year + 1, 1, 1) if now.month == 12 else datetime(now.year, now.month + 1, 1)
    end = nxt - timedelta(days=1)
    return start, end


def pending_recurring(df: pd.DataFrame, now: datetime) -> list[dict]:
    """Recurring bills expected later this month that have not been paid yet."""
    start, _ = month_bounds(now)
    rec = df[df["recurring"]]
    pending = []
    for (category, merchant), group in rec.groupby(["category", "merchant"]):
        if (group["date"] >= pd.Timestamp(start)).any():
            continue  # already paid this month
        typical_day = int(group["date"].dt.day.median())
        if typical_day <= now.day:
            continue  # its usual date has passed — do not guess
        pending.append({
            "category": str(category),
            "merchant": str(merchant),
            "amount": float(group["amount"].median()),
            "day": typical_day,
        })
    return pending


# ─── 1. Anomaly Detection (Isolation Forest) ─────────────────────

@app.post("/anomalies")
def detect_anomalies(req: AnomalyRequest):
    df = expense_frame(req.transactions)
    if len(df) < 10:
        return {
            "anomalies": [],
            "largeTransactions": [],
            "model": "IsolationForest-v2",
            "message": "Not enough expense transactions for anomaly detection (need at least 10)"
        }

    try:
        from sklearn.ensemble import IsolationForest

        df["recurring"] = flag_recurring(df)
        current_period = pd.Timestamp(datetime.now()).to_period("M")

        # ── Category-level: is this month unusually high for the category? ──
        anomalies = []
        for cat, cat_df in df.groupby("category"):
            monthly = cat_df.groupby("month")["amount"].sum().sort_index()
            if current_period not in monthly.index:
                continue
            history = monthly[monthly.index < current_period]
            if len(history) < 3:
                continue  # need a real baseline of past months

            current_amount = float(monthly.loc[current_period])
            mean_val = float(history.mean())
            std_val = float(history.std(ddof=0))

            amounts = monthly.values.reshape(-1, 1)
            iso_forest = IsolationForest(contamination=0.1, random_state=42, n_estimators=100)
            preds = iso_forest.fit_predict(amounts)
            scores = iso_forest.decision_function(amounts)
            current_pred = preds[-1]
            current_score = scores[-1]

            # The model must flag it AND it must be materially above the baseline,
            # otherwise tiny datasets produce noise.
            z_score = round((current_amount - mean_val) / std_val, 2) if std_val > 0 else 0
            if current_pred == -1 and mean_val > 0 and current_amount > mean_val * 1.3 and current_amount - mean_val >= 200:
                multiplier = round(current_amount / mean_val, 1)
                severity = 'critical' if multiplier > 3 or z_score > 3 else 'warning'
                anomalies.append({
                    "category": str(cat),
                    "currentSpend": round(current_amount),
                    "averageSpend": round(mean_val),
                    "standardDeviation": round(std_val),
                    "multiplier": multiplier,
                    "zScore": z_score,
                    "isolationScore": round(float(current_score), 4),
                    "severity": severity,
                    "message": f"🚨 You spent {multiplier}x your usual {cat} budget this month (₹{round(current_amount):,} vs avg ₹{round(mean_val):,})!"
                        if severity == 'critical' else
                        f"⚠️ Your {cat} spending is higher than usual — ₹{round(current_amount):,} vs your average of ₹{round(mean_val):,}."
                })

        # ── Transaction-level: individually unusual expenses ──
        # Recurring bills (rent, EMI ...) are expected and never flagged. A
        # transaction must be an Isolation Forest outlier AND well above what is
        # normal for its own category (or overall, for rarely-used categories).
        large_txns = []
        candidates = df[~df["recurring"]]
        if len(candidates) > 5:
            iso_single = IsolationForest(contamination=0.05, random_state=42)
            single_preds = iso_single.fit_predict(candidates["amount"].values.reshape(-1, 1))
            overall_median = float(candidates["amount"].median())
            cat_stats = candidates.groupby("category")["amount"].agg(["median", "count"])

            for pred, row in zip(single_preds, candidates.itertuples()):
                if pred != -1 or row.amount <= 1000:
                    continue
                stats = cat_stats.loc[row.category]
                baseline = float(stats["median"]) if stats["count"] >= 3 else overall_median
                if row.amount > 2.5 * baseline:
                    large_txns.append({
                        "amount": row.amount,
                        "category": row.category,
                        "merchant": row.merchant or None,
                        "date": str(row.date.date()),
                        "message": f"💰 Unusually large expense: ₹{row.amount:,.0f} on {row.category}" +
                                   (f" at {row.merchant}" if row.merchant else "")
                    })
            large_txns.sort(key=lambda x: x["amount"], reverse=True)

        anomalies.sort(key=lambda x: x['multiplier'], reverse=True)

        return {
            "model": "IsolationForest-v2 (scikit-learn)",
            "anomalies": anomalies,
            "largeTransactions": large_txns[:10],
            "totalAnomalies": len(anomalies),
            "totalLargeTransactions": len(large_txns),
            "analysisWindow": "full expense history (recurring bills excluded from outlier checks)"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Anomaly detection failed: {str(e)}")


# ─── 2. Spending Forecast (Prophet) ──────────────────────────────
#
# Month-end projection =
#     what has actually been spent so far this month
#   + Prophet forecast of day-to-day (non-recurring) spending for the remaining days
#   + recurring bills that are still due this month
#
# Prophet is trained on a complete daily series: days with no spending are
# real zeros, not missing data.

def _variable_daily_series(df: pd.DataFrame, now: datetime) -> pd.DataFrame:
    var = df[~df["recurring"]]
    daily = var.groupby("date")["amount"].sum()
    full_index = pd.date_range(df["date"].min(), pd.Timestamp(now.date()), freq="D")
    daily = daily.reindex(full_index, fill_value=0.0)
    return pd.DataFrame({"ds": full_index, "y": daily.values})


def _prophet_remaining(daily: pd.DataFrame, now: datetime, end_of_month: datetime):
    """Returns {date: (yhat, lower, upper)} for each remaining day of the month."""
    from prophet import Prophet

    # Today's total is still incomplete, so it is left out of training
    train = daily[daily["ds"] < pd.Timestamp(now.date())]
    model = Prophet(
        daily_seasonality=False,
        weekly_seasonality=True,
        yearly_seasonality=False,
        changepoint_prior_scale=0.05,
        interval_width=0.85,
    )
    model.fit(train)
    future = pd.DataFrame({"ds": pd.date_range(pd.Timestamp(now.date()) + timedelta(days=1), pd.Timestamp(end_of_month.date()), freq="D")})
    if future.empty:
        return {}
    fc = model.predict(future)
    return {
        row["ds"].date(): (max(0.0, float(row["yhat"])), max(0.0, float(row["yhat_lower"])), max(0.0, float(row["yhat_upper"])))
        for _, row in fc.iterrows()
    }


def _baseline_remaining(daily: pd.DataFrame, now: datetime, end_of_month: datetime):
    """Fallback when Prophet is unavailable: average daily rate of the last 90 days."""
    history = daily[daily["ds"] < pd.Timestamp(now.date())].tail(90)
    rate = float(history["y"].mean()) if len(history) else 0.0
    days = pd.date_range(pd.Timestamp(now.date()) + timedelta(days=1), pd.Timestamp(end_of_month.date()), freq="D")
    return {d.date(): (rate, rate * 0.7, rate * 1.3) for d in days}


@app.post("/forecast")
def forecast_spending(req: ForecastRequest):
    df = expense_frame(req.transactions)
    if len(df) < 14:
        return {
            "model": "Prophet-v2",
            "message": "Not enough data for forecast (need at least 14 expense transactions)",
            "projection": None,
            "dailyForecast": [],
            "categoryForecasts": [],
            "budgetAlerts": []
        }

    try:
        now = datetime.now()
        start_of_month, end_of_month = month_bounds(now)
        days_in_month = end_of_month.day
        day_of_month = now.day
        days_remaining = days_in_month - day_of_month

        df["recurring"] = flag_recurring(df)
        daily_var = _variable_daily_series(df, now)
        pending = pending_recurring(df, now)

        # ── Remaining-days forecast of variable spending ──
        try:
            remaining = _prophet_remaining(daily_var, now, end_of_month)
            model_name = "Prophet-v2 (Meta time-series forecasting)"
            confidence = "85%"
        except Exception as prophet_err:  # Prophet / CmdStan missing or failed to fit
            print(f"[forecast] Prophet unavailable, using 90-day average: {prophet_err}")
            remaining = _baseline_remaining(daily_var, now, end_of_month)
            model_name = "Daily-average fallback (Prophet not available)"
            confidence = "65%"

        # ── Totals ──
        this_month = df[df["date"] >= pd.Timestamp(start_of_month)]
        total_spent = float(this_month["amount"].sum())
        actual_by_day = this_month.groupby("date")["amount"].sum()

        forecast_var = sum(v[0] for v in remaining.values())
        pending_total = sum(p["amount"] for p in pending)
        projected_total = round(total_spent + forecast_var + pending_total)

        # Day-level errors partly cancel out over the month, so the band on the
        # total combines daily half-widths in quadrature rather than adding them.
        half_width = float(np.sqrt(sum(((v[2] - v[1]) / 2) ** 2 for v in remaining.values())))
        projected_low = round(max(total_spent, projected_total - half_width))
        projected_high = round(projected_total + half_width)

        # ── Daily series for charts ──
        pending_by_day: dict[int, float] = {}
        for p in pending:
            pending_by_day[p["day"]] = pending_by_day.get(p["day"], 0.0) + p["amount"]

        daily_forecast = []
        for d in range(1, days_in_month + 1):
            day_date = datetime(now.year, now.month, d).date()
            if d <= day_of_month:
                amount = float(actual_by_day.get(pd.Timestamp(day_date), 0.0))
                yhat, lower, upper, is_actual = amount, amount, amount, True
            else:
                yhat, lower, upper = remaining.get(day_date, (0.0, 0.0, 0.0))
                bill = pending_by_day.get(d, 0.0)
                yhat, lower, upper = yhat + bill, lower + bill, upper + bill
                amount, is_actual = yhat, False
            daily_forecast.append({
                "date": str(day_date),
                "day": d,
                "amount": round(amount),
                "yhat": round(yhat),
                "yhat_lower": round(lower),
                "yhat_upper": round(upper),
                "isActual": is_actual
            })

        # ── Historical monthly average: complete past months only ──
        current_period = pd.Timestamp(now).to_period("M")
        monthly_totals = df[df["month"] < current_period].groupby("month")["amount"].sum()
        historical_avg = round(float(monthly_totals.mean())) if len(monthly_totals) > 0 else 0

        # ── Category projections ──
        # spent so far + the category's own daily rate (last 90 days of
        # non-recurring spend) for the remaining days + its pending bills.
        window_start = pd.Timestamp(now.date()) - timedelta(days=90)
        recent_var = df[(~df["recurring"]) & (df["date"] >= window_start) & (df["date"] < pd.Timestamp(now.date()))]
        window_days = max(1, (pd.Timestamp(now.date()) - max(window_start, df["date"].min())).days)
        cat_rate = (recent_var.groupby("category")["amount"].sum() / window_days).to_dict()
        cat_spent = this_month.groupby("category")["amount"].sum().to_dict()
        cat_pending: dict[str, float] = {}
        for p in pending:
            cat_pending[p["category"]] = cat_pending.get(p["category"], 0.0) + p["amount"]

        category_forecasts = []
        for cat in sorted(set(cat_rate) | set(cat_spent) | set(cat_pending)):
            spent = float(cat_spent.get(cat, 0.0))
            rate = float(cat_rate.get(cat, 0.0))
            proj = spent + rate * days_remaining + cat_pending.get(cat, 0.0)
            if proj < 1:
                continue
            category_forecasts.append({
                "category": str(cat),
                "spentSoFar": round(spent),
                "projectedTotal": round(proj),
                "dailyRate": round(rate)
            })
        category_forecasts.sort(key=lambda x: x['projectedTotal'], reverse=True)

        # ── Budget overflow alerts ──
        budget_alerts = []
        for b in req.budgets:
            cat_projected = next((c['projectedTotal'] for c in category_forecasts if c['category'] == b.category), 0)
            if b.limit > 0 and cat_projected > b.limit:
                budget_alerts.append({
                    "category": b.category,
                    "budgetLimit": b.limit,
                    "projectedSpend": cat_projected,
                    "willExceedBudget": True,
                    "projectedOverage": cat_projected - round(b.limit),
                    "confidence": confidence
                })

        vs_hist = f"{((projected_total - historical_avg) / historical_avg * 100):.1f}%" if historical_avg > 0 else "N/A"

        if historical_avg > 0 and projected_total > historical_avg * 1.2:
            insight = f"📈 You're on track to spend ₹{projected_total:,} this month — {((projected_total / historical_avg - 1) * 100):.0f}% more than your usual ₹{historical_avg:,}. Consider cutting back."
        elif historical_avg > 0 and projected_total < historical_avg * 0.8:
            insight = f"✨ Great job! You're on track to spend only ₹{projected_total:,} this month — less than your usual ₹{historical_avg:,}."
        elif historical_avg > 0:
            insight = f"📊 You're on track to spend ₹{projected_total:,} this month, similar to your average of ₹{historical_avg:,}."
        else:
            insight = f"📊 You're on track to spend ₹{projected_total:,} this month."

        return {
            "model": model_name,
            "currentMonth": {
                "totalSpentSoFar": round(total_spent),
                "dayOfMonth": day_of_month,
                "daysRemaining": days_remaining,
                "dailyAverage": round(total_spent / day_of_month) if day_of_month > 0 else 0
            },
            "projection": {
                "projected": projected_total,
                "low": projected_low,
                "high": projected_high,
                "confidence": confidence,
                "vsHistoricalAvg": vs_hist
            },
            "historicalAvg": historical_avg,
            "upcomingRecurring": [
                {"category": p["category"], "merchant": p["merchant"] or None, "amount": round(p["amount"]), "expectedDay": p["day"]}
                for p in pending
            ],
            "dailyForecast": daily_forecast,
            "categoryForecasts": category_forecasts,
            "budgetAlerts": budget_alerts,
            "insight": insight
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forecast failed: {str(e)}")


# ─── 3. Adaptive Budget Rule ─────────────────────────────────────

# Category names match backend/src/services/categorizer.ts (the single source of truth)
NEEDS_CATEGORIES = ['Rent', 'Groceries', 'Utilities', 'Transport', 'Health', 'Education', 'EMI', 'Insurance', 'Mobile Recharge', 'Fuel', 'Bill Payments']
WANTS_CATEGORIES = ['Food', 'Shopping', 'Entertainment', 'Clothing', 'Electronics', 'Subscription', 'Personal Care', 'Festival', 'Pooja', 'Gifts', 'Autorickshaw']
SAVINGS_CATEGORIES = ['Investment', 'Savings']

@app.post("/adaptive-budget")
def adaptive_budget(req: AdaptiveBudgetRequest):
    # Adaptive rule: 60/20/20 for low income (<15K), 50/30/20 otherwise
    is_low_income = req.incomeRange in ['BELOW_10K', 'FROM_10K_TO_25K'] or req.monthlyIncome < 15000

    if is_low_income:
        needs_pct, wants_pct, savings_pct = 60, 20, 20
        rule_name = "60/20/20 (Low-Income Adapted)"
    else:
        needs_pct, wants_pct, savings_pct = 50, 30, 20
        rule_name = "50/30/20 (Standard)"

    needs_budget = round(req.monthlyIncome * needs_pct / 100)
    wants_budget = round(req.monthlyIncome * wants_pct / 100)
    savings_budget = round(req.monthlyIncome * savings_pct / 100)

    # Classify current spending
    needs_spent = sum(v for k, v in req.currentSpending.items() if k in NEEDS_CATEGORIES)
    wants_spent = sum(v for k, v in req.currentSpending.items() if k in WANTS_CATEGORIES)
    invested = sum(v for k, v in req.currentSpending.items() if k in SAVINGS_CATEGORIES)
    other_spent = sum(v for k, v in req.currentSpending.items()
                      if k not in NEEDS_CATEGORIES and k not in WANTS_CATEGORIES and k not in SAVINGS_CATEGORIES)
    # What the user actually kept = income minus everything consumed. Money put
    # into investments/savings products counts as saved, not spent.
    savings_spent = max(0.0, req.monthlyIncome - needs_spent - wants_spent - other_spent)

    # Per-category recommendations
    category_allocations = []
    for cat, amount in req.currentSpending.items():
        if cat in NEEDS_CATEGORIES:
            bucket = 'Needs'
        elif cat in WANTS_CATEGORIES:
            bucket = 'Wants'
        elif cat in SAVINGS_CATEGORIES:
            bucket = 'Savings'
        else:
            bucket = 'Other'
        category_allocations.append({
            "category": cat,
            "currentSpend": round(amount),
            "bucket": bucket
        })

    # Insights
    insights = []
    if needs_spent > needs_budget:
        insights.append(f"⚠️ Your needs spending (₹{round(needs_spent):,}) exceeds the recommended ₹{needs_budget:,}. Look for ways to reduce fixed costs.")
    if wants_spent > wants_budget:
        insights.append(f"⚠️ Your wants spending (₹{round(wants_spent):,}) exceeds the recommended ₹{wants_budget:,}. Try cutting discretionary expenses by ₹{round(wants_spent - wants_budget):,}.")
    if savings_spent < savings_budget:
        deficit = round(savings_budget - savings_spent)
        insights.append(f"💡 You're saving ₹{deficit:,} less than recommended. Even ₹{min(500, deficit)}/month in a SIP can compound significantly!")
    elif invested < savings_budget * 0.5 and savings_spent > 0:
        insights.append(f"💡 You have about ₹{round(savings_spent):,} left over this month but only ₹{round(invested):,} is invested. Consider moving part of the surplus into a SIP or recurring deposit.")
    if not insights:
        insights.append("✅ Great job! Your spending aligns well with the recommended budget framework.")

    return {
        "rule": rule_name,
        "isLowIncome": is_low_income,
        "monthlyIncome": round(req.monthlyIncome),
        "recommended": {
            "needs": {"percentage": needs_pct, "amount": needs_budget, "categories": NEEDS_CATEGORIES},
            "wants": {"percentage": wants_pct, "amount": wants_budget, "categories": WANTS_CATEGORIES},
            "savings": {"percentage": savings_pct, "amount": savings_budget, "categories": SAVINGS_CATEGORIES}
        },
        "actual": {
            "needs": {"amount": round(needs_spent), "percentage": round(needs_spent / req.monthlyIncome * 100, 1) if req.monthlyIncome > 0 else 0},
            "wants": {"amount": round(wants_spent), "percentage": round(wants_spent / req.monthlyIncome * 100, 1) if req.monthlyIncome > 0 else 0},
            "savings": {"amount": round(savings_spent), "percentage": round(savings_spent / req.monthlyIncome * 100, 1) if req.monthlyIncome > 0 else 0, "invested": round(invested)},
            "other": {"amount": round(other_spent)}
        },
        "categoryAllocations": category_allocations,
        "insights": insights
    }


# ─── 4. Category Insights (Merchant-Level Observations) ──────────

@app.post("/category-insights")
def category_insights(req: CategoryInsightsRequest):
    df = expense_frame(req.transactions)
    if len(df) < 5:
        return {"merchantInsights": [], "categoryPatterns": [], "totalMerchantsAnalyzed": 0, "message": "Not enough expense transactions for insights"}

    insights = []

    # Group by merchant
    merchants = df[df['merchant'].notna() & (df['merchant'] != '')].groupby('merchant')

    for merchant, group in merchants:
        if len(group) < 2:
            continue

        total_spent = group['amount'].sum()
        avg_amount = group['amount'].mean()
        visit_count = len(group)
        category = group['category'].mode()[0] if len(group['category'].mode()) > 0 else 'Other'

        # Frequency analysis
        dates_sorted = group['date'].sort_values()
        if len(dates_sorted) >= 2:
            gaps = dates_sorted.diff().dropna().dt.days
            avg_gap = gaps.mean()
            
            if avg_gap <= 3:
                frequency = "almost daily"
                freq_insight = f"You visit {merchant} almost daily. Total: ₹{round(total_spent):,} over {visit_count} visits."
            elif avg_gap <= 8:
                frequency = f"about every {round(avg_gap)} days"
                freq_insight = f"You visit {merchant} {frequency} ({visit_count} times). Consider buying in bulk to save ~₹{round(avg_amount * 0.15):,}/month."
            elif avg_gap <= 16:
                frequency = f"every ~{round(avg_gap)} days"
                freq_insight = f"You go to {merchant} {frequency}. Average spend: ₹{round(avg_amount):,} per visit."
            else:
                frequency = "occasionally"
                freq_insight = f"You occasionally visit {merchant}. Average: ₹{round(avg_amount):,} per visit."
        else:
            frequency = "once"
            freq_insight = f"Single transaction at {merchant}: ₹{round(total_spent):,}"

        # Amount trend
        if len(group) >= 3:
            recent = group.tail(3)['amount'].mean()
            earlier = group.head(3)['amount'].mean()
            if recent > earlier * 1.3:
                trend = "increasing"
                trend_msg = f"📈 Your spending at {merchant} is increasing ({round((recent/earlier - 1) * 100)}% higher recently)."
            elif recent < earlier * 0.7:
                trend = "decreasing"
                trend_msg = f"📉 Good news! Your spending at {merchant} is decreasing."
            else:
                trend = "stable"
                trend_msg = ""
        else:
            trend = "unknown"
            trend_msg = ""

        insights.append({
            "merchant": str(merchant),
            "category": category,
            "totalSpent": round(total_spent),
            "averageAmount": round(avg_amount),
            "visitCount": visit_count,
            "frequency": frequency,
            "trend": trend,
            "insight": freq_insight,
            "trendInsight": trend_msg,
            "savingTip": f"Consider alternatives or negotiate better rates at {merchant}." if total_spent > avg_amount * 10 else None
        })

    # Sort by total spend descending
    insights.sort(key=lambda x: x['totalSpent'], reverse=True)

    # Category-level patterns
    cat_insights = []
    for cat, group in df.groupby('category'):
        if len(group) < 3:
            continue
        monthly = group.groupby(group['date'].dt.to_period('M'))['amount'].sum()
        if len(monthly) >= 2:
            trend = "increasing" if monthly.iloc[-1] > monthly.iloc[0] * 1.2 else \
                    "decreasing" if monthly.iloc[-1] < monthly.iloc[0] * 0.8 else "stable"
            cat_insights.append({
                "category": str(cat),
                "monthlyAverage": round(float(monthly.mean())),
                "months": int(len(monthly)),
                "trend": trend,
                "totalTransactions": len(group)
            })

    return {
        "merchantInsights": insights[:20],
        "categoryPatterns": cat_insights,
        "totalMerchantsAnalyzed": len(insights),
        "model": "PatternDetection-v1 (frequency + trend analysis)"
    }


# ─── Run Server ───────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
