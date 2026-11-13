import React, { useState, useEffect } from 'react';
import { api } from '../api';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, PieChart, Pie, Cell
} from 'recharts';
import {
    AlertTriangle, TrendingUp, Wallet, PieChart as PieIcon, RefreshCw,
    ArrowUp, ArrowDown, ShieldAlert, IndianRupee, Lightbulb, ChevronDown, ChevronUp,
    Flame, Activity, Target, ArrowUpRight, Minus
} from 'lucide-react';

const SEVERITY_COLORS = { high: '#EF4444', medium: '#F59E0B', low: '#FBBF24' };
const SEVERITY_BG = { high: 'rgba(239,68,68,0.1)', medium: 'rgba(245,158,11,0.08)', low: 'rgba(251,191,36,0.06)' };
const CATEGORY_COLORS = ['#00C853', '#2196F3', '#9C27B0', '#FF9800', '#E91E63', '#00BCD4', '#607D8B', '#8BC34A', '#FF5722', '#3F51B5'];
const ALLOC_META = {
    needs: { color: '#3B82F6', icon: Target, label: 'Needs', pct: '50%', desc: 'Essentials like rent, food, utilities' },
    wants: { color: '#F59E0B', icon: Flame, label: 'Wants', pct: '30%', desc: 'Lifestyle, entertainment, dining' },
    savings: { color: '#10B981', icon: TrendingUp, label: 'Savings', pct: '20%', desc: 'Investments, emergency fund, goals' },
};

const fmt = (v) => {
    if (v == null) return '—';
    return '₹' + Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 });
};

const SectionLabel = ({ icon: Icon, children }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        {Icon && <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(186,143,13,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={16} color="var(--accent)" />
        </div>}
        <h4 style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}>{children}</h4>
    </div>
);

