import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import {
    BookOpen, Clock, CheckCircle, ChevronRight, Star, GraduationCap, Shield,
    TrendingUp, Wallet, Lock, Trophy, ArrowLeft, Brain, Award, BarChart3, Zap
} from 'lucide-react';

const CATEGORY_ICONS = {
    Basics: Wallet, Loans: Shield, Credit: Star, Investment: TrendingUp,
    Budgeting: GraduationCap, Savings: Lock, Tax: Shield, Security: Lock,
};
const CATEGORY_COLORS = {
    Basics: '#4CAF50', Loans: '#2196F3', Credit: '#FF9800', Investment: '#9C27B0',
    Budgeting: '#00BCD4', Savings: '#E91E63', Tax: '#607D8B', Security: '#F44336',
};

function ProgressBar({ value, max = 100, color = 'var(--accent)', height = 8 }) {
    const pct = max > 0 ? Math.round((value / max) * 100) : 0;
    return (
        <div style={{ background: 'var(--bg-secondary)', borderRadius: height, height, width: '100%', overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: height, transition: 'width 0.5s ease' }} />
        </div>
    );
}

/* ─── Quiz Component ─── */
function QuizSection({ lessonId, onComplete }) {
    const [quizzes, setQuizzes] = useState([]);
    const [current, setCurrent] = useState(0);
    const [selected, setSelected] = useState(null);
    const [result, setResult] = useState(null);
    const [score, setScore] = useState({ correct: 0, total: 0 });
    const [finished, setFinished] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getLessonQuizzes(lessonId)
            .then(data => { setQuizzes(data.quizzes || []); setLoading(false); })
            .catch(() => setLoading(false));
    }, [lessonId]);

    const handleSubmit = async () => {
        if (selected === null) return;
        try {
            const res = await api.submitQuizAttempt(quizzes[current].id, selected);
            setResult(res);
            setScore(prev => ({
                correct: prev.correct + (res.correct ? 1 : 0),
                total: prev.total + 1,
            }));
        } catch { setResult({ correct: false, explanation: 'Failed to submit' }); }
    };

    const handleNext = () => {
        if (current + 1 >= quizzes.length) {
            setFinished(true);
            onComplete?.(score.correct, score.total);
        } else {
            setCurrent(c => c + 1);
            setSelected(null);
            setResult(null);
        }
    };

    if (loading) return <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Loading quiz...</div>;
    if (!quizzes.length) return <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>No quizzes available for this lesson.</div>;

    if (finished) {
        const pct = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;
        return (
            <div className="glass-card" style={{ padding: 24, textAlign: 'center' }}>
                <Trophy size={48} color={pct >= 70 ? '#4CAF50' : '#FF9800'} style={{ marginBottom: 12 }} />
                <h3 style={{ marginBottom: 8 }}>Quiz Complete!</h3>
                <p style={{ fontSize: 24, fontWeight: 700, color: pct >= 70 ? '#4CAF50' : '#FF9800' }}>
                    {score.correct} / {score.total} ({pct}%)
                </p>
                <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
                    {pct >= 70 ? 'Great job! You passed!' : 'Keep learning and try again!'}
                </p>
            </div>
        );
    }

    const q = quizzes[current];
    return (
        <div className="glass-card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>
                    <Brain size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    Question {current + 1} of {quizzes.length}
                </span>
                <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>
                    Score: {score.correct}/{score.total}
                </span>
            </div>
            <ProgressBar value={current + 1} max={quizzes.length} height={4} />
            <p style={{ fontSize: 16, fontWeight: 600, margin: '16px 0' }}>{q.question}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {q.options?.map((opt, i) => {
                    let bg = 'var(--card-bg)';
                    let border = 'var(--card-border)';
                    if (result) {
                        if (i === result.correctIndex) { bg = 'rgba(76,175,80,0.15)'; border = '#4CAF50'; }
                        else if (i === selected && !result.correct) { bg = 'rgba(244,67,54,0.15)'; border = '#F44336'; }
                    } else if (i === selected) { bg = 'rgba(0,200,83,0.1)'; border = 'var(--accent)'; }
                    return (
                        <button
                            key={i}
                            onClick={() => !result && setSelected(i)}
                            disabled={!!result}
                            style={{
                                padding: '12px 16px', borderRadius: 10, border: `2px solid ${border}`,
                                background: bg, cursor: result ? 'default' : 'pointer',
                                textAlign: 'left', fontSize: 14, transition: 'all 0.2s',
                            }}
                        >
                            <span style={{ fontWeight: 600, marginRight: 8 }}>{String.fromCharCode(65 + i)}.</span> {opt}
                        </button>
                    );
                })}
            </div>
            {result && result.explanation && (
                <div style={{
                    marginTop: 12, padding: 12, borderRadius: 8,
                    background: result.correct ? 'rgba(76,175,80,0.1)' : 'rgba(255,152,0,0.1)',
                    fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5,
                }}>
                    <strong>{result.correct ? '✓ Correct!' : '✗ Incorrect.'}</strong> {result.explanation}
                </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, gap: 8 }}>
                {!result ? (
                    <button onClick={handleSubmit} disabled={selected === null}
                        style={{
                            padding: '10px 24px', borderRadius: 8, border: 'none', cursor: selected !== null ? 'pointer' : 'default',
                            background: selected !== null ? 'var(--accent)' : 'var(--bg-secondary)',
                            color: selected !== null ? '#000' : 'var(--text-muted)', fontWeight: 600,
                        }}>
                        Submit Answer
                    </button>
                ) : (
                    <button onClick={handleNext}
                        style={{
                            padding: '10px 24px', borderRadius: 8, border: 'none', cursor: 'pointer',
                            background: 'var(--accent)', color: '#000', fontWeight: 600,
                        }}>
                        {current + 1 >= quizzes.length ? 'Finish Quiz' : 'Next Question →'}
                    </button>
                )}
            </div>
        </div>
    );
}

