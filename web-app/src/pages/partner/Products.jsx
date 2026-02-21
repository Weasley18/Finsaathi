import React, { useState, useEffect } from 'react';
import {
    Plus, Edit3, Trash2, X, Package, IndianRupee,
    Percent, Check, AlertCircle
} from 'lucide-react';
import { api } from '../../api';

const PRODUCT_TYPES = [
    { value: 'microloan', label: 'Micro Loan' },
    { value: 'insurance', label: 'Insurance' },
    { value: 'savings_account', label: 'Savings Account' },
    { value: 'scheme', label: 'Government Scheme' },
    { value: 'fixed_deposit', label: 'Fixed Deposit' },
];

function ProductModal({ product, onClose, onSave }) {
    const [form, setForm] = useState({
        name: product?.name || '',
        description: product?.description || '',
        type: product?.type || 'microloan',
        interestRate: product?.interestRate || '',
        minAmount: product?.minAmount || '',
        maxAmount: product?.maxAmount || '',
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const data = {
                ...form,
                interestRate: form.interestRate ? parseFloat(form.interestRate) : null,
                minAmount: form.minAmount ? parseFloat(form.minAmount) : null,
                maxAmount: form.maxAmount ? parseFloat(form.maxAmount) : null,
            };
            if (product?.id) {
                await api.updatePartnerProduct(product.id, data);
            } else {
                await api.createPartnerProduct(data);
            }
            onSave();
        } catch (err) {
            console.error('Save failed:', err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
        }}>
            <div className="glass-card" style={{ width: 520, maxHeight: '85vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 700 }}>
                        {product?.id ? 'Edit Product' : 'New Product'}
                    </h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                        <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>Product Name</label>
                        <input
                            className="input"
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            placeholder="e.g. Micro Business Loan"
                            required
                        />
                    </div>

                    <div>
                        <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>Description</label>
                        <textarea
                            className="input"
                            value={form.description}
                            onChange={e => setForm({ ...form, description: e.target.value })}
                            placeholder="Describe the product and its benefits..."
                            rows={3}
                            required
                            style={{ resize: 'vertical' }}
                        />
                    </div>

                    <div>
                        <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>Type</label>
                        <select
                            className="input"
                            value={form.type}
                            onChange={e => setForm({ ...form, type: e.target.value })}
                        >
                            {PRODUCT_TYPES.map(t => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                        <div>
                            <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>Interest Rate %</label>
                            <input
                                className="input"
                                type="number"
                                step="0.1"
                                value={form.interestRate}
                                onChange={e => setForm({ ...form, interestRate: e.target.value })}
                                placeholder="e.g. 8.5"
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>Min Amount (₹)</label>
                            <input
                                className="input"
                                type="number"
                                value={form.minAmount}
                                onChange={e => setForm({ ...form, minAmount: e.target.value })}
                                placeholder="e.g. 5000"
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>Max Amount (₹)</label>
                            <input
                                className="input"
                                type="number"
                                value={form.maxAmount}
                                onChange={e => setForm({ ...form, maxAmount: e.target.value })}
                                placeholder="e.g. 500000"
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Saving...' : product?.id ? 'Update' : 'Create'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function Products() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editProduct, setEditProduct] = useState(null);

    const loadProducts = async () => {
        try {
            const data = await api.getPartnerProducts();
            setProducts(data.products || []);
        } catch {
            setProducts([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadProducts(); }, []);

    const handleDelete = async (id) => {
        if (!confirm('Delete this product listing?')) return;
        try {
            await api.deletePartnerProduct(id);
            loadProducts();
        } catch (err) {
            console.error('Delete failed:', err);
        }
    };

    const handleSave = () => {
        setShowModal(false);
        setEditProduct(null);
        loadProducts();
    };

    const typeLabel = (t) => PRODUCT_TYPES.find(pt => pt.value === t)?.label || t;

    return (
        <div>
            <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                    <h2>Product Listings</h2>
                    <p>Manage your financial products offered to FinSaathi users</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => { setEditProduct(null); setShowModal(true); }}
                >
                    <Plus size={16} /> New Product
                </button>
            </header>

            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Type</th>
                            <th>Interest</th>
                            <th>Amount Range</th>
                            <th>Matches</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map(p => (
                            <tr key={p.id}>
                                <td>
                                    <div style={{ fontWeight: 600, marginBottom: 2 }}>{p.name}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {p.description}
                                    </div>
                                </td>
                                <td>
                                    <span className="badge badge-gold">{typeLabel(p.type)}</span>
                                </td>
                                <td style={{ fontWeight: 600 }}>
                                    {p.interestRate ? `${p.interestRate}%` : '—'}
                                </td>
                                <td style={{ fontSize: 13 }}>
                                    {p.minAmount != null || p.maxAmount != null
                                        ? `₹${(p.minAmount || 0).toLocaleString()} – ₹${(p.maxAmount || '∞').toLocaleString()}`
                                        : '—'}
                                </td>
                                <td style={{ fontWeight: 700 }}>
                                    {p.totalMatches}
                                </td>
                                <td>
                                    <span className={`badge ${p.isActive ? 'badge-success' : 'badge-error'}`}>
                                        {p.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                        <button
                                            className="btn btn-secondary"
                                            style={{ padding: '6px 10px' }}
                                            onClick={() => { setEditProduct(p); setShowModal(true); }}
                                        >
                                            <Edit3 size={14} />
                                        </button>
                                        <button
                                            className="btn btn-secondary"
                                            style={{ padding: '6px 10px', color: 'var(--error)' }}
                                            onClick={() => handleDelete(p.id)}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {products.length === 0 && (
                    <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                        <Package size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
                        <p>No products listed yet. Click "New Product" to get started.</p>
                    </div>
                )}
            </div>

            {showModal && (
                <ProductModal
                    product={editProduct}
                    onClose={() => { setShowModal(false); setEditProduct(null); }}
                    onSave={handleSave}
                />
            )}
        </div>
    );
}
