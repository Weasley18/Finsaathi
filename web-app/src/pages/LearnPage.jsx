import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { BookOpen, Clock, CheckCircle, ChevronRight, Star, GraduationCap, Shield, TrendingUp, Wallet, Lock } from 'lucide-react';

const CATEGORY_ICONS = {
    Basics: Wallet,
    Loans: Shield,
    Credit: Star,
    Investment: TrendingUp,
    Budgeting: GraduationCap,
    Savings: Lock,
    Tax: Shield,
    Security: Lock,
};

const CATEGORY_COLORS = {
    Basics: '#4CAF50',
    Loans: '#2196F3',
    Credit: '#FF9800',
    Investment: '#9C27B0',
    Budgeting: '#00BCD4',
    Savings: '#E91E63',
    Tax: '#607D8B',
    Security: '#F44336',
};

export default function LearnPage() {
    const [lessons, setLessons] = useState([]);
    const [activeCategory, setActiveCategory] = useState('All');
    const [expandedLesson, setExpandedLesson] = useState(null);

    useEffect(() => {
        api.getLessons?.()
            .then(data => setLessons(data.lessons || []))
            .catch(() => { });
    }, []);

    const displayLessons = lessons;
    const categories = ['All', ...new Set(displayLessons.map(l => l.category))];
    const filtered = activeCategory === 'All' ? displayLessons : displayLessons.filter(l => l.category === activeCategory);

    return (
        <div>
            <header className="page-header">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <GraduationCap size={22} color="var(--accent)" /> Financial Literacy
                </h2>
                <p>Learn essential money skills in bite-sized lessons</p>
            </header>

            {/* Category filter */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        style={{
                            padding: '8px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
                            background: activeCategory === cat ? 'var(--accent)' : 'var(--card-bg)',
                            color: activeCategory === cat ? '#000' : 'var(--text-secondary)',
                            fontWeight: 600, fontSize: 13,
                            borderWidth: 1, borderStyle: 'solid',
                            borderColor: activeCategory === cat ? 'var(--accent)' : 'var(--card-border)',
                        }}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Lessons grid */}
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
                        <div
                            key={lesson.id}
                            className="glass-card"
                            style={{ padding: 20, cursor: 'pointer', transition: 'transform 0.2s' }}
                            onClick={() => setExpandedLesson(expandedLesson === lesson.id ? null : lesson.id)}
                        >
                            <div style={{ display: 'flex', alignItems: 'start', gap: 12 }}>
                                <div style={{
                                    padding: 10, borderRadius: 12,
                                    background: `${color}22`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <Icon size={20} color={color} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{lesson.title}</div>
                                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{lesson.description}</div>
                                </div>
                                <ChevronRight size={18} color="var(--text-muted)" style={{
                                    transform: expandedLesson === lesson.id ? 'rotate(90deg)' : 'none',
                                    transition: 'transform 0.2s',
                                }} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
                                <span style={{
                                    padding: '3px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                                    background: `${color}22`, color,
                                }}>
                                    {lesson.category}
                                </span>
                                <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Clock size={12} /> {lesson.duration}
                                </span>
                                <span style={{
                                    fontSize: 11, padding: '2px 8px', borderRadius: 6,
                                    background: lesson.difficulty === 'Beginner' ? 'rgba(76,175,80,0.15)' : 'rgba(255,152,0,0.15)',
                                    color: lesson.difficulty === 'Beginner' ? '#4CAF50' : '#FF9800',
                                }}>
                                    {lesson.difficulty}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
            )}
        </div>
    );
}
