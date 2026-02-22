import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import {
    BookOpen, Clock, CheckCircle, ChevronRight, Star, GraduationCap, Shield,
    TrendingUp, Wallet, Lock, Trophy, ArrowLeft, Brain, Award, BarChart3, Zap,
    Sparkles, RefreshCw, Lightbulb, Target, AlertTriangle, CreditCard,
    PiggyBank, Landmark, Smartphone, ChevronDown, Loader2
} from 'lucide-react';

/* ─── Constants ─── */
const CATEGORY_ICONS = {
    Basics: Wallet, Loans: Landmark, Credit: CreditCard, Investment: TrendingUp,
    Budgeting: Target, Savings: PiggyBank, Tax: Shield, Security: Lock,
    'Digital Payments': Smartphone, Insurance: Shield,
};
const CATEGORY_COLORS = {
    Basics: '#4CAF50', Loans: '#2196F3', Credit: '#FF9800', Investment: '#9C27B0',
    Budgeting: '#00BCD4', Savings: '#E91E63', Tax: '#607D8B', Security: '#F44336',
    'Digital Payments': '#3F51B5', Insurance: '#795548',
};

const DEFAULT_TOPICS = [
    { id: 't1', title: 'What is Inflation?', description: 'Understanding how prices increase over time and how it affects your savings.', category: 'Basics', difficulty: 'Beginner', duration: '3 min', icon: '🎈' },
    { id: 't2', title: 'How Does EMI Work?', description: 'Learn how Equated Monthly Installments break down your loan payments.', category: 'Loans', difficulty: 'Beginner', duration: '3 min', icon: '💳' },
    { id: 't3', title: 'Understanding CIBIL Score', description: 'Your credit score impacts your ability to get loans. Learn how it works.', category: 'Credit', difficulty: 'Beginner', duration: '4 min', icon: '📊' },
    { id: 't4', title: 'SIP vs Lump Sum Investment', description: 'Which investment strategy works better for you?', category: 'Investment', difficulty: 'Intermediate', duration: '3 min', icon: '📈' },
    { id: 't5', title: 'The 50/30/20 Budget Rule', description: 'A simple budgeting framework that works for every income level.', category: 'Budgeting', difficulty: 'Beginner', duration: '2 min', icon: '📒' },
    { id: 't6', title: 'Emergency Fund 101', description: 'Why you need 3-6 months of expenses saved and how to build it.', category: 'Savings', difficulty: 'Beginner', duration: '3 min', icon: '🏦' },
    { id: 't7', title: 'Tax Saving Under Section 80C', description: 'Save up to ₹1.5 lakh on taxes with these investment options.', category: 'Tax', difficulty: 'Intermediate', duration: '4 min', icon: '🧾' },
    { id: 't8', title: 'UPI Fraud Prevention', description: 'Protect yourself from common UPI scams and frauds.', category: 'Security', difficulty: 'Beginner', duration: '3 min', icon: '🛡️' },
];

/* ─── Shared Components ─── */
function ProgressBar({ value, max = 100, color = 'var(--accent)', height = 8 }) {
    const pct = max > 0 ? Math.round((value / max) * 100) : 0;
    return (
        <div style={{ background: 'var(--bg-secondary)', borderRadius: height, height, width: '100%', overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: height, transition: 'width 0.6s ease' }} />
        </div>
    );
}

