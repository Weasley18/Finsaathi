"""
FinSaathi ML Microservice
=========================
FastAPI service providing:
- Isolation Forest anomaly detection
- Prophet time-series spending forecast
- Adaptive budgeting (50/30/20 or 60/20/20)
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


# ─── 1. Anomaly Detection (Isolation Forest) ─────────────────────

@app.post("/anomalies")
def detect_anomalies(req: AnomalyRequest):
    if len(req.transactions) < 10:
        return {
            "anomalies": [],
            "largeTransactions": [],
            "model": "IsolationForest-v2",
            "message": "Not enough transactions for anomaly detection (need at least 10)"
        }

    try:
        from sklearn.ensemble import IsolationForest

        df = pd.DataFrame([t.model_dump() for t in req.transactions])
        df['date'] = pd.to_datetime(df['date'])
        df['month'] = df['date'].dt.to_period('M').astype(str)

        # Per-category anomaly detection
        anomalies = []
        categories = df['category'].unique()

        for cat in categories:
            cat_df = df[df['category'] == cat]
            if len(cat_df) < 5:
                continue

            # Group by month for the category
            monthly = cat_df.groupby('month')['amount'].sum().reset_index()
            if len(monthly) < 3:
                continue

            # Use Isolation Forest on monthly amounts
            amounts = monthly['amount'].values.reshape(-1, 1)
            iso_forest = IsolationForest(contamination=0.1, random_state=42, n_estimators=100)
            preds = iso_forest.fit_predict(amounts)
            scores = iso_forest.decision_function(amounts)

            # Current month (last entry)
            current_month = monthly.iloc[-1]
            current_pred = preds[-1]
            current_score = scores[-1]
            
            mean_val = monthly['amount'].mean()
            std_val = monthly['amount'].std()

            if current_pred == -1 and current_month['amount'] > mean_val:
                multiplier = round(current_month['amount'] / mean_val, 1) if mean_val > 0 else 0
                z_score = round((current_month['amount'] - mean_val) / std_val, 2) if std_val > 0 else 0
                severity = 'critical' if multiplier > 3 or z_score > 3 else 'warning'
                
                anomalies.append({
                    "category": cat,
                    "currentSpend": round(current_month['amount']),
                    "averageSpend": round(mean_val),
                    "standardDeviation": round(std_val),
                    "multiplier": multiplier,
                    "zScore": z_score,
                    "isolationScore": round(float(current_score), 4),
                    "severity": severity,
                    "message": f"🚨 You spent {multiplier}x your usual {cat} budget this month (₹{round(current_month['amount']):,} vs avg ₹{round(mean_val):,})!"
                        if severity == 'critical' else
                        f"⚠️ Your {cat} spending is higher than usual — ₹{round(current_month['amount']):,} vs your average of ₹{round(mean_val):,}."
                })

        # Single large transaction outliers
        all_amounts = df['amount'].values
        if len(all_amounts) > 5:
            iso_single = IsolationForest(contamination=0.05, random_state=42)
            single_preds = iso_single.fit_predict(all_amounts.reshape(-1, 1))
            
            large_txns = []
            for i, (pred, row) in enumerate(zip(single_preds, df.itertuples())):
                if pred == -1 and row.amount > np.mean(all_amounts) and row.amount > 1000:
                    large_txns.append({
                        "amount": row.amount,
                        "category": row.category,
                        "merchant": row.merchant,
                        "date": str(row.date),
                        "message": f"💰 Unusually large expense: ₹{row.amount:,.0f} on {row.category}" +
                                   (f" at {row.merchant}" if row.merchant else "")
                    })
        else:
            large_txns = []

        # Sort anomalies by multiplier descending
        anomalies.sort(key=lambda x: x['multiplier'], reverse=True)

        return {
            "model": "IsolationForest-v2 (scikit-learn)",
            "anomalies": anomalies,
            "largeTransactions": large_txns[:10],
            "totalAnomalies": len(anomalies),
            "totalLargeTransactions": len(large_txns),
            "analysisWindow": "full transaction history"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Anomaly detection failed: {str(e)}")


# ─── 2. Spending Forecast (Prophet) ──────────────────────────────

@app.post("/forecast")
def forecast_spending(req: ForecastRequest):
    if len(req.transactions) < 14:
        return {
            "model": "Prophet-v2",
            "message": "Not enough data for forecast (need at least 14 transactions)",
            "projection": None,
            "dailyForecast": [],
            "categoryForecasts": [],
            "budgetAlerts": []
        }

    try:
        from prophet import Prophet

        df = pd.DataFrame([t.model_dump() for t in req.transactions])
        df['date'] = pd.to_datetime(df['date'])

        # Daily aggregation
        daily = df.groupby(df['date'].dt.date)['amount'].sum().reset_index()
        daily.columns = ['ds', 'y']
        daily['ds'] = pd.to_datetime(daily['ds'])

        # Determine forecast range: rest of current month
        now = datetime.now()
        end_of_month = datetime(now.year, now.month + 1 if now.month < 12 else 1,
                                1, 0, 0, 0) - timedelta(days=1) if now.month < 12 else \
                       datetime(now.year + 1, 1, 1) - timedelta(days=1)
        days_remaining = (end_of_month - now).days
        days_in_month = end_of_month.day

        # Fit Prophet model
        model = Prophet(
            daily_seasonality=False,
            weekly_seasonality=True,
            yearly_seasonality=False,
            changepoint_prior_scale=0.05,
            interval_width=0.85
        )
        model.fit(daily)

        # Make future dataframe
        future = model.make_future_dataframe(periods=max(days_remaining + 1, 7))
        forecast = model.predict(future)

        # Extract daily forecast data
        daily_forecast = []
        total_spent = 0
        start_of_month = datetime(now.year, now.month, 1)

        for _, row in forecast.iterrows():
            day_date = row['ds']
            if day_date < start_of_month:
                continue
            if day_date > end_of_month:
                break

            is_actual = day_date.date() <= now.date()
            if is_actual:
                actual_amount = daily[daily['ds'].dt.date == day_date.date()]['y'].sum()
                amount = float(actual_amount) if actual_amount > 0 else 0
                total_spent += amount
            else:
                amount = max(0, float(row['yhat']))

            daily_forecast.append({
                "date": str(day_date.date()),
                "day": day_date.day,
                "amount": round(amount),
                "yhat": round(float(row['yhat'])),
                "yhat_lower": round(max(0, float(row['yhat_lower']))),
                "yhat_upper": round(float(row['yhat_upper'])),
                "isActual": is_actual
            })

        # Month-end projection from Prophet
        month_forecast = forecast[
            (forecast['ds'] >= pd.Timestamp(start_of_month)) &
            (forecast['ds'] <= pd.Timestamp(end_of_month))
        ]
        projected_total = round(float(month_forecast['yhat'].sum()))
        projected_low = round(float(month_forecast['yhat_lower'].sum()))
        projected_high = round(float(month_forecast['yhat_upper'].sum()))

        # Historical monthly average
        df['month'] = df['date'].dt.to_period('M')
        monthly_totals = df.groupby('month')['amount'].sum()
        historical_avg = round(float(monthly_totals.mean())) if len(monthly_totals) > 0 else 0

        # Category-level forecasts (simple projection)
        cat_spending = df[df['date'] >= start_of_month].groupby('category')['amount'].sum()
        day_of_month = now.day
        category_forecasts = []
        for cat, spent in cat_spending.items():
            proj = round((spent / day_of_month) * days_in_month) if day_of_month > 0 else 0
            category_forecasts.append({
                "category": str(cat),
                "spentSoFar": round(float(spent)),
                "projectedTotal": proj,
                "dailyRate": round(float(spent) / day_of_month) if day_of_month > 0 else 0
            })
        category_forecasts.sort(key=lambda x: x['projectedTotal'], reverse=True)

        # Budget overflow alerts
        budget_alerts = []
        for b in req.budgets:
            cat_projected = next((c['projectedTotal'] for c in category_forecasts if c['category'] == b.category), 0)
            if cat_projected > b.limit:
                budget_alerts.append({
                    "category": b.category,
                    "budgetLimit": b.limit,
                    "projectedSpend": cat_projected,
                    "willExceedBudget": True,
                    "projectedOverage": cat_projected - round(b.limit),
                    "confidence": "85%"
                })

        vs_hist = f"{((projected_total - historical_avg) / historical_avg * 100):.1f}%" if historical_avg > 0 else "N/A"

        # Insight message
        if historical_avg > 0 and projected_total > historical_avg * 1.2:
            insight = f"📈 Prophet predicts you'll spend ₹{projected_total:,} this month — {((projected_total / historical_avg - 1) * 100):.0f}% more than your usual ₹{historical_avg:,}. Consider cutting back."
        elif historical_avg > 0 and projected_total < historical_avg * 0.8:
            insight = f"✨ Great job! Prophet predicts only ₹{projected_total:,} this month — saving more than usual!"
        else:
            insight = f"📊 Prophet projects ₹{projected_total:,} this month, similar to your average of ₹{historical_avg:,}."

        return {
            "model": "Prophet-v2 (Meta time-series forecasting)",
            "currentMonth": {
                "totalSpentSoFar": round(total_spent),
                "dayOfMonth": day_of_month,
                "daysRemaining": days_remaining,
                "dailyAverage": round(total_spent / day_of_month) if day_of_month > 0 else 0
            },
            "projection": {
                "projected": projected_total,
                "low": max(0, projected_low),
                "high": projected_high,
                "confidence": "85%",
                "vsHistoricalAvg": vs_hist
            },
            "historicalAvg": historical_avg,
            "dailyForecast": daily_forecast,
            "categoryForecasts": category_forecasts,
            "budgetAlerts": budget_alerts,
            "insight": insight
        }

    except Exception as e:
        # Fallback: linear projection if Prophet fails or is not installed
        try:
            df = pd.DataFrame([t.model_dump() for t in req.transactions])
            df['date'] = pd.to_datetime(df['date'])

            now = datetime.now()
            start_of_month = datetime(now.year, now.month, 1)
            if now.month < 12:
                end_of_month = datetime(now.year, now.month + 1, 1) - timedelta(days=1)
            else:
                end_of_month = datetime(now.year + 1, 1, 1) - timedelta(days=1)

            day_of_month = now.day
            days_in_month = end_of_month.day
            days_remaining = (end_of_month - now).days

            # Current month spending
            current_month = df[df['date'] >= pd.Timestamp(start_of_month)]
            total_spent = float(current_month['amount'].sum())
            daily_avg = total_spent / day_of_month if day_of_month > 0 else 0
            projected_total = round(daily_avg * days_in_month)

            # Historical monthly average
            df['month'] = df['date'].dt.to_period('M')
            monthly_totals = df.groupby('month')['amount'].sum()
            historical_avg = round(float(monthly_totals.mean())) if len(monthly_totals) > 0 else 0

            # Daily forecast (flat projection)
            daily_forecast = []
            for d in range(1, days_in_month + 1):
                day_date = datetime(now.year, now.month, d)
                is_actual = d <= day_of_month
                daily_forecast.append({
                    "date": str(day_date.date()),
                    "day": d,
                    "amount": round(daily_avg),
                    "yhat": round(daily_avg),
                    "yhat_lower": round(daily_avg * 0.7),
                    "yhat_upper": round(daily_avg * 1.3),
                    "isActual": is_actual
                })

            # Category forecasts
            cat_spending = current_month.groupby('category')['amount'].sum()
            category_forecasts = []
            for cat, spent in cat_spending.items():
                proj = round((float(spent) / day_of_month) * days_in_month) if day_of_month > 0 else 0
                category_forecasts.append({
                    "category": str(cat),
                    "spentSoFar": round(float(spent)),
                    "projectedTotal": proj,
                    "dailyRate": round(float(spent) / day_of_month) if day_of_month > 0 else 0
                })
            category_forecasts.sort(key=lambda x: x['projectedTotal'], reverse=True)

            # Budget alerts
            budget_alerts = []
            for b in req.budgets:
                cat_proj = next((c['projectedTotal'] for c in category_forecasts if c['category'] == b.category), 0)
                if cat_proj > b.limit:
                    budget_alerts.append({
                        "category": b.category,
                        "budgetLimit": b.limit,
                        "projectedSpend": cat_proj,
                        "willExceedBudget": True,
                        "projectedOverage": cat_proj - round(b.limit),
                        "confidence": "65%"
                    })

            vs_hist = "N/A"
            if historical_avg > 0:
                vs_hist = f"{((projected_total - historical_avg) / historical_avg * 100):.1f}%"

            insight = f"📊 Linear projection: ~₹{projected_total:,} this month (avg: ₹{historical_avg:,}). Install Prophet for better forecasts."

            return {
                "model": "Linear projection fallback (Prophet not available)",
                "currentMonth": {
                    "totalSpentSoFar": round(total_spent),
                    "dayOfMonth": day_of_month,
                    "daysRemaining": days_remaining,
                    "dailyAverage": round(daily_avg)
                },
                "projection": {
                    "projected": projected_total,
                    "low": round(projected_total * 0.7),
                    "high": round(projected_total * 1.3),
                    "confidence": "65%",
                    "vsHistoricalAvg": vs_hist
                },
                "historicalAvg": historical_avg,
                "dailyForecast": daily_forecast,
                "categoryForecasts": category_forecasts,
                "budgetAlerts": budget_alerts,
                "insight": insight
            }
        except Exception as fallback_err:
            raise HTTPException(status_code=500, detail=f"Forecast failed: {str(e)}. Fallback also failed: {str(fallback_err)}")


# ─── 3. Adaptive Budget Rule ─────────────────────────────────────

NEEDS_CATEGORIES = ['Rent', 'Groceries', 'Utilities', 'Transport', 'Health', 'Education', 'EMI', 'Insurance', 'Mobile Recharge', 'Fuel']
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
    savings_spent = sum(v for k, v in req.currentSpending.items() if k in SAVINGS_CATEGORIES)
    other_spent = sum(v for k, v in req.currentSpending.items()
                      if k not in NEEDS_CATEGORIES and k not in WANTS_CATEGORIES and k not in SAVINGS_CATEGORIES)

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
            "savings": {"amount": round(savings_spent), "percentage": round(savings_spent / req.monthlyIncome * 100, 1) if req.monthlyIncome > 0 else 0},
            "other": {"amount": round(other_spent)}
        },
        "categoryAllocations": category_allocations,
        "insights": insights
    }


# ─── 4. Category Insights (Merchant-Level Observations) ──────────

@app.post("/category-insights")
def category_insights(req: CategoryInsightsRequest):
    if len(req.transactions) < 5:
        return {"insights": [], "message": "Not enough transactions for insights"}

    df = pd.DataFrame([t.model_dump() for t in req.transactions])
    df['date'] = pd.to_datetime(df['date'])

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
