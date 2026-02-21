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
    getUsers: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return apiFetch(`/users${qs ? '?' + qs : ''}`);
    },
    getUserById: (id) => apiFetch(`/users/${id}`),
    updateUser: (id, data) => apiFetch(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteUser: (id) => apiFetch(`/users/${id}`, { method: 'DELETE' }),

    // Transactions
    getTransactions: () => apiFetch('/transactions'),
    createTransaction: (data) => apiFetch('/transactions', { method: 'POST', body: JSON.stringify(data) }),
    getSpendingByCategory: () => apiFetch('/transactions/analytics/by-category'),
    getMonthlyTrend: () => apiFetch('/transactions/analytics/monthly-trend'),
    parseSms: (text) => apiFetch('/transactions/parse-sms', { method: 'POST', body: JSON.stringify({ text }) }),
    parseText: (text) => apiFetch('/transactions/parse-text', { method: 'POST', body: JSON.stringify({ text }) }),
    batchParseSms: (messages) => apiFetch('/transactions/parse-sms/batch', { method: 'POST', body: JSON.stringify({ messages }) }),
    importSms: (messages) => apiFetch('/transactions/import-sms', { method: 'POST', body: JSON.stringify({ messages }) }),

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
    getAnomalies: (sensitivity) => apiFetch(`/insights/anomalies${sensitivity ? `?sensitivity=${sensitivity}` : ''}`),
    getForecast: (days) => apiFetch(`/insights/forecast${days ? `?days=${days}` : ''}`),
    getInvestmentRecommendations: () => apiFetch('/insights/investment-recommendations'),
    getAdaptiveBudget: () => apiFetch('/insights/adaptive-budget'),
    getCategoryInsights: () => apiFetch('/insights/category-insights'),

    // Chat Rooms
    getChatRooms: (type) => apiFetch(`/chatrooms${type ? `?type=${type}` : ''}`),
    createChatRoom: (type) => apiFetch('/chatrooms', { method: 'POST', body: JSON.stringify({ type }) }),
    renameChatRoom: (id, title) => apiFetch(`/chatrooms/${id}`, { method: 'PUT', body: JSON.stringify({ title }) }),
    deleteChatRoom: (id) => apiFetch(`/chatrooms/${id}`, { method: 'DELETE' }),

    // Chat
    getChatHistory: (roomId) => apiFetch(`/chat/history${roomId ? `?roomId=${roomId}` : ''}`),
    sendMessage: (message, chatRoomId) => apiFetch('/chat', { method: 'POST', body: JSON.stringify({ message, ...(chatRoomId && { chatRoomId }) }) }),
    sendChatMessage: (message, chatRoomId) => apiFetch('/chat', { method: 'POST', body: JSON.stringify({ message, ...(chatRoomId && { chatRoomId }) }) }),
    clearChatHistory: (roomId) => apiFetch(`/chat/history${roomId ? `?roomId=${roomId}` : ''}`, { method: 'DELETE' }),

    // Advisor
    getAdvisorClients: (id) => apiFetch(`/advisors/${id}/clients`),
    getAdvisorStats: (id) => apiFetch(`/advisors/${id}/stats`),
    getPotentialClients: (unassignedOnly = true) => apiFetch(`/advisors/all-potential-clients?unassignedOnly=${unassignedOnly}`),

    // Admin
    getAdvisors: () => apiFetch('/advisors'),
    assignClient: (advisorId, clientId) => apiFetch(`/advisors/${advisorId}/assign`, { method: 'POST', body: JSON.stringify({ clientId }) }),
    updateAdvisorTier: (id, tier) => apiFetch(`/advisors/${id}/tier`, { method: 'PUT', body: JSON.stringify({ tier }) }),

    getPendingApprovals: () => apiFetch('/admin/pending-approvals'),
    getAdminStats: () => apiFetch('/admin/stats'),
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

    // Content Generation & Quizzes
    generateLesson: (topic, difficulty, userContext) => apiFetch('/content/generate', { method: 'POST', body: JSON.stringify({ topic, difficulty, userContext }) }),
    publishLesson: (id) => apiFetch(`/content/generate/publish/${id}`, { method: 'POST' }),
    getContentSuggestions: () => apiFetch('/content/suggestions'),
    getLessonQuizzes: (lessonId) => apiFetch(`/content/lessons/${lessonId}/quizzes`),
    submitQuizAttempt: (quizId, selectedIndex) => apiFetch(`/content/quizzes/${quizId}/attempt`, { method: 'POST', body: JSON.stringify({ selectedIndex }) }),
    completeLesson: (lessonId) => apiFetch(`/content/lessons/${lessonId}/complete`, { method: 'POST' }),
    getLearningProgress: () => apiFetch('/content/progress'),
    getLeaderboard: () => apiFetch('/content/leaderboard'),
    viewLesson: (id) => apiFetch(`/content/lessons/${id}/view`, { method: 'POST' }),

    // Gamification
    getGamificationStatus: () => apiFetch('/gamification/status'),
    logActivity: (action) => apiFetch('/gamification/log-activity', { method: 'POST', body: JSON.stringify({ action }) }),

    // Analytics
    getAnalyticsDashboard: () => apiFetch('/analytics/dashboard'),
    getAnalyticsTrend: () => apiFetch('/analytics/trend'),
    getAnalyticsCategories: () => apiFetch('/analytics/categories'),

    // Partner
    getPartnerDashboard: () => apiFetch('/partners/dashboard'),
    getPartnerAnalytics: () => apiFetch('/partners/analytics'),
    getPartnerProducts: () => apiFetch('/partners/products'),
    createPartnerProduct: (data) => apiFetch('/partners/products', { method: 'POST', body: JSON.stringify(data) }),
    updatePartnerProduct: (id, data) => apiFetch(`/partners/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deletePartnerProduct: (id) => apiFetch(`/partners/products/${id}`, { method: 'DELETE' }),

    // ─── Advisor AI Clone & CoPilot ─────────────────────────────
    advisorCloneChat: (message, chatRoomId) => apiFetch('/advisors/clone/chat', { method: 'POST', body: JSON.stringify({ message, ...(chatRoomId && { chatRoomId }) }) }),
    advisorCoPilotChat: (message, chatRoomId) => apiFetch('/advisors/chat', { method: 'POST', body: JSON.stringify({ message, ...(chatRoomId && { chatRoomId }) }) }),

    // ─── Advisor Notes ──────────────────────────────────────────
    getAdvisorNotes: (clientId) => apiFetch(`/advisors/notes${clientId ? `?clientId=${clientId}` : ''}`),
    createAdvisorNote: (clientId, content, category = 'general') =>
        apiFetch('/advisors/notes', { method: 'POST', body: JSON.stringify({ clientId, content, category }) }),

    // ─── Direct Messages ────────────────────────────────────────
    sendDirectMessage: (receiverId, content) =>
        apiFetch('/messages', { method: 'POST', body: JSON.stringify({ receiverId, content }) }),
    getConversations: () => apiFetch('/messages/conversations'),
    getConversation: (userId, limit = 50, offset = 0) =>
        apiFetch(`/messages/${userId}?limit=${limit}&offset=${offset}`),
    markMessageRead: (id) => apiFetch(`/messages/${id}/read`, { method: 'PUT' }),

    // ─── Recommendations ────────────────────────────────────────
    sendRecommendation: (clientId, title, content, category) =>
        apiFetch('/recommendations', { method: 'POST', body: JSON.stringify({ clientId, title, content, category }) }),
    getRecommendations: (clientId) =>
        apiFetch(`/recommendations${clientId ? `?clientId=${clientId}` : ''}`),
    updateRecommendationStatus: (id, status) =>
        apiFetch(`/recommendations/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),

    // ─── Scheduled Calls ────────────────────────────────────────
    scheduleCall: (clientId, scheduledAt, duration = 30, notes) =>
        apiFetch('/calls', { method: 'POST', body: JSON.stringify({ clientId, scheduledAt, duration, notes }) }),
    getCalls: (status) => apiFetch(`/calls${status ? `?status=${status}` : ''}`),
    updateCall: (id, data) => apiFetch(`/calls/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    cancelCall: (id) => apiFetch(`/calls/${id}`, { method: 'DELETE' }),

    // ─── Client Flags ───────────────────────────────────────────
    flagClient: (clientId, reason, priority = 'medium') =>
        apiFetch('/flags', { method: 'POST', body: JSON.stringify({ clientId, reason, priority }) }),
    getFlags: (status) => apiFetch(`/flags${status ? `?status=${status}` : ''}`),
    updateFlag: (id, data) => apiFetch(`/flags/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

    // ─── Notifications ──────────────────────────────────────────
    getNotifications: (limit = 20, offset = 0) => apiFetch(`/notifications?limit=${limit}&offset=${offset}`),
    getNotificationCount: () => apiFetch('/notifications/counts'),
    markNotificationsRead: (ids) =>
        apiFetch('/notifications/read', { method: 'PUT', body: JSON.stringify({ ids }) }),
    markAllNotificationsRead: () =>
        apiFetch('/notifications/read', { method: 'PUT', body: JSON.stringify({}) }),
    deleteNotification: (id) => apiFetch(`/notifications/${id}`, { method: 'DELETE' }),
};