const Loader = ({ text }) => (
    <div className="glass-card" style={{ padding: '56px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <RefreshCw size={28} className="spin" style={{ marginBottom: 12, opacity: 0.6 }} />
        <div style={{ fontSize: 14, fontWeight: 500 }}>{text}</div>
    </div>
);

// eslint-disable-next-line no-unused-vars
const EmptyState = ({ icon: Icon, title, subtitle, color = 'var(--accent)' }) => (
    <div className="glass-card" style={{ padding: '56px 24px', textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: `${color}15`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Icon size={28} color={color} />
        </div>
        <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{title}</p>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, maxWidth: 320, margin: '0 auto' }}>{subtitle}</p>
    </div>
);

export default function PredictiveAnalysisPage() {
    const [tab, setTab] = useState('anomalies');
    const [anomalies, setAnomalies] = useState(null);
    const [forecast, setForecast] = useState(null);
    const [budget, setBudget] = useState(null);
    const [catInsights, setCatInsights] = useState(null);
    const [loading, setLoading] = useState({});
    const [expandedAnomaly, setExpandedAnomaly] = useState(null);

    const load = async (key, fn, setter) => {
        setLoading(p => ({ ...p, [key]: true }));
        try { const data = await fn(); setter(data); }
        catch { /* ignore */ }
        finally { setLoading(p => ({ ...p, [key]: false })); }
    };

    useEffect(() => {
        load('anomalies', () => api.getAnomalies(), setAnomalies);
        load('forecast', () => api.getForecast(30), setForecast);
        load('budget', () => api.getAdaptiveBudget(), setBudget);
        load('insights', () => api.getCategoryInsights(), setCatInsights);
    }, []);

    const anomalyCount = anomalies?.anomalies?.length || 0;
    const alertCount = forecast?.budgetAlerts?.length || 0;

    const tabs = [
        { key: 'anomalies', icon: ShieldAlert, label: 'Anomalies', badge: anomalyCount || null },
        { key: 'forecast', icon: TrendingUp, label: 'Forecast' },
        { key: 'budget', icon: Wallet, label: 'Smart Budget' },
        { key: 'insights', icon: PieIcon, label: 'Category Insights' },
    ];

    return (
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <header style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                    <div style={{
                        width: 42, height: 42, borderRadius: 12,
                        background: 'linear-gradient(135deg, rgba(186,143,13,0.15), rgba(212,175,55,0.08))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Activity size={22} color="var(--accent)" />
                    </div>
                    <div>
                        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>Predictive Analysis</h2>
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                            AI-powered spending anomalies, forecasts & smart budgets
                        </p>
                    </div>
                </div>
            </header>

            {/* ─── Tab Bar ─── */}
            <div style={{
                display: 'flex', gap: 6, marginBottom: 28, background: 'var(--card-bg)',
                borderRadius: 14, padding: 5, border: '1px solid var(--card-border)', flexWrap: 'wrap',
            }}>
                {tabs.map(t => {
                    const active = tab === t.key;
                    return (
                        <button key={t.key} onClick={() => setTab(t.key)} style={{
                            padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
                            background: active ? 'var(--accent)' : 'transparent',
                            color: active ? '#000' : 'var(--text-secondary)',
                            fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 7,
                            transition: 'all 0.2s ease', flex: '1 1 auto', justifyContent: 'center',
                        }}>
                            <t.icon size={15} /> {t.label}
                            {t.badge ? (
                                <span style={{
                                    minWidth: 20, height: 20, borderRadius: 10, fontSize: 11, fontWeight: 700,
                                    background: active ? 'rgba(0,0,0,0.2)' : 'rgba(239,68,68,0.15)',
                                    color: active ? '#000' : '#EF4444',
                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px',
                                }}>{t.badge}</span>
                            ) : null}
                        </button>
                    );
                })}
            </div>

            {/* ═══════════════ Anomalies Tab ═══════════════ */}
            {tab === 'anomalies' && (
                <div>
                    {loading.anomalies ? <Loader text="Detecting anomalies with Isolation Forest..." /> :
                    !anomalies?.anomalies?.length ? (
                        <EmptyState icon={ShieldAlert} title="No anomalies detected" subtitle="Your spending patterns look healthy — keep it up!" color="#10B981" />
                    ) : (
                        <>
                            {/* Model badge + severity summary */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    {anomalies.model && (
                                        <span style={{
                                            padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                                            background: 'rgba(186,143,13,0.1)', color: 'var(--accent-light)', letterSpacing: '0.02em',
                                        }}>🤖 {anomalies.model}</span>
                                    )}
                                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                        {anomalyCount} anomal{anomalyCount === 1 ? 'y' : 'ies'} found
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    {['high', 'medium', 'low'].map(sev => {
                                        const count = anomalies.anomalies.filter(a => a.severity === sev).length;
                                        if (!count) return null;
                                        return (
                                            <div key={sev} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: SEVERITY_COLORS[sev] }} />
                                                <span style={{ fontSize: 13, fontWeight: 600 }}>{count}</span>
                                                <span style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{sev}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Anomaly list */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {anomalies.anomalies.map((a, i) => (
                                    <div key={i}
                                        className="glass-card"
                                        onClick={() => setExpandedAnomaly(expandedAnomaly === i ? null : i)}
                                        style={{
                                            padding: 0, cursor: 'pointer', overflow: 'hidden',
                                            borderLeft: `4px solid ${SEVERITY_COLORS[a.severity] || '#FF9800'}`,
                                            background: expandedAnomaly === i ? SEVERITY_BG[a.severity] : 'var(--card-bg)',
                                            transition: 'background 0.2s ease',
                                        }}>
                                        <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                                            {/* Severity dot */}
                                            <div style={{
                                                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                                                background: `${SEVERITY_COLORS[a.severity]}15`,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}>
                                                <AlertTriangle size={17} color={SEVERITY_COLORS[a.severity]} />
                                            </div>
                                            {/* Info */}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>
                                                    {a.category || a.merchant || 'Unknown'}
                                                </div>
                                                <div style={{
                                                    fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.4,
                                                    display: '-webkit-box', WebkitLineClamp: expandedAnomaly === i ? 'unset' : 1,
                                                    WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                                }}>
                                                    {a.reason || a.description}
                                                </div>
                                            </div>
                                            {/* Amount */}
                                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                <div style={{ fontWeight: 800, fontSize: 16, fontVariantNumeric: 'tabular-nums' }}>
                                                    {fmt(a.amount)}
                                                </div>
                                                {a.deviation > 0 && (
                                                    <div style={{ fontSize: 11, color: SEVERITY_COLORS[a.severity], fontWeight: 600, marginTop: 2 }}>
                                                        {a.deviation}x normal
                                                    </div>
                                                )}
                                            </div>
                                            {/* Badge */}
                                            <span style={{
                                                padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                                                background: `${SEVERITY_COLORS[a.severity]}18`,
                                                color: SEVERITY_COLORS[a.severity],
                                                textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0,
                                            }}>{a.severity}</span>
                                            <ChevronDown size={16} color="var(--text-muted)" style={{
                                                transition: 'transform 0.2s ease', flexShrink: 0,
                                                transform: expandedAnomaly === i ? 'rotate(180deg)' : 'rotate(0deg)',
                                            }} />
                                        </div>
                                        {/* Expanded detail */}
                                        {expandedAnomaly === i && (
                                            <div style={{
                                                padding: '0 20px 16px 70px',
                                                display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10,
                                            }}>
                                                {a.avgSpending != null && a.avgSpending > 0 && (
                                                    <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--bg-secondary)' }}>
                                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Avg Category Spend</div>
                                                        <div style={{ fontSize: 15, fontWeight: 700 }}>{fmt(a.avgSpending)}</div>
                                                    </div>
                                                )}
                                                {a.date && (
                                                    <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--bg-secondary)' }}>
                                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Date</div>
                                                        <div style={{ fontSize: 15, fontWeight: 700 }}>{new Date(a.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                                                    </div>
                                                )}
                                                {a.merchant && (
                                                    <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--bg-secondary)' }}>
                                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Merchant</div>
                                                        <div style={{ fontSize: 15, fontWeight: 700 }}>{a.merchant}</div>
                                                    </div>
                                                )}
                                                {a.suggestion && (
                                                    <div style={{ gridColumn: '1 / -1', padding: '10px 14px', borderRadius: 8, background: 'rgba(186,143,13,0.06)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                                        <Lightbulb size={14} color="var(--accent)" style={{ marginTop: 2, flexShrink: 0 }} />
                                                        <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{a.suggestion}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ═══════════════ Forecast Tab ═══════════════ */}
            {tab === 'forecast' && (
                <div>
                    {loading.forecast ? <Loader text="Generating spending forecast..." /> :
                    !forecast ? (
                        <EmptyState icon={TrendingUp} title="No forecast available" subtitle="Add more transactions so our models can predict your spending." />
                    ) : (
                        <>
                            {/* Hero metrics */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 24 }}>
                                <div className="glass-card" style={{
                                    padding: 22,
                                    background: 'linear-gradient(135deg, rgba(186,143,13,0.08), rgba(186,143,13,0.02))',
                                }}>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                                        Predicted Spend (30d)
                                    </div>
                                    <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                                        {fmt(forecast.totalPredicted || forecast.predictedTotal)}
                                    </div>
                                    {forecast.model && (
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>via {forecast.model}</div>
                                    )}
                                </div>
                                {alertCount > 0 && (
                                    <div className="glass-card" style={{
                                        padding: 22, borderLeft: '4px solid #EF4444',
                                        background: 'rgba(239,68,68,0.04)',
                                    }}>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                                            Budget Overshoots
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                                            <span style={{ fontSize: 30, fontWeight: 800, color: '#EF4444' }}>{alertCount}</span>
                                            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>categor{alertCount === 1 ? 'y' : 'ies'}</span>
                                        </div>
                                    </div>
                                )}
                                {forecast.insight && (
                                    <div className="glass-card" style={{ padding: 22, display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <Lightbulb size={20} color="var(--accent)" style={{ flexShrink: 0 }} />
                                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{forecast.insight}</div>
                                    </div>
                                )}
                            </div>

                            {/* Chart */}
                            {forecast.dailyForecast?.length > 0 && (
                                <div className="glass-card" style={{ padding: 24, marginBottom: 20 }}>
                                    <SectionLabel icon={TrendingUp}>30-Day Spending Forecast</SectionLabel>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <AreaChart data={forecast.dailyForecast} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.25} />
                                                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.02} />
                                                </linearGradient>
                                                <linearGradient id="boundGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.06} />
                                                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.01} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
                                            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false}
                                                tickFormatter={v => new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} interval={4} />
                                            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false}
                                                tickFormatter={v => '₹' + (v / 1000).toFixed(0) + 'K'} width={55} />
                                            <Tooltip
                                                formatter={v => fmt(v)}
                                                labelFormatter={v => new Date(v).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long' })}
                                                contentStyle={{ background: 'var(--surface)', border: '1px solid var(--card-border)', borderRadius: 10, fontSize: 13 }}
                                                itemStyle={{ color: 'var(--text-primary)' }}
                                                labelStyle={{ color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}
                                            />
                                            <Area type="monotone" dataKey="upper" stroke="none" fill="url(#boundGrad)" name="Upper Bound" />
                                            <Area type="monotone" dataKey="predicted" stroke="var(--accent)" fill="url(#forecastGrad)" strokeWidth={2.5} name="Predicted" dot={false} />
                                            <Area type="monotone" dataKey="lower" stroke="none" fill="url(#boundGrad)" name="Lower Bound" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            )}

                            {/* Category forecasts */}
                            {forecast.categoryForecasts?.length > 0 && (
                                <div className="glass-card" style={{ padding: 24, marginBottom: 20 }}>
                                    <SectionLabel icon={PieIcon}>Category Forecasts</SectionLabel>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                                        {forecast.categoryForecasts.map((cf, i) => (
                                            <div key={cf.category} style={{
                                                padding: '16px 18px', borderRadius: 12, background: 'var(--bg-secondary)',
                                                borderLeft: `4px solid ${CATEGORY_COLORS[i % CATEGORY_COLORS.length]}`,
                                                display: 'flex', alignItems: 'center', gap: 14,
                                            }}>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>{cf.category}</div>
                                                    <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.01em' }}>{fmt(cf.predicted)}</div>
                                                </div>
                                                {cf.trend && (
                                                    <div style={{
                                                        display: 'flex', alignItems: 'center', gap: 4,
                                                        padding: '5px 10px', borderRadius: 8,
                                                        background: cf.trend === 'up' ? 'rgba(239,68,68,0.1)' : cf.trend === 'down' ? 'rgba(16,185,129,0.1)' : 'rgba(107,91,68,0.1)',
                                                        color: cf.trend === 'up' ? '#EF4444' : cf.trend === 'down' ? '#10B981' : 'var(--text-muted)',
                                                        fontSize: 12, fontWeight: 600,
                                                    }}>
                                                        {cf.trend === 'up' ? <ArrowUp size={13} /> : cf.trend === 'down' ? <ArrowDown size={13} /> : <Minus size={13} />}
                                                        {cf.trend === 'up' ? 'Rising' : cf.trend === 'down' ? 'Falling' : 'Stable'}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Budget alerts — redesigned */}
                            {forecast.budgetAlerts?.length > 0 && (
                                <div className="glass-card" style={{ padding: 24 }}>
                                    <SectionLabel icon={AlertTriangle}>Budget Alerts</SectionLabel>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                        {forecast.budgetAlerts.map((alert, i) => {
                                            const ratio = alert.budget > 0 ? alert.predicted / alert.budget : 1;
                                            const pct = Math.min(ratio * 100, 100);
                                            const overshootPct = Math.round((ratio - 1) * 100);
                                            return (
                                                <div key={i} style={{ padding: '16px 18px', borderRadius: 12, background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.1)' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                                        <div>
                                                            <div style={{ fontWeight: 700, fontSize: 15 }}>{alert.category}</div>
                                                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                                                                Overshoot of <span style={{ color: '#EF4444', fontWeight: 700 }}>{fmt(alert.overshoot)}</span> ({overshootPct > 0 ? `+${overshootPct}%` : `${overshootPct}%`})
                                                            </div>
                                                        </div>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Predicted vs Budget</div>
                                                            <div style={{ fontSize: 14, fontWeight: 700 }}>
                                                                <span style={{ color: '#EF4444' }}>{fmt(alert.predicted)}</span>
                                                                <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>/</span>
                                                                <span style={{ color: 'var(--text-secondary)' }}>{fmt(alert.budget)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {/* Progress bar */}
                                                    <div style={{ position: 'relative', background: 'rgba(255,255,255,0.06)', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                                                        <div style={{ position: 'absolute', width: `${Math.min(100 / ratio * 100, 100)}%`, height: '100%', background: 'rgba(255,255,255,0.08)', borderRadius: 6 }} />
                                                        <div style={{
                                                            width: `${pct}%`, height: '100%', borderRadius: 6,
                                                            background: 'linear-gradient(90deg, #EF4444, #F97316)',
                                                            transition: 'width 0.6s ease',
                                                        }} />
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                                                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Budget: {fmt(alert.budget)}</span>
                                                        <span style={{ fontSize: 11, color: '#EF4444', fontWeight: 600 }}>{Math.round(ratio * 100)}% utilised</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* ═══════════════ Smart Budget Tab ═══════════════ */}
            {tab === 'budget' && (
                <div>
                    {loading.budget ? <Loader text="Calculating smart budget..." /> :
                    !budget ? (
                        <EmptyState icon={Wallet} title="No budget data" subtitle="No budget recommendations available yet." />
                    ) : (
                        <>
                            {/* Rule hero card */}
                            {budget.rule && (
                                <div className="glass-card" style={{
                                    padding: 24, marginBottom: 20,
                                    background: 'linear-gradient(135deg, rgba(186,143,13,0.08), rgba(33,150,243,0.04))',
                                    borderBottom: '1px solid var(--accent)',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                                        <div>
                                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                                                Budget Strategy
                                            </div>
                                            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>{budget.rule} Rule</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>Est. Monthly Income</div>
                                            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent-light)', fontVariantNumeric: 'tabular-nums' }}>
                                                {fmt(budget.estimatedIncome)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Allocation — visual cards */}
                            {budget.allocation && (
                                <>
                                    {/* Stacked allocation bar */}
                                    <div style={{ marginBottom: 8 }}>
                                        <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', height: 10, background: 'var(--bg-secondary)' }}>
                                            {Object.entries(budget.allocation).map(([key, val]) => {
                                                const total = Object.values(budget.allocation).reduce((s, v) => s + v, 0);
                                                const pct = total > 0 ? (val / total) * 100 : 33;
                                                return (
                                                    <div key={key} style={{
                                                        width: `${pct}%`, height: '100%',
                                                        background: ALLOC_META[key]?.color || '#666',
                                                        transition: 'width 0.4s ease',
                                                    }} />
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
                                        {Object.entries(budget.allocation).map(([key, val]) => {
                                            const meta = ALLOC_META[key] || { color: '#888', label: key, pct: '—', desc: '', icon: Wallet };
                                            const Icon = meta.icon;
                                            return (
                                                <div key={key} className="glass-card" style={{ padding: 20, borderTop: `3px solid ${meta.color}` }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                                        <div style={{
                                                            width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            background: `${meta.color}18`,
                                                        }}>
                                                            <Icon size={15} color={meta.color} />
                                                        </div>
                                                        <div>
                                                            <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'capitalize' }}>{meta.label}</div>
                                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{meta.pct} of income</div>
                                                        </div>
                                                    </div>
                                                    <div style={{ fontSize: 26, fontWeight: 800, color: meta.color, marginBottom: 4, fontVariantNumeric: 'tabular-nums' }}>
                                                        {fmt(val)}
                                                    </div>
                                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>{meta.desc}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}

                            {/* Category budgets */}
                            {budget.categoryBudgets?.length > 0 && (
                                <div className="glass-card" style={{ padding: 24, marginBottom: 20 }}>
                                    <SectionLabel icon={Target}>Category-wise Budget</SectionLabel>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                        {budget.categoryBudgets.map((cb, i) => {
                                            const rawPct = cb.budget > 0 ? (cb.currentSpending / cb.budget) * 100 : 0;
                                            const pct = Math.min(rawPct, 100);
                                            const over = rawPct > 100;
                                            const barColor = over ? '#EF4444' : rawPct > 75 ? '#F59E0B' : CATEGORY_COLORS[i % CATEGORY_COLORS.length];
                                            const typeColors = { Needs: '#3B82F6', Wants: '#F59E0B', Savings: '#10B981' };
                                            return (
                                                <div key={cb.category}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <span style={{ fontWeight: 700, fontSize: 14 }}>{cb.category}</span>
                                                            <span style={{
                                                                padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                                                                background: `${typeColors[cb.type] || 'rgba(107,91,68,0.15)'}18`,
                                                                color: typeColors[cb.type] || 'var(--text-muted)',
                                                                textTransform: 'uppercase', letterSpacing: '0.04em',
                                                            }}>{cb.type}</span>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                                                            <span style={{ fontSize: 14, fontWeight: 700, color: over ? '#EF4444' : 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                                                                {fmt(cb.currentSpending)}
                                                            </span>
                                                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>/ {fmt(cb.budget)}</span>
                                                            {over && (
                                                                <span style={{ fontSize: 11, color: '#EF4444', fontWeight: 700 }}>
                                                                    +{Math.round(rawPct - 100)}%
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div style={{ background: 'var(--bg-secondary)', borderRadius: 6, height: 6, overflow: 'hidden' }}>
                                                        <div style={{
                                                            width: `${pct}%`, height: '100%', borderRadius: 6,
                                                            background: barColor,
                                                            transition: 'width 0.5s ease',
                                                        }} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Tips */}
                            {budget.tips?.length > 0 && (
                                <div className="glass-card" style={{ padding: 24 }}>
                                    <SectionLabel icon={Lightbulb}>Savings Tips</SectionLabel>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        {budget.tips.map((tip, i) => (
                                            <div key={i} style={{
                                                padding: '14px 16px', borderRadius: 10, display: 'flex', gap: 12, alignItems: 'flex-start',
                                                background: 'rgba(186,143,13,0.04)', border: '1px solid rgba(186,143,13,0.08)',
                                            }}>
                                                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    <Lightbulb size={14} color="#F59E0B" />
                                                </div>
                                                <span style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{tip}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* ═══════════════ Category Insights Tab ═══════════════ */}
            {tab === 'insights' && (
                <div>
                    {loading.insights ? <Loader text="Analyzing spending categories..." /> :
                    !catInsights?.categories?.length ? (
                        <EmptyState icon={PieIcon} title="No category insights" subtitle="Add more transactions to see spending breakdowns." />
                    ) : (
                        <>
                            {/* Model badge */}
                            {catInsights.model && (
                                <div style={{ marginBottom: 16 }}>
                                    <span style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, background: 'rgba(186,143,13,0.1)', color: 'var(--accent-light)' }}>
                                        🤖 {catInsights.model}
                                    </span>
                                </div>
                            )}

                            {/* Summary stat row */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
                                <div className="glass-card" style={{ padding: 16 }}>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Categories</div>
                                    <div style={{ fontSize: 22, fontWeight: 800 }}>{catInsights.categories.length}</div>
                                </div>
                                <div className="glass-card" style={{ padding: 16 }}>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Total Spend</div>
                                    <div style={{ fontSize: 22, fontWeight: 800 }}>{fmt(catInsights.categories.reduce((s, c) => s + c.totalSpent, 0))}</div>
                                </div>
                                <div className="glass-card" style={{ padding: 16 }}>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Transactions</div>
                                    <div style={{ fontSize: 22, fontWeight: 800 }}>{catInsights.categories.reduce((s, c) => s + c.transactionCount, 0)}</div>
                                </div>
                                {(() => {
                                    const rising = catInsights.categories.filter(c => c.trend === 'up').length;
                                    return rising > 0 ? (
                                        <div className="glass-card" style={{ padding: 16, borderLeft: '3px solid #EF4444' }}>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Rising</div>
                                            <div style={{ fontSize: 22, fontWeight: 800, color: '#EF4444' }}>{rising}</div>
                                        </div>
                                    ) : null;
                                })()}
                            </div>

                            {/* Pie chart */}
                            <div className="glass-card" style={{ padding: 24, marginBottom: 20 }}>
                                <SectionLabel icon={PieIcon}>Spending Distribution</SectionLabel>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie data={catInsights.categories} dataKey="totalSpent" nameKey="category"
                                            cx="50%" cy="50%" innerRadius={60} outerRadius={110} paddingAngle={2}
                                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                            {catInsights.categories.map((_, i) => (
                                                <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} stroke="none" />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={v => fmt(v)}
                                            contentStyle={{ background: 'var(--surface)', border: '1px solid var(--card-border)', borderRadius: 10, fontSize: 13 }}
                                            itemStyle={{ color: 'var(--text-primary)' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Category detail cards */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
                                {catInsights.categories.map((cat, i) => {
                                    const total = catInsights.categories.reduce((s, c) => s + c.totalSpent, 0);
                                    const pct = total > 0 ? ((cat.totalSpent / total) * 100).toFixed(1) : 0;
                                    return (
                                        <div key={cat.category} className="glass-card" style={{
                                            padding: 20, borderLeft: `4px solid ${CATEGORY_COLORS[i % CATEGORY_COLORS.length]}`,
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                                                <div>
                                                    <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 2 }}>{cat.category}</div>
                                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{pct}% of total spending</div>
                                                </div>
                                                {cat.trend && (
                                                    <span style={{
                                                        display: 'flex', alignItems: 'center', gap: 4,
                                                        padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                                                        background: cat.trend === 'up' ? 'rgba(239,68,68,0.1)' : cat.trend === 'down' ? 'rgba(16,185,129,0.1)' : 'rgba(107,91,68,0.1)',
                                                        color: cat.trend === 'up' ? '#EF4444' : cat.trend === 'down' ? '#10B981' : 'var(--text-muted)',
                                                    }}>
                                                        {cat.trend === 'up' ? <ArrowUp size={11} /> : cat.trend === 'down' ? <ArrowDown size={11} /> : <Minus size={11} />}
                                                        {cat.trend === 'up' ? 'Rising' : cat.trend === 'down' ? 'Falling' : 'Stable'}
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                                                <div style={{ background: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: 8 }}>
                                                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total</div>
                                                    <div style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmt(cat.totalSpent)}</div>
                                                </div>
                                                <div style={{ background: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: 8 }}>
                                                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Avg/txn</div>
                                                    <div style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmt(cat.avgAmount)}</div>
                                                </div>
                                                <div style={{ background: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: 8 }}>
                                                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Count</div>
                                                    <div style={{ fontSize: 14, fontWeight: 700 }}>{cat.transactionCount}</div>
                                                </div>
                                            </div>
                                            {cat.topMerchants?.length > 0 && (
                                                <div style={{ marginBottom: 10 }}>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Top Merchants</div>
                                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                        {cat.topMerchants.slice(0, 3).map(m => (
                                                            <span key={m.merchant || m} style={{
                                                                padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                                                                background: 'var(--bg-secondary)', color: 'var(--text-secondary)',
                                                                border: '1px solid var(--card-border)',
                                                            }}>
                                                                {m.merchant || m}
                                                                {m.total && <span style={{ color: 'var(--text-muted)', marginLeft: 4, fontSize: 10 }}>{fmt(m.total)}</span>}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {cat.savingTip && (
                                                <div style={{
                                                    padding: '10px 12px', borderRadius: 8, fontSize: 12, lineHeight: 1.5,
                                                    background: 'rgba(186,143,13,0.06)', display: 'flex', gap: 8, alignItems: 'flex-start',
                                                    color: 'var(--accent-light)',
                                                }}>
                                                    <Lightbulb size={13} style={{ marginTop: 2, flexShrink: 0 }} />
                                                    {cat.savingTip}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
