const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

let token = localStorage.getItem('finsaathi_token');

export const setAuthToken = (newToken) => {
    token = newToken;
    if (newToken) localStorage.setItem('finsaathi_token', newToken);
    else localStorage.removeItem('finsaathi_token');
};

export const getAuthToken = () => token;

async function apiFetch(endpoint, options = {}) {
    const userLang = localStorage.getItem('finsaathi_language') || 'en';
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(userLang !== 'en' && { 'X-User-Language': userLang }),
        ...options.headers,
    };

    const res = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (res.status === 401) {
        setAuthToken(null);
        window.location.href = '/login';
        throw new Error('Unauthorized');
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
}

export const api = {
    // Auth
    sendOtp: (phone) => apiFetch('/auth/send-otp', { method: 'POST', body: JSON.stringify({ phone }) }),
    verifyOtp: (phone, code) => apiFetch('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ phone, code }) }),
    getMe: () => apiFetch('/auth/me'),

    // Dashboard
    getDashboard: () => apiFetch('/users/dashboard'),

    // Users (Admin)
    getUsers: () => apiFetch('/users'),
    getUserById: (id) => apiFetch(`/users/${id}`),
    updateUser: (id, data) => apiFetch(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteUser: (id) => apiFetch(`/users/${id}`, { method: 'DELETE' }),

    // Transactions
    getTransactions: () => apiFetch('/transactions'),
    createTransaction: (data) => apiFetch('/transactions', { method: 'POST', body: JSON.stringify(data) }),
    getSpendingByCategory: () => apiFetch('/transactions/analytics/by-category'),
    getMonthlyTrend: () => apiFetch('/transactions/analytics/monthly-trend'),

    // Budgets
    getBudgets: () => apiFetch('/budgets'),
    getBudgetOverview: () => apiFetch('/budgets/overview'),

    // Goals
    getGoals: () => apiFetch('/goals'),
    createGoal: (data) => apiFetch('/goals', { method: 'POST', body: JSON.stringify(data) }),
    contributeToGoal: (id, amount) => apiFetch(`/goals/${id}/contribute`, { method: 'POST', body: JSON.stringify({ amount }) }),
    updateGoal: (id, data) => apiFetch(`/goals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteGoal: (id) => apiFetch(`/goals/${id}`, { method: 'DELETE' }),

    // Profile (self)
    getProfile: () => apiFetch('/users/profile'),
    updateProfile: (data) => apiFetch('/users/profile', { method: 'PUT', body: JSON.stringify(data) }),
    completeProfile: (data) => apiFetch('/auth/complete-profile', { method: 'POST', body: JSON.stringify(data) }),
    uploadDocument: async (file, type) => {
        const formData = new FormData();
        formData.append('file', file);

        const headers = {
            ...(token && { Authorization: `Bearer ${token}` }),
        };

        const res = await fetch(`${BASE_URL}/documents/upload?type=${encodeURIComponent(type)}`, {
            method: 'POST',
            headers,
            body: formData, // Do not set Content-Type header manually, let fetch handle the boundary
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Upload failed');
        }
        return res.json();
    },

    // Insights
    getHealthScore: () => apiFetch('/insights/health-score'),
    getSpendingInsights: () => apiFetch('/insights/spending'),
    getLessons: () => apiFetch('/insights/lessons'),

    // Chat
    getChatHistory: () => apiFetch('/chat/history'),
    sendMessage: (message) => apiFetch('/chat', { method: 'POST', body: JSON.stringify({ message }) }),
    sendChatMessage: (message) => apiFetch('/chat', { method: 'POST', body: JSON.stringify({ message }) }),
    clearChatHistory: () => apiFetch('/chat/history', { method: 'DELETE' }),

    // Advisor
    getAdvisorClients: (id) => apiFetch(`/advisors/${id}/clients`),
    getPotentialClients: (unassignedOnly = true) => apiFetch(`/advisors/all-potential-clients?unassignedOnly=${unassignedOnly}`),

    // Admin
    getAdvisors: () => apiFetch('/advisors'),
    assignClient: (advisorId, clientId) => apiFetch(`/advisors/${advisorId}/assign`, { method: 'POST', body: JSON.stringify({ clientId }) }),
    updateAdvisorTier: (id, tier) => apiFetch(`/advisors/${id}/tier`, { method: 'PUT', body: JSON.stringify({ tier }) }),

    getPendingApprovals: () => apiFetch('/admin/pending-approvals'),
    approveUser: (userId) => apiFetch(`/admin/approve/${userId}`, { method: 'POST', body: JSON.stringify({}) }),
    rejectUser: (userId, reason) => apiFetch(`/admin/reject/${userId}`, { method: 'POST', body: JSON.stringify({ reason }) }),

    // Content (Lessons/Schemes)
    getAllLessons: (filters = {}) => {
        const query = new URLSearchParams(filters).toString();
        return apiFetch(`/content/lessons?${query}`);
    },
    createLesson: (data) => apiFetch('/content/lessons', { method: 'POST', body: JSON.stringify(data) }),
    updateLesson: (id, data) => apiFetch(`/content/lessons/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteLesson: (id) => apiFetch(`/content/lessons/${id}`, { method: 'DELETE' }),

    getAllSchemes: () => apiFetch('/content/schemes'),
    createScheme: (data) => apiFetch('/content/schemes', { method: 'POST', body: JSON.stringify(data) }),
    updateScheme: (id, data) => apiFetch(`/content/schemes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteScheme: (id) => apiFetch(`/content/schemes/${id}`, { method: 'DELETE' }),

    // Partner
    getPartnerDashboard: () => apiFetch('/partners/dashboard'),
    getPartnerAnalytics: () => apiFetch('/partners/analytics'),
    getPartnerProducts: () => apiFetch('/partners/products'),
    createPartnerProduct: (data) => apiFetch('/partners/products', { method: 'POST', body: JSON.stringify(data) }),
    updatePartnerProduct: (id, data) => apiFetch(`/partners/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deletePartnerProduct: (id) => apiFetch(`/partners/products/${id}`, { method: 'DELETE' }),
};
