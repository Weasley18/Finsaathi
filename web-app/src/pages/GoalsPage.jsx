import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Target, Plus, TrendingUp, Sparkles, Flame, Trash2, ArrowUpRight, X } from 'lucide-react';

export default function GoalsPage() {
    const [goals, setGoals] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [showContribute, setShowContribute] = useState(null);
    const [newGoal, setNewGoal] = useState({ name: '', targetAmount: '', targetDate: '' });
    const [contributeAmount, setContributeAmount] = useState('');
    const [saving, setSaving] = useState(false);

    const fetchGoals = async () => {
        try {
            const data = await api.getGoals();
            setGoals(data.goals || []);
            setSummary(data.summary || null);
        } catch (err) {
            console.error('Failed to fetch goals:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchGoals(); }, []);

    const handleAdd = async () => {
        if (!newGoal.name || !newGoal.targetAmount) return;
        setSaving(true);
        try {
            await api.createGoal({
                name: newGoal.name,
                targetAmount: parseFloat(newGoal.targetAmount),
                targetDate: newGoal.targetDate || undefined,
            });
            setShowAdd(false);
            setNewGoal({ name: '', targetAmount: '', targetDate: '' });
            await fetchGoals();
        } catch (err) {
            alert('Failed to create goal. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleContribute = async () => {
        if (!contributeAmount || !showContribute) return;
        setSaving(true);
        try {
            const result = await api.contributeToGoal(showContribute.id, parseFloat(contributeAmount));
            alert(result.message || 'Contribution added!');
            setShowContribute(null);
            setContributeAmount('');
            await fetchGoals();
        } catch (err) {
            alert('Failed to add contribution.');
        } finally {
            setSaving(false);
        }
    };

    const handlePause = async (id) => {
        if (!confirm('Put this goal on hold?')) return;
        try {
            await api.updateGoal(id, { status: 'PAUSED' });
            await fetchGoals();
        } catch (err) {
            alert('Failed to update goal.');
        }
    };

    if (loading) return <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>Loading goals...</div>;

    const totalSaved = goals.reduce((s, g) => s + (g.currentAmount || 0), 0);
    const totalTarget = goals.reduce((s, g) => s + (g.targetAmount || 0), 0);

    return (
        <div>
            <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2>Savings Goals</h2>
                    <p>Track your financial milestones</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowAdd(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Plus size={16} /> Add Goal
                </button>
            </header>

            {/* Summary */}
            <div className="stats-grid" style={{ marginBottom: 24 }}>
                <div className="glass-card stat-card">
                    <div className="label">Total Saved</div>
                    <div className="value" style={{ color: 'var(--accent)' }}>₹{totalSaved.toLocaleString('en-IN')}</div>
                    <div className="trend"><Sparkles size={14} /> Across all goals</div>
                </div>
                <div className="glass-card stat-card">
                    <div className="label">Total Target</div>
                    <div className="value">₹{totalTarget.toLocaleString('en-IN')}</div>
                    <div className="trend"><Target size={14} /> Combined</div>
                </div>
                <div className="glass-card stat-card">
                    <div className="label">Active Goals</div>
                    <div className="value" style={{ color: 'var(--bright-gold)' }}>{summary?.activeGoals || goals.filter(g => g.status === 'ACTIVE').length}</div>
                    <div className="trend"><TrendingUp size={14} /> In progress</div>
                </div>
                <div className="glass-card stat-card">
                    <div className="label">Overall Progress</div>
                    <div className="value" style={{ color: 'var(--success)' }}>{totalTarget > 0 ? ((totalSaved / totalTarget) * 100).toFixed(0) : 0}%</div>
                    <div className="trend"><ArrowUpRight size={14} /> Complete</div>
                </div>
            </div>

            {/* Goals Grid */}
            {goals.length === 0 ? (
                <div className="glass-card" style={{ padding: 60, textAlign: 'center' }}>
                    <Target size={48} color="var(--text-muted)" style={{ marginBottom: 16 }} />
                    <h3 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>No goals yet</h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Set your first savings goal and start building your wealth!</p>
                    <button className="btn btn-primary" onClick={() => setShowAdd(true)}>Create Your First Goal</button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                    {goals.map(goal => {
                        const progress = Math.min(goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0, 100);
                        const isCompleted = goal.status === 'COMPLETED' || progress >= 100;
                        const remaining = goal.targetAmount - goal.currentAmount;

                        return (
                            <div key={goal.id} className="glass-card" style={{ padding: 24 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{
                                            width: 44, height: 44, borderRadius: 12,
                                            background: isCompleted ? 'var(--success)' : 'rgba(186,143,13,0.15)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            <Target size={20} color={isCompleted ? '#fff' : 'var(--accent)'} />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{goal.name}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)', letterSpacing: 1 }}>
                                                TARGET: ₹{goal.targetAmount?.toLocaleString('en-IN')}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        {isCompleted && <span className="badge badge-gold">✓ Done</span>}
                                        {progress >= 75 && !isCompleted && <Flame size={16} color="var(--warning)" />}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 12 }}>
                                    <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>
                                        ₹{(goal.currentAmount || 0).toLocaleString('en-IN')}
                                    </span>
                                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                        of ₹{goal.targetAmount?.toLocaleString('en-IN')}
                                    </span>
                                </div>

                                <div className="progress-bar" style={{ height: 8, marginBottom: 12 }}>
                                    <div
                                        className="progress-bar-fill"
                                        style={{
                                            width: `${progress}%`,
                                            background: isCompleted ? 'var(--success)' : progress >= 50 ? 'var(--accent)' : 'var(--info)',
                                            transition: 'width 0.5s ease',
                                        }}
                                    />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, fontSize: 13 }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>{progress.toFixed(0)}% complete</span>
                                    {goal.status === 'PAUSED' ? (
                                        <span style={{ color: 'var(--warning)', fontWeight: 600 }}>ON HOLD</span>
                                    ) : goal.daysUntilTarget > 0 ? (
                                        <span style={{ color: 'var(--text-muted)' }}>{goal.daysUntilTarget} days left</span>
                                    ) : null}
                                </div>

                                <div style={{ display: 'flex', gap: 8 }}>
                                    {!isCompleted && goal.status !== 'PAUSED' && (
                                        <button
                                            className="btn btn-primary"
                                            onClick={() => { setShowContribute(goal); setContributeAmount(''); }}
                                            style={{ flex: 1, padding: '10px 16px', fontSize: 13 }}
                                        >
                                            <Plus size={14} style={{ marginRight: 4 }} /> Add Savings
                                        </button>
                                    )}
                                    {goal.status === 'PAUSED' ? (
                                        <button
                                            className="btn btn-primary"
                                            onClick={async () => {
                                                await api.updateGoal(goal.id, { status: 'ACTIVE' });
                                                await fetchGoals();
                                            }}
                                            style={{ flex: 1, padding: '10px 16px', fontSize: 13 }}
                                        >
                                            Resume Goal
                                        </button>
                                    ) : (
                                        <button
                                            className="btn btn-outline"
                                            onClick={() => handlePause(goal.id)}
                                            style={{ padding: '10px 14px', fontSize: 13, color: 'var(--warning)', borderColor: 'rgba(255,152,0,0.3)' }}
                                            title="Put on hold"
                                        >
                                            Pause
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Add Goal Modal */}
            {showAdd && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                }} onClick={() => setShowAdd(false)}>
                    <div className="glass-card" style={{ padding: 32, width: 440, maxWidth: '90vw' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <h3 style={{ margin: 0 }}>🎯 New Savings Goal</h3>
                            <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div>
                                <label style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 2, display: 'block', marginBottom: 6 }}>GOAL NAME</label>
                                <input className="input" placeholder="e.g., Emergency Fund, Dream Home" value={newGoal.name}
                                    onChange={e => setNewGoal({ ...newGoal, name: e.target.value })}
                                    style={{ width: '100%', boxSizing: 'border-box' }} />
                            </div>
                            <div>
                                <label style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 2, display: 'block', marginBottom: 6 }}>TARGET AMOUNT (₹)</label>
                                <input className="input" type="number" placeholder="100000" value={newGoal.targetAmount}
                                    onChange={e => setNewGoal({ ...newGoal, targetAmount: e.target.value })}
                                    style={{ width: '100%', boxSizing: 'border-box' }} />
                            </div>
                            <div>
                                <label style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 2, display: 'block', marginBottom: 6 }}>TARGET DATE (OPTIONAL)</label>
                                <input className="input" type="date" value={newGoal.targetDate}
                                    onChange={e => setNewGoal({ ...newGoal, targetDate: e.target.value })}
                                    style={{ width: '100%', boxSizing: 'border-box' }} />
                            </div>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                                <button className="btn btn-outline" onClick={() => setShowAdd(false)}>Cancel</button>
                                <button className="btn btn-primary" onClick={handleAdd} disabled={saving || !newGoal.name || !newGoal.targetAmount}>
                                    {saving ? 'Creating...' : 'Create Goal'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Contribute Modal */}
            {showContribute && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                }} onClick={() => setShowContribute(null)}>
                    <div className="glass-card" style={{ padding: 32, width: 400, maxWidth: '90vw' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <h3 style={{ margin: 0 }}>💰 Add to "{showContribute.name}"</h3>
                            <button onClick={() => setShowContribute(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <div>
                            <label style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 2, display: 'block', marginBottom: 6 }}>AMOUNT (₹)</label>
                            <input className="input" type="number" placeholder="1000" value={contributeAmount}
                                onChange={e => setContributeAmount(e.target.value)}
                                style={{ width: '100%', boxSizing: 'border-box', marginBottom: 12 }} autoFocus />
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
                                Remaining: ₹{((showContribute.targetAmount || 0) - (showContribute.currentAmount || 0)).toLocaleString('en-IN')}
                            </p>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                <button className="btn btn-outline" onClick={() => setShowContribute(null)}>Cancel</button>
                                <button className="btn btn-primary" onClick={handleContribute} disabled={saving || !contributeAmount}>
                                    {saving ? 'Adding...' : 'Add Savings'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