function LoadingSpinner({ text = 'Loading...' }) {
    return (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
            <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
            <p style={{ fontSize: 14 }}>{text}</p>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}

/* ─── Markdown Renderer ─── */
function MarkdownContent({ content }) {
    if (!content) return null;

    const formatInlineText = (text) => {
        const parts = [];
        let remaining = text;
        let key = 0;

        while (remaining.length > 0) {
            const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
            if (boldMatch && boldMatch.index !== undefined) {
                if (boldMatch.index > 0) {
                    parts.push(<span key={key++}>{remaining.slice(0, boldMatch.index)}</span>);
                }
                parts.push(
                    <strong key={key++} style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                        {boldMatch[1]}
                    </strong>
                );
                remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
                continue;
            }

            const codeMatch = remaining.match(/`(.+?)`/);
            if (codeMatch && codeMatch.index !== undefined) {
                if (codeMatch.index > 0) {
                    parts.push(<span key={key++}>{remaining.slice(0, codeMatch.index)}</span>);
                }
                parts.push(
                    <code key={key++} style={{
                        padding: '2px 6px', borderRadius: 4, background: 'rgba(186,143,13,0.15)',
                        color: 'var(--accent-light)', fontSize: 13, fontFamily: 'monospace',
                    }}>
                        {codeMatch[1]}
                    </code>
                );
                remaining = remaining.slice(codeMatch.index + codeMatch[0].length);
                continue;
            }

            parts.push(<span key={key++}>{remaining}</span>);
            break;
        }

        return parts.length > 0 ? parts : text;
    };

    const renderMarkdown = (md) => {
        const lines = md.split('\n');
        const elements = [];
        let i = 0;
        let tableRows = [];
        let inTable = false;

        while (i < lines.length) {
            const line = lines[i];

            // Table detection
            if (line.includes('|') && line.trim().startsWith('|')) {
                if (!inTable) {
                    inTable = true;
                    tableRows = [];
                }
                if (!/^\|[\s-|]+\|$/.test(line.trim())) {
                    const cells = line.split('|').filter(c => c.trim() !== '');
                    tableRows.push(cells.map(c => c.trim()));
                }
                i++;
                if (i >= lines.length || !lines[i].includes('|') || !lines[i].trim().startsWith('|')) {
                    inTable = false;
                    if (tableRows.length > 0) {
                        const headerRow = tableRows[0];
                        const bodyRows = tableRows.slice(1);
                        elements.push(
                            <div key={`table-${i}`} style={{ overflowX: 'auto', marginBottom: 16 }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                    <thead>
                                        <tr>
                                            {headerRow.map((h, hi) => (
                                                <th key={hi} style={{
                                                    padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid var(--accent)',
                                                    color: 'var(--accent)', fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap',
                                                }}>{formatInlineText(h)}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {bodyRows.map((row, ri) => (
                                            <tr key={ri} style={{ borderBottom: '1px solid var(--divider)' }}>
                                                {row.map((cell, ci) => (
                                                    <td key={ci} style={{ padding: '8px 12px', fontSize: 13, color: 'var(--text-secondary)' }}>
                                                        {formatInlineText(cell)}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        );
                    }
                }
                continue;
            }

            // H2
            if (line.startsWith('## ')) {
                elements.push(
                    <h2 key={i} style={{
                        fontSize: 20, fontWeight: 800, color: 'var(--text-primary)',
                        marginTop: i === 0 ? 0 : 28, marginBottom: 12,
                        display: 'flex', alignItems: 'center', gap: 8,
                        paddingBottom: 8, borderBottom: '2px solid var(--divider)',
                    }}>
                        {formatInlineText(line.slice(3))}
                    </h2>
                );
                i++; continue;
            }

            // H3
            if (line.startsWith('### ')) {
                elements.push(
                    <h3 key={i} style={{
                        fontSize: 16, fontWeight: 700, color: 'var(--accent-light)',
                        marginTop: 20, marginBottom: 8,
                    }}>
                        {formatInlineText(line.slice(4))}
                    </h3>
                );
                i++; continue;
            }

            // H1 (rendered as H2 style)
            if (line.startsWith('# ') && !line.startsWith('## ')) {
                elements.push(
                    <h2 key={i} style={{
                        fontSize: 22, fontWeight: 800, color: 'var(--text-primary)',
                        marginTop: i === 0 ? 0 : 24, marginBottom: 12,
                        paddingBottom: 8, borderBottom: '2px solid var(--accent)',
                    }}>
                        {formatInlineText(line.slice(2))}
                    </h2>
                );
                i++; continue;
            }

            // Numbered list
            if (/^\d+\.\s/.test(line.trim())) {
                const listItems = [];
                while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
                    listItems.push(lines[i].trim().replace(/^\d+\.\s/, ''));
                    i++;
                }
                elements.push(
                    <ol key={`ol-${i}`} style={{ paddingLeft: 0, marginBottom: 12, listStyle: 'none' }}>
                        {listItems.map((item, idx) => (
                            <li key={idx} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
                                <span style={{
                                    minWidth: 24, height: 24, borderRadius: '50%', background: 'var(--accent)',
                                    color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 700, fontSize: 12, flexShrink: 0, marginTop: 1,
                                }}>{idx + 1}</span>
                                <span style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                                    {formatInlineText(item)}
                                </span>
                            </li>
                        ))}
                    </ol>
                );
                continue;
            }

            // Unordered list
            if (/^[-*]\s/.test(line.trim())) {
                const listItems = [];
                while (i < lines.length && /^[-*]\s/.test(lines[i].trim())) {
                    listItems.push(lines[i].trim().replace(/^[-*]\s/, ''));
                    i++;
                }
                elements.push(
                    <ul key={`ul-${i}`} style={{ paddingLeft: 0, marginBottom: 12, listStyle: 'none' }}>
                        {listItems.map((item, idx) => {
                            // Check for emoji bullet (✅ ❌ etc.)
                            const hasEmoji = /^[✅❌✓✗🔒🔑📵🚫📱🏥💼🔧🏠]/.test(item);
                            return (
                                <li key={idx} style={{ display: 'flex', gap: 10, marginBottom: 6, alignItems: 'flex-start' }}>
                                    {!hasEmoji && (
                                        <span style={{
                                            minWidth: 6, height: 6, borderRadius: '50%', background: 'var(--accent)',
                                            flexShrink: 0, marginTop: 7,
                                        }} />
                                    )}
                                    <span style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                                        {formatInlineText(item)}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                );
                continue;
            }

            // Empty line
            if (line.trim() === '') { i++; continue; }

            // Paragraph
            elements.push(
                <p key={i} style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--text-secondary)', marginBottom: 10 }}>
                    {formatInlineText(line)}
                </p>
            );
            i++;
        }

        return elements;
    };

    return <div style={{ padding: '4px 0' }}>{renderMarkdown(content)}</div>;
}

/* ─── Quiz Component ─── */
function QuizSection({ lessonId, quizzes: initialQuizzes, onComplete }) {
    const [quizzes, setQuizzes] = useState(initialQuizzes || []);
    const [current, setCurrent] = useState(0);
    const [selected, setSelected] = useState(null);
    const [result, setResult] = useState(null);
    const [score, setScore] = useState({ correct: 0, total: 0 });
    const [finished, setFinished] = useState(false);
    const [loading, setLoading] = useState(!initialQuizzes?.length);

    useEffect(() => {
        if (!initialQuizzes?.length && lessonId) {
            api.getLessonQuizzes(lessonId)
                .then(data => { setQuizzes(data.quizzes || []); setLoading(false); })
                .catch(() => setLoading(false));
        }
    }, [lessonId, initialQuizzes]);

    const handleSubmit = async () => {
        if (selected === null) return;
        try {
            const res = await api.submitQuizAttempt(quizzes[current].id, selected);
            setResult({ correct: res.isCorrect, correctIndex: res.correctIndex, explanation: res.explanation });
            setScore(prev => ({
                correct: prev.correct + (res.isCorrect ? 1 : 0),
                total: prev.total + 1,
            }));
        } catch {
            setResult({ correct: false, explanation: 'Could not verify — try again later.' });
            setScore(prev => ({ ...prev, total: prev.total + 1 }));
        }
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

    if (loading) return <LoadingSpinner text="Loading quiz questions..." />;
    if (!quizzes.length) return (
        <div className="glass-card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
            <Brain size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
            <p>No quiz available for this lesson yet.</p>
        </div>
    );

    if (finished) {
        const pct = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;
        const passed = pct >= 70;
        return (
            <div className="glass-card" style={{ padding: 32, textAlign: 'center' }}>
                <div style={{
                    width: 80, height: 80, borderRadius: '50%', margin: '0 auto 16px',
                    background: passed ? 'rgba(76,175,80,0.15)' : 'rgba(255,152,0,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <Trophy size={40} color={passed ? '#4CAF50' : '#FF9800'} />
                </div>
                <h3 style={{ marginBottom: 4, fontSize: 20 }}>Quiz Complete!</h3>
                <div style={{
                    fontSize: 36, fontWeight: 800, margin: '8px 0',
                    color: passed ? '#4CAF50' : '#FF9800',
                }}>
                    {score.correct}/{score.total}
                </div>
                <div style={{
                    display: 'inline-block', padding: '6px 20px', borderRadius: 20,
                    background: passed ? 'rgba(76,175,80,0.15)' : 'rgba(255,152,0,0.15)',
                    color: passed ? '#4CAF50' : '#FF9800', fontWeight: 700, fontSize: 14, marginBottom: 8,
                }}>
                    {pct}% Score
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 8 }}>
                    {passed
                        ? '🎉 Great job! You\'ve mastered this topic!'
                        : '💪 Good effort! Review the lesson and try again to improve.'}
                </p>
                {passed && (
                    <div style={{ marginTop: 12, padding: '8px 16px', borderRadius: 8, background: 'rgba(76,175,80,0.1)', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#4CAF50' }}>
                        <Award size={14} /> +15 points earned!
                    </div>
                )}
            </div>
        );
    }

    const q = quizzes[current];
    const opts = Array.isArray(q.options) ? q.options : [];

    return (
        <div className="glass-card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Brain size={16} color="var(--accent)" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>
                        Question {current + 1} of {quizzes.length}
                    </span>
                </div>
                <div style={{
                    padding: '4px 12px', borderRadius: 12, fontSize: 12, fontWeight: 700,
                    background: 'rgba(186,143,13,0.1)', color: 'var(--accent)',
                }}>
                    Score: {score.correct}/{score.total}
                </div>
            </div>

            <ProgressBar value={current + 1} max={quizzes.length} height={4} />

            <p style={{ fontSize: 16, fontWeight: 700, margin: '20px 0 16px', lineHeight: 1.5, color: 'var(--text-primary)' }}>
                {q.question}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {opts.map((opt, i) => {
                    let bg = 'var(--card-bg)';
                    let border = 'var(--card-border)';
                    let glow = 'none';

                    if (result) {
                        if (i === result.correctIndex) {
                            bg = 'rgba(76,175,80,0.12)'; border = '#4CAF50'; glow = '0 0 12px rgba(76,175,80,0.2)';
                        } else if (i === selected && !result.correct) {
                            bg = 'rgba(244,67,54,0.12)'; border = '#F44336';
                        }
                    } else if (i === selected) {
                        bg = 'rgba(186,143,13,0.1)'; border = 'var(--accent)'; glow = '0 0 12px rgba(186,143,13,0.15)';
                    }

                    return (
                        <button
                            key={i}
                            onClick={() => !result && setSelected(i)}
                            disabled={!!result}
                            style={{
                                padding: '14px 16px', borderRadius: 12, border: `2px solid ${border}`,
                                background: bg, cursor: result ? 'default' : 'pointer',
                                textAlign: 'left', fontSize: 14, transition: 'all 0.2s',
                                boxShadow: glow, display: 'flex', alignItems: 'center', gap: 12,
                                color: 'var(--text-primary)',
                            }}
                        >
                            <span style={{
                                width: 28, height: 28, borderRadius: '50%', display: 'flex',
                                alignItems: 'center', justifyContent: 'center', fontWeight: 700,
                                fontSize: 13, flexShrink: 0,
                                background: i === selected && !result ? 'var(--accent)' : 'var(--bg-secondary)',
                                color: i === selected && !result ? '#000' : 'var(--text-secondary)',
                                border: `1px solid ${i === selected && !result ? 'var(--accent)' : 'var(--card-border)'}`,
                            }}>
                                {String.fromCharCode(65 + i)}
                            </span>
                            <span style={{ flex: 1, lineHeight: 1.4 }}>{opt}</span>
                            {result && i === result.correctIndex && <CheckCircle size={18} color="#4CAF50" />}
                            {result && i === selected && !result.correct && <AlertTriangle size={18} color="#F44336" />}
                        </button>
                    );
                })}
            </div>

            {result && result.explanation && (
                <div style={{
                    marginTop: 16, padding: 16, borderRadius: 12,
                    background: result.correct ? 'rgba(76,175,80,0.08)' : 'rgba(255,152,0,0.08)',
                    borderLeft: `3px solid ${result.correct ? '#4CAF50' : '#FF9800'}`,
                    fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6,
                }}>
                    <div style={{ fontWeight: 700, marginBottom: 4, color: result.correct ? '#4CAF50' : '#FF9800' }}>
                        {result.correct ? '✓ Correct!' : '✗ Not quite right'}
                    </div>
                    {result.explanation}
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20, gap: 8 }}>
                {!result ? (
                    <button onClick={handleSubmit} disabled={selected === null}
                        style={{
                            padding: '12px 28px', borderRadius: 10, border: 'none',
                            cursor: selected !== null ? 'pointer' : 'default',
                            background: selected !== null ? 'var(--accent)' : 'var(--bg-secondary)',
                            color: selected !== null ? '#000' : 'var(--text-muted)',
                            fontWeight: 700, fontSize: 14, transition: 'all 0.2s',
                        }}>
                        Submit Answer
                    </button>
                ) : (
                    <button onClick={handleNext}
                        style={{
                            padding: '12px 28px', borderRadius: 10, border: 'none', cursor: 'pointer',
                            background: 'var(--accent)', color: '#000', fontWeight: 700, fontSize: 14,
                            display: 'flex', alignItems: 'center', gap: 6,
                        }}>
                        {current + 1 >= quizzes.length ? '🏆 Finish Quiz' : 'Next Question →'}
                    </button>
                )}
            </div>
        </div>
    );
}

/* ─── Lesson Detail View ─── */
function LessonDetail({ lesson, quizzes: initialQuizzes, onBack }) {
    const [showQuiz, setShowQuiz] = useState(false);
    const [completed, setCompleted] = useState(false);
    const color = CATEGORY_COLORS[lesson.category] || 'var(--accent)';

    const handleQuizComplete = async (correct, total) => {
        if (total > 0 && correct / total >= 0.7) {
            try {
                await api.completeLesson(lesson.id);
                setCompleted(true);
            } catch { /* ignore */ }
        }
    };

    return (
        <div>
            <button onClick={onBack} style={{
                display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
                color: 'var(--accent)', cursor: 'pointer', marginBottom: 16, fontWeight: 600, fontSize: 14, padding: 0,
            }}>
                <ArrowLeft size={16} /> Back to Lessons
            </button>

            {/* Header */}
            <div className="glass-card" style={{ padding: 24, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                    <span style={{ padding: '5px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: `${color}22`, color }}>
                        {lesson.category}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} /> {lesson.duration || lesson.estimatedDuration || '3 min'}
                    </span>
                    <span style={{
                        fontSize: 11, padding: '3px 10px', borderRadius: 6, fontWeight: 600,
                        background: (lesson.difficulty === 'Beginner' || lesson.difficulty === 'BEGINNER')
                            ? 'rgba(76,175,80,0.15)' : 'rgba(255,152,0,0.15)',
                        color: (lesson.difficulty === 'Beginner' || lesson.difficulty === 'BEGINNER')
                            ? '#4CAF50' : '#FF9800',
                    }}>
                        {lesson.difficulty}
                    </span>
                    {completed && (
                        <span style={{
                            color: '#4CAF50', display: 'flex', alignItems: 'center', gap: 4,
                            fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 6,
                            background: 'rgba(76,175,80,0.1)',
                        }}>
                            <CheckCircle size={14} /> Completed
                        </span>
                    )}
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>{lesson.title}</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.5 }}>{lesson.description}</p>
            </div>

            {/* Content */}
            <div className="glass-card" style={{ padding: 24, marginBottom: 16 }}>
                <MarkdownContent content={lesson.content} />
            </div>

            {/* Quiz */}
            {!showQuiz ? (
                <button onClick={() => setShowQuiz(true)} style={{
                    width: '100%', padding: '16px 28px', borderRadius: 12, border: '2px solid var(--accent)',
                    cursor: 'pointer', background: 'rgba(186,143,13,0.08)', color: 'var(--accent)',
                    fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: 10, transition: 'all 0.2s',
                }}>
                    <Brain size={20} /> Test Your Knowledge — Take the Quiz!
                </button>
            ) : (
                <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Brain size={18} color="var(--accent)" /> Quiz Time
                    </h3>
                    <QuizSection lessonId={lesson.id} quizzes={initialQuizzes} onComplete={handleQuizComplete} />
                </div>
            )}
        </div>
    );
}

/* ─── Topic Card ─── */
function TopicCard({ topic, onSelect, isGenerating }) {
    const Icon = CATEGORY_ICONS[topic.category] || BookOpen;
    const color = CATEGORY_COLORS[topic.category] || 'var(--accent)';

    return (
        <div className="glass-card"
            onClick={() => !isGenerating && onSelect(topic)}
            style={{ padding: 20, cursor: isGenerating ? 'wait' : 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', opacity: isGenerating ? 0.7 : 1 }}
            onMouseEnter={e => { if (!isGenerating) e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
        >
            <div style={{ display: 'flex', alignItems: 'start', gap: 12 }}>
                <div style={{
                    padding: 10, borderRadius: 12, background: `${color}15`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                    {isGenerating
                        ? <Loader2 size={20} color={color} style={{ animation: 'spin 1s linear infinite' }} />
                        : topic.icon
                            ? <span style={{ fontSize: 20 }}>{topic.icon}</span>
                            : <Icon size={20} color={color} />
                    }
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: 'var(--text-primary)' }}>{topic.title}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{topic.description}</div>
                </div>
                <ChevronRight size={18} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 2 }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
                <span style={{ padding: '3px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, background: `${color}15`, color }}>{topic.category}</span>
                {topic.duration && (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={11} /> {topic.duration}
                    </span>
                )}
                <span style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 6, fontWeight: 600,
                    background: (topic.difficulty === 'Beginner' || topic.difficulty === 'BEGINNER')
                        ? 'rgba(76,175,80,0.12)' : 'rgba(255,152,0,0.12)',
                    color: (topic.difficulty === 'Beginner' || topic.difficulty === 'BEGINNER')
                        ? '#4CAF50' : '#FF9800',
                }}>{topic.difficulty}</span>
                {topic.hasContent && (
                    <span style={{ fontSize: 11, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 3, fontWeight: 600 }}>
                        <CheckCircle size={11} /> Ready
                    </span>
                )}
            </div>
        </div>
    );
}

/* ─── Main Learn Page ─── */
export default function LearnPage() {
    const [topics, setTopics] = useState(DEFAULT_TOPICS);
    const [activeCategory, setActiveCategory] = useState('All');
    const [selectedLesson, setSelectedLesson] = useState(null);
    const [selectedQuizzes, setSelectedQuizzes] = useState(null);
    const [progress, setProgress] = useState(null);
    const [leaderboard, setLeaderboard] = useState([]);
    const [tab, setTab] = useState('lessons');
    const [generatingTopic, setGeneratingTopic] = useState(null);
    const [suggestions, setSuggestions] = useState([]);

    const loadData = useCallback(() => {
        api.getAllLessons?.()
            .then(data => {
                const lessons = data.lessons || [];
                if (lessons.length > 0) {
                    const dbTitles = new Set(lessons.map(l => l.title.toLowerCase()));
                    const remaining = DEFAULT_TOPICS.filter(t => !dbTitles.has(t.title.toLowerCase()));
                    const mapped = lessons.map(l => ({
                        ...l,
                        duration: l.estimatedDuration || '3 min',
                        difficulty: l.difficulty === 'BEGINNER' ? 'Beginner' : l.difficulty === 'INTERMEDIATE' ? 'Intermediate' : l.difficulty,
                        hasContent: !!l.content,
                    }));
                    setTopics([...mapped, ...remaining]);
                }
            })
            .catch(() => {});

        api.getLearningProgress?.().then(data => setProgress(data)).catch(() => {});
        api.getLeaderboard?.().then(data => setLeaderboard(data.leaderboard || [])).catch(() => {});
        api.getContentSuggestions?.().then(data => setSuggestions(data.suggestions || [])).catch(() => {});
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const handleTopicSelect = async (topic) => {
        // If it has content already loaded, show directly
        if (topic.hasContent && topic.content) {
            setSelectedLesson(topic);
            setSelectedQuizzes(null);
            api.getLessonQuizzes?.(topic.id).then(data => setSelectedQuizzes(data.quizzes || [])).catch(() => {});
            return;
        }

        // Generate content on-the-fly
        setGeneratingTopic(topic.title);
        try {
            const result = await api.generateLessonForUser(
                topic.title,
                (topic.difficulty === 'Intermediate' || topic.difficulty === 'INTERMEDIATE') ? 'INTERMEDIATE' : 'BEGINNER'
            );
            if (result.success) {
                setSelectedLesson({ ...result.lesson, duration: topic.duration || '3 min', difficulty: topic.difficulty });
                setSelectedQuizzes(result.quizzes || []);
            }
        } catch (err) {
            console.error('Failed to generate lesson:', err);
        } finally {
            setGeneratingTopic(null);
        }
    };

    const handleBack = () => {
        setSelectedLesson(null);
        setSelectedQuizzes(null);
        loadData();
    };

    if (selectedLesson) {
        return <LessonDetail lesson={selectedLesson} quizzes={selectedQuizzes} onBack={handleBack} />;
    }

    const allCategories = ['All', ...new Set(topics.map(t => t.category))];
    const filtered = activeCategory === 'All' ? topics : topics.filter(t => t.category === activeCategory);

    return (
        <div>
            <header className="page-header">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <GraduationCap size={22} color="var(--accent)" /> Financial Literacy
                </h2>
                <p>Learn essential money skills in simple, bite-sized lessons</p>
            </header>

            {/* Progress Summary */}
            {progress && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
                    <div className="glass-card" style={{ padding: 16, textAlign: 'center' }}>
                        <BookOpen size={20} color="var(--accent)" />
                        <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{progress.completedLessons || 0}/{progress.totalLessons || topics.length}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Lessons Done</div>
                        <ProgressBar value={progress.completedLessons || 0} max={progress.totalLessons || topics.length} height={4} />
                    </div>
                    <div className="glass-card" style={{ padding: 16, textAlign: 'center' }}>
                        <Brain size={20} color="#9C27B0" />
                        <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{progress.averageQuizScore || 0}%</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Avg Quiz Score</div>
                    </div>
                    <div className="glass-card" style={{ padding: 16, textAlign: 'center' }}>
                        <Zap size={20} color="#FF9800" />
                        <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{progress.points || 0}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Points Earned</div>
                    </div>
                    <div className="glass-card" style={{ padding: 16, textAlign: 'center' }}>
                        <Award size={20} color="#E91E63" />
                        <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{Math.round(progress.completionPercentage || 0)}%</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Completion</div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--card-bg)', borderRadius: 10, padding: 4, width: 'fit-content', border: '1px solid var(--card-border)' }}>
                {[
                    { key: 'lessons', icon: BookOpen, label: 'Lessons' },
                    { key: 'progress', icon: BarChart3, label: 'My Progress' },
                    { key: 'leaderboard', icon: Trophy, label: 'Leaderboard' },
                ].map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)} style={{
                        padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                        background: tab === t.key ? 'var(--accent)' : 'transparent',
                        color: tab === t.key ? '#000' : 'var(--text-secondary)',
                        fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s',
                    }}>
                        <t.icon size={14} /> {t.label}
                    </button>
                ))}
            </div>

            {/* Lessons Tab */}
            {tab === 'lessons' && (
                <>
                    {/* Personalized Suggestions */}
                    {suggestions.length > 0 && (
                        <div style={{ marginBottom: 24 }}>
                            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
                                <Lightbulb size={16} color="var(--accent)" /> Recommended for You
                            </h3>
                            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
                                {suggestions.slice(0, 3).map((s, i) => {
                                    const col = CATEGORY_COLORS[s.category] || 'var(--accent)';
                                    return (
                                        <div key={i} className="glass-card"
                                            style={{ minWidth: 240, padding: 16, cursor: 'pointer', flexShrink: 0, borderTop: `3px solid ${col}` }}
                                            onClick={() => handleTopicSelect({ title: s.topic, description: s.reason, category: s.category, difficulty: s.difficulty === 'BEGINNER' ? 'Beginner' : 'Intermediate', duration: '3 min' })}
                                        >
                                            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{s.topic}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>{s.reason}</div>
                                            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: `${col}15`, color: col, fontWeight: 600 }}>{s.category}</span>
                                                <Sparkles size={12} color="var(--accent)" />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Category Filters */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                        {allCategories.map(cat => (
                            <button key={cat} onClick={() => setActiveCategory(cat)} style={{
                                padding: '8px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
                                background: activeCategory === cat ? 'var(--accent)' : 'var(--card-bg)',
                                color: activeCategory === cat ? '#000' : 'var(--text-secondary)',
                                fontWeight: 600, fontSize: 13, transition: 'all 0.2s',
                                borderWidth: 1, borderStyle: 'solid',
                                borderColor: activeCategory === cat ? 'var(--accent)' : 'var(--card-border)',
                            }}>{cat}</button>
                        ))}
                    </div>

                    {/* Generating Status */}
                    {generatingTopic && (
                        <div className="glass-card" style={{
                            padding: 32, textAlign: 'center', marginBottom: 16,
                            background: 'rgba(186,143,13,0.05)', border: '1px solid var(--accent)',
                        }}>
                            <Loader2 size={28} color="var(--accent)" style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
                            <p style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                                Generating lesson: "{generatingTopic}"
                            </p>
                            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                Creating easy-to-understand content and quiz questions...
                            </p>
                        </div>
                    )}

                    {/* Topic Cards */}
                    {filtered.length === 0 ? (
                        <div className="glass-card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                            <GraduationCap size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
                            <p>No lessons in this category yet.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                            {filtered.map(topic => (
                                <TopicCard
                                    key={topic.id || topic.title}
                                    topic={topic}
                                    onSelect={handleTopicSelect}
                                    isGenerating={generatingTopic === topic.title}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Progress Tab */}
            {tab === 'progress' && (
                <div>
                    <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <BarChart3 size={18} color="var(--accent)" /> Category Progress
                    </h3>
                    {progress?.categoryProgress && Object.keys(progress.categoryProgress).length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {Object.entries(progress.categoryProgress).map(([cat, data]) => {
                                const col = CATEGORY_COLORS[cat] || 'var(--accent)';
                                const CatIcon = CATEGORY_ICONS[cat] || BookOpen;
                                return (
                                    <div key={cat} className="glass-card" style={{ padding: 16 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
                                            <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                                                <CatIcon size={16} color={col} /> {cat}
                                            </span>
                                            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>{data.completed}/{data.total} lessons</span>
                                        </div>
                                        <ProgressBar value={data.completed} max={data.total} color={col} height={6} />
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="glass-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                            <Target size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
                            <p>Start completing lessons to track your progress!</p>
                            <button onClick={() => setTab('lessons')} style={{
                                marginTop: 12, padding: '8px 20px', borderRadius: 8, border: 'none',
                                background: 'var(--accent)', color: '#000', fontWeight: 600, cursor: 'pointer',
                            }}>Browse Lessons</button>
                        </div>
                    )}

                    {progress?.recentProgress?.length > 0 && (
                        <div style={{ marginTop: 24 }}>
                            <h3 style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: 15 }}>
                                <Clock size={16} color="var(--accent)" /> Recent Activity
                            </h3>
                            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                                {progress.recentProgress.map((p, i) => (
                                    <div key={p.id} style={{
                                        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                                        borderBottom: i < progress.recentProgress.length - 1 ? '1px solid var(--divider)' : 'none',
                                    }}>
                                        <CheckCircle size={16} color="#4CAF50" />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 13, fontWeight: 600 }}>{p.lesson?.title || 'Lesson'}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                {p.completedAt ? new Date(p.completedAt).toLocaleDateString('en-IN') : ''}
                                            </div>
                                        </div>
                                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: 'rgba(76,175,80,0.1)', color: '#4CAF50', fontWeight: 600 }}>
                                            {p.lesson?.category || ''}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Leaderboard Tab */}
            {tab === 'leaderboard' && (
                <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--card-border)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, fontSize: 15 }}>
                        <Trophy size={18} color="#FF9800" /> Top Learners
                    </div>
                    {leaderboard.length === 0 ? (
                        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                            <Trophy size={32} style={{ marginBottom: 8, opacity: 0.3 }} />
                            <p>Complete lessons to appear on the leaderboard!</p>
                        </div>
                    ) : (
                        leaderboard.map((u, i) => (
                            <div key={u.name + i} style={{
                                display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px',
                                borderBottom: i < leaderboard.length - 1 ? '1px solid var(--divider)' : 'none',
                                background: u.isCurrentUser ? 'rgba(186,143,13,0.06)' : i < 3 ? 'rgba(255,152,0,0.03)' : 'transparent',
                            }}>
                                <span style={{
                                    width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 800, fontSize: 13,
                                    background: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : 'var(--bg-secondary)',
                                    color: i < 3 ? '#000' : 'var(--text-secondary)',
                                }}>{i + 1}</span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                                        {u.name || 'Learner'}
                                        {u.isCurrentUser && (
                                            <span style={{ marginLeft: 8, fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'var(--accent)', color: '#000', fontWeight: 700 }}>YOU</span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.lessonsCompleted} lessons completed</div>
                                </div>
                                <span style={{ fontWeight: 800, color: 'var(--accent)', fontSize: 15 }}>{u.points} pts</span>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