/* ─── Lesson Detail View ─── */
function LessonDetail({ lesson, onBack }) {
    const [showQuiz, setShowQuiz] = useState(false);
    const [completed, setCompleted] = useState(false);
    const color = CATEGORY_COLORS[lesson.category] || 'var(--accent)';

    const handleQuizComplete = async () => {
        try {
            await api.completeLesson(lesson.id);
            setCompleted(true);
        } catch { /* ignore */ }
    };

    return (
        <div>
            <button onClick={onBack} style={{
                display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
                color: 'var(--accent)', cursor: 'pointer', marginBottom: 16, fontWeight: 600, fontSize: 14,
            }}>
                <ArrowLeft size={16} /> Back to Lessons
            </button>

            <div className="glass-card" style={{ padding: 24, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{ padding: '4px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: `${color}22`, color }}>{lesson.category}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}><Clock size={12} style={{ verticalAlign: 'middle' }} /> {lesson.duration}</span>
                    <span style={{
                        fontSize: 11, padding: '2px 8px', borderRadius: 6,
                        background: lesson.difficulty === 'Beginner' ? 'rgba(76,175,80,0.15)' : 'rgba(255,152,0,0.15)',
                        color: lesson.difficulty === 'Beginner' ? '#4CAF50' : '#FF9800',
                    }}>{lesson.difficulty}</span>
                    {completed && <span style={{ color: '#4CAF50', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600 }}><CheckCircle size={14} /> Completed</span>}
                </div>
                <h2 style={{ marginBottom: 8 }}>{lesson.title}</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>{lesson.description}</p>
                <div style={{
                    padding: 16, borderRadius: 10, background: 'var(--bg-secondary)',
                    fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-wrap', color: 'var(--text-primary)',
                }}>
                    {lesson.content}
                </div>
            </div>

            {!showQuiz ? (
                <button onClick={() => setShowQuiz(true)} style={{
                    padding: '12px 28px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: 'var(--accent)', color: '#000', fontWeight: 700, fontSize: 15,
                    display: 'flex', alignItems: 'center', gap: 8,
                }}>
                    <Brain size={18} /> Take Quiz
                </button>
            ) : (
                <QuizSection lessonId={lesson.id} onComplete={handleQuizComplete} />
            )}
        </div>
    );
}

/* ─── Main Learn Page ─── */
export default function LearnPage() {
    const [lessons, setLessons] = useState([]);
    const [activeCategory, setActiveCategory] = useState('All');
    const [selectedLesson, setSelectedLesson] = useState(null);
    const [progress, setProgress] = useState(null);
    const [leaderboard, setLeaderboard] = useState([]);
    const [tab, setTab] = useState('lessons'); // lessons | progress | leaderboard

    const loadData = useCallback(() => {
        api.getLessons?.().then(data => setLessons(data.lessons || [])).catch(() => {});
        api.getLearningProgress?.().then(data => setProgress(data)).catch(() => {});
        api.getLeaderboard?.().then(data => setLeaderboard(data.leaderboard || [])).catch(() => {});
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    if (selectedLesson) {
        return <LessonDetail lesson={selectedLesson} onBack={() => { setSelectedLesson(null); loadData(); }} />;
    }

    const categories = ['All', ...new Set(lessons.map(l => l.category))];
    const filtered = activeCategory === 'All' ? lessons : lessons.filter(l => l.category === activeCategory);

    return (
        <div>
            <header className="page-header">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <GraduationCap size={22} color="var(--accent)" /> Financial Literacy
                </h2>
                <p>Learn essential money skills in bite-sized lessons</p>
            </header>

            {/* Progress summary cards */}
            {progress && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
                    <div className="glass-card" style={{ padding: 16, textAlign: 'center' }}>
                        <BookOpen size={20} color="var(--accent)" />
                        <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{progress.completedLessons || 0}/{progress.totalLessons || 0}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Lessons Done</div>
                        <ProgressBar value={progress.completedLessons || 0} max={progress.totalLessons || 1} height={4} />
                    </div>
                    <div className="glass-card" style={{ padding: 16, textAlign: 'center' }}>
                        <Brain size={20} color="#9C27B0" />
                        <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{progress.avgQuizScore || 0}%</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Avg Quiz Score</div>
                    </div>
                    <div className="glass-card" style={{ padding: 16, textAlign: 'center' }}>
                        <Zap size={20} color="#FF9800" />
                        <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{progress.totalPoints || 0}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Points Earned</div>
                    </div>
                    <div className="glass-card" style={{ padding: 16, textAlign: 'center' }}>
                        <Award size={20} color="#E91E63" />
                        <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{Math.round(progress.completionPercentage || 0)}%</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Completion</div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--card-bg)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
                {[{ key: 'lessons', icon: BookOpen, label: 'Lessons' }, { key: 'progress', icon: BarChart3, label: 'My Progress' }, { key: 'leaderboard', icon: Trophy, label: 'Leaderboard' }].map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)} style={{
                        padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                        background: tab === t.key ? 'var(--accent)' : 'transparent',
                        color: tab === t.key ? '#000' : 'var(--text-secondary)',
                        fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                        <t.icon size={14} /> {t.label}
                    </button>
                ))}
            </div>

            {/* Lessons tab */}
            {tab === 'lessons' && (
                <>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
                        {categories.map(cat => (
                            <button key={cat} onClick={() => setActiveCategory(cat)} style={{
                                padding: '8px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
                                background: activeCategory === cat ? 'var(--accent)' : 'var(--card-bg)',
                                color: activeCategory === cat ? '#000' : 'var(--text-secondary)',
                                fontWeight: 600, fontSize: 13,
                                borderWidth: 1, borderStyle: 'solid',
                                borderColor: activeCategory === cat ? 'var(--accent)' : 'var(--card-border)',
                            }}>
                                {cat}
                            </button>
                        ))}
                    </div>

                    {filtered.length === 0 ? (
                        <div className="glass-card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                            <GraduationCap size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
                            <p>No lessons available yet.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                            {filtered.map(lesson => {
                                const Icon = CATEGORY_ICONS[lesson.category] || BookOpen;
                                const color = CATEGORY_COLORS[lesson.category] || 'var(--accent)';
                                return (
                                    <div key={lesson.id} className="glass-card"
                                        style={{ padding: 20, cursor: 'pointer', transition: 'transform 0.2s' }}
                                        onClick={() => setSelectedLesson(lesson)}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'start', gap: 12 }}>
                                            <div style={{ padding: 10, borderRadius: 12, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Icon size={20} color={color} />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{lesson.title}</div>
                                                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{lesson.description}</div>
                                            </div>
                                            <ChevronRight size={18} color="var(--text-muted)" />
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
                                            <span style={{ padding: '3px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, background: `${color}22`, color }}>{lesson.category}</span>
                                            <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> {lesson.duration}</span>
                                            <span style={{
                                                fontSize: 11, padding: '2px 8px', borderRadius: 6,
                                                background: lesson.difficulty === 'Beginner' ? 'rgba(76,175,80,0.15)' : 'rgba(255,152,0,0.15)',
                                                color: lesson.difficulty === 'Beginner' ? '#4CAF50' : '#FF9800',
                                            }}>{lesson.difficulty}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* Progress tab */}
            {tab === 'progress' && progress && (
                <div>
                    <h3 style={{ marginBottom: 16 }}>Category Progress</h3>
                    {progress.categoryBreakdown?.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {progress.categoryBreakdown.map(cat => (
                                <div key={cat.category} className="glass-card" style={{ padding: 16 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                                            {React.createElement(CATEGORY_ICONS[cat.category] || BookOpen, { size: 16, color: CATEGORY_COLORS[cat.category] || 'var(--accent)' })}
                                            {cat.category}
                                        </span>
                                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{cat.completed}/{cat.total} lessons</span>
                                    </div>
                                    <ProgressBar value={cat.completed} max={cat.total} color={CATEGORY_COLORS[cat.category] || 'var(--accent)'} height={6} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="glass-card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
                            Start completing lessons to see your progress!
                        </div>
                    )}
                </div>
            )}

            {/* Leaderboard tab */}
            {tab === 'leaderboard' && (
                <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--card-border)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Trophy size={18} color="#FF9800" /> Top Learners
                    </div>
                    {leaderboard.length === 0 ? (
                        <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>No data yet</div>
                    ) : (
                        leaderboard.map((u, i) => (
                            <div key={u.userId} style={{
                                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px',
                                borderBottom: i < leaderboard.length - 1 ? '1px solid var(--card-border)' : 'none',
                                background: i < 3 ? 'rgba(255,152,0,0.04)' : 'transparent',
                            }}>
                                <span style={{
                                    width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 700, fontSize: 13,
                                    background: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : 'var(--bg-secondary)',
                                    color: i < 3 ? '#000' : 'var(--text-secondary)',
                                }}>{i + 1}</span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, fontSize: 14 }}>{u.name || 'Learner'}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.lessonsCompleted} lessons · Avg {u.avgScore}%</div>
                                </div>
                                <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{u.totalPoints} pts</span>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
