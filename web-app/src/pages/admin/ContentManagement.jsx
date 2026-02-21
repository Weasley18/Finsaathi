import React, { useState, useEffect } from 'react';
import {
    BookOpen, FileText, Plus, Search, Edit2, Trash2,
    Eye, CheckCircle, XCircle
} from 'lucide-react';
import { api } from '../../api';

// ─── Lesson Modal ──────────────────────────────────────
function LessonModal({ lesson, onClose, onSave }) {
    const [formData, setFormData] = useState({
        title: '', description: '', content: '', category: '', difficulty: 'BEGINNER', isActive: false
    });

    useEffect(() => {
        if (lesson) setFormData(lesson);
    }, [lesson]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div className="glass-card" style={{ width: 600, maxHeight: '90vh', overflowY: 'auto' }}>
                <h3 className="section-title">{lesson ? 'Edit Lesson' : 'New Lesson'}</h3>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <input
                        className="input" placeholder="Title" required
                        value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })}
                    />
                    <input
                        className="input" placeholder="Category (e.g. Savings)" required
                        value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}
                    />
                    <select
                        className="input"
                        value={formData.difficulty} onChange={e => setFormData({ ...formData, difficulty: e.target.value })}
                    >
                        <option value="BEGINNER">Beginner</option>
                        <option value="INTERMEDIATE">Intermediate</option>
                        <option value="ADVANCED">Advanced</option>
                    </select>
                    <textarea
                        className="input" rows="3" placeholder="Short Description" required
                        value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                    />
                    <textarea
                        className="input" rows="6" placeholder="Content (Markdown)" required
                        value={formData.content} onChange={e => setFormData({ ...formData, content: e.target.value })}
                    />
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={formData.isActive} onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                        />
                        Publish immediately
                    </label>
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
                        <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
                        <button type="submit" className="btn btn-primary">Save Lesson</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Main Component ────────────────────────────────────
export default function ContentManagement() {
    const [activeTab, setActiveTab] = useState('lessons'); // lessons | schemes
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [refresh, setRefresh] = useState(0);

    useEffect(() => {
        loadData();
    }, [activeTab, refresh]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'lessons') {
                const res = await api.getAllLessons();
                setItems(res.lessons || []);
            } else {
                const res = await api.getAllSchemes();
                setItems(res.schemes || []);
            }
        } catch (err) {
            console.error("Failed to load content", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (data) => {
        try {
            if (editingItem) {
                if (activeTab === 'lessons') await api.updateLesson(editingItem.id, data);
                else await api.updateScheme(editingItem.id, data);
            } else {
                if (activeTab === 'lessons') await api.createLesson(data);
                else await api.createScheme(data);
            }
            setShowModal(false);
            setEditingItem(null);
            setRefresh(prev => prev + 1);
        } catch (err) {
            alert("Failed to save: " + err.message);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this?")) return;
        try {
            if (activeTab === 'lessons') await api.deleteLesson(id);
            else await api.deleteScheme(id);
            setRefresh(prev => prev + 1);
        } catch (err) {
            alert("Failed to delete");
        }
    };

    return (
        <div>
            <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                    <h2>Content Management</h2>
                    <p>Manage financial lessons and government schemes</p>
                </div>
                <button className="btn btn-primary" onClick={() => { setEditingItem(null); setShowModal(true); }}>
                    <Plus size={18} /> Add New {activeTab === 'lessons' ? 'Lesson' : 'Scheme'}
                </button>
            </header>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--divider)', marginBottom: 24 }}>
                {[
                    { id: 'lessons', label: 'Financial Lessons', icon: BookOpen },
                    { id: 'schemes', label: 'Govt Schemes', icon: FileText }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '12px 24px',
                            background: 'none', border: 'none',
                            borderBottom: activeTab === tab.id ? '2px solid var(--accent-light)' : '2px solid transparent',
                            color: activeTab === tab.id ? 'var(--accent-light)' : 'var(--text-secondary)',
                            fontSize: 14, fontWeight: 600, cursor: 'pointer'
                        }}
                    >
                        <tab.icon size={16} /> {tab.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading content...</div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
                    {items.map(item => (
                        <div key={item.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                                <span className={`badge ${item.isActive ? 'badge-success' : 'badge-warning'}`}>
                                    {item.isActive ? 'Active' : 'Draft'}
                                </span>
                                {activeTab === 'lessons' && (
                                    <span className="badge badge-info">{item.difficulty}</span>
                                )}
                            </div>

                            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{item.title || item.name}</h3>
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', flex: 1, marginBottom: 16 }}>
                                {item.description}
                            </p>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTop: '1px solid var(--divider)' }}>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 4, alignItems: 'center' }}>
                                    {activeTab === 'lessons' && <><Eye size={14} /> {item.views} views</>}
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button className="btn btn-secondary" style={{ padding: 8 }} onClick={() => { setEditingItem(item); setShowModal(true); }}>
                                        <Edit2 size={16} />
                                    </button>
                                    <button className="btn btn-secondary" style={{ padding: 8, color: 'var(--error)' }} onClick={() => handleDelete(item.id)}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {items.length === 0 && (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                            No content found. Click "Add New" to start.
                        </div>
                    )}
                </div>
            )}

            {showModal && (
                activeTab === 'lessons' ? (
                    <LessonModal lesson={editingItem} onClose={() => setShowModal(false)} onSave={handleSave} />
                ) : (
                    /* Simplified Scheme Modal logic (reusing or duplicating similar structure) */
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                        <div className="glass-card" style={{ padding: 40 }}>
                            <h3>Scheme Modal Placeholder</h3>
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Close</button>
                        </div>
                    </div>
                )
            )}
        </div>
    );
}
