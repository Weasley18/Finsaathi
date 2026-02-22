import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API base URL — change to your backend URL
const API_BASE_URL = __DEV__
    ? 'http://10.186.131.244:3001/api'
    : 'https://api.finsaathi.com/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000, // 30s for AI chat which takes time
    headers: {
        'Content-Type': 'application/json',
    },
});

// Token management to avoid circular dependency with authStore
let authToken = null;

export const setApiToken = (token) => {
    authToken = token;
    if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
        delete api.defaults.headers.common['Authorization'];
    }
};

// Request interceptor — add auth token and language header
api.interceptors.request.use(
    async (config) => {
        if (authToken) {
            config.headers.Authorization = `Bearer ${authToken}`;
        }
        // Always send language header so backend uses the app's current locale
        try {
            const lang = await AsyncStorage.getItem('finsaathi_language');
            config.headers['X-User-Language'] = lang || 'en';
        } catch (e) {
            config.headers['X-User-Language'] = 'en';
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor — handle errors globally
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired — could trigger logout
            console.warn('Auth token expired');
        }
        return Promise.reject(error);
    }
);

// ─── API Helper Methods ────────────────────────────────────────

// Auth
// Auth
api.sendOtp = (phone) => api.post('/auth/send-otp', { phone });
api.verifyOtp = (phone, code) => api.post('/auth/verify-otp', { phone, code });
api.getMe = () => api.get('/auth/me');
api.uploadDocument = async (file, type) => {
    const formData = new FormData();
    formData.append('file', {
        uri: file.uri,
        name: file.name || 'document.pdf',
        type: file.mimeType || 'application/pdf',
    });

    // We fetch instead of axios because React Native axios FormData parsing is notoriously buggy and fetch handles bounds better natively
    let url = `${API_BASE_URL}/documents/upload?type=${encodeURIComponent(type)}`;
    let headers = {
        'Content-Type': 'multipart/form-data',
    };
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    const res = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
    });

    if (!res.ok) {
        throw new Error('Upload failed');
    }
    return res.json();
};

// User Data
api.getDashboard = () => api.get('/users/dashboard');

// Advisor Data
api.getAdvisorClients = (id) => api.get(`/advisors/${id}/clients`);

// ─── Advisor AI Clone & CoPilot ─────────────────────────────
api.advisorCloneChat = (message, chatRoomId) => api.post('/advisors/clone/chat', { message, chatRoomId });
api.advisorCoPilotChat = (message, chatRoomId) => api.post('/advisors/chat', { message, chatRoomId });

// ─── Advisor Notes ──────────────────────────────────────────
api.getAdvisorNotes = (clientId) => api.get(`/advisors/notes${clientId ? `?clientId=${clientId}` : ''}`);
api.createAdvisorNote = (clientId, content, category = 'general') =>
    api.post('/advisors/notes', { clientId, content, category });

// ─── Direct Messages ────────────────────────────────────────
api.sendDirectMessage = (receiverId, content) => api.post('/messages', { receiverId, content });
api.getConversations = () => api.get('/messages/conversations');
api.getConversation = (userId, limit = 50, offset = 0) =>
    api.get(`/messages/${userId}?limit=${limit}&offset=${offset}`);
api.markMessageRead = (id) => api.put(`/messages/${id}/read`);

// ─── Recommendations ────────────────────────────────────────
api.sendRecommendation = (clientId, title, content, category) =>
    api.post('/recommendations', { clientId, title, content, category });
api.getRecommendations = (clientId) =>
    api.get(`/recommendations${clientId ? `?clientId=${clientId}` : ''}`);
api.updateRecommendationStatus = (id, status) =>
    api.put(`/recommendations/${id}/status`, { status });

// ─── Scheduled Calls ────────────────────────────────────────
api.scheduleCall = (clientId, scheduledAt, duration = 30, notes) =>
    api.post('/calls', { clientId, scheduledAt, duration, notes });
api.getCalls = (status) => api.get(`/calls${status ? `?status=${status}` : ''}`);
api.updateCall = (id, data) => api.put(`/calls/${id}`, data);
api.cancelCall = (id) => api.delete(`/calls/${id}`);

// ─── Client Flags ───────────────────────────────────────────
api.flagClient = (clientId, reason, priority = 'medium') =>
    api.post('/flags', { clientId, reason, priority });
api.getFlags = (status) => api.get(`/flags${status ? `?status=${status}` : ''}`);
api.updateFlag = (id, data) => api.put(`/flags/${id}`, data);

// ─── Notifications ──────────────────────────────────────────
api.getNotifications = (limit = 20, offset = 0) => api.get(`/notifications?limit=${limit}&offset=${offset}`);
api.getNotificationCount = () => api.get('/notifications/counts');
api.markNotificationsRead = (ids) => api.put('/notifications/read', { ids });
api.markAllNotificationsRead = () => api.put('/notifications/read', {});
api.deleteNotification = (id) => api.delete(`/notifications/${id}`);

// ─── Chat Rooms ─────────────────────────────────────────────
api.getChatRooms = (type) => api.get(`/chatrooms${type ? `?type=${type}` : ''}`);
api.createChatRoom = (type) => api.post('/chatrooms', { type });
api.renameChatRoom = (id, title) => api.put(`/chatrooms/${id}`, { title });
api.deleteChatRoom = (id) => api.delete(`/chatrooms/${id}`);

// ─── Chat ───────────────────────────────────────────────────
api.sendChatMessage = (message, chatRoomId) => api.post('/chat', { message, chatRoomId });
api.getChatHistory = (roomId) => api.get(`/chat/history${roomId ? `?roomId=${roomId}` : ''}`);
api.clearChatHistory = (roomId) => api.delete(`/chat/history${roomId ? `?roomId=${roomId}` : ''}`);

// ─── Health & Insights ──────────────────────────────────────
api.getHealthScore = () => api.get('/insights/health-score');
api.getGoals = () => api.get('/goals');
api.getTransactions = () => api.get('/transactions');

// ─── Predictive Analysis (ML) ───────────────────────────────
api.getAnomalies = (sensitivity) => api.get(`/insights/anomalies${sensitivity ? `?sensitivity=${sensitivity}` : ''}`);
api.getForecast = (days = 30) => api.get(`/insights/forecast?days=${days}`);
api.getAdaptiveBudget = () => api.get('/insights/adaptive-budget');
api.getCategoryInsights = () => api.get('/insights/category-insights');

// ─── SMS Parsing ────────────────────────────────────────────
api.parseSms = (message) => api.post('/transactions/parse-sms', { message });
api.batchParseSms = (messages) => api.post('/transactions/parse-sms/batch', { messages });
api.importSms = (messages) => api.post('/transactions/import-sms', { messages });

// ─── Content & Quizzes ─────────────────────────────────────
api.getLessons = () => api.get('/content/lessons');
api.getLesson = (id) => api.get(`/content/lessons/${id}`);
api.getLessonQuizzes = (lessonId) => api.get(`/content/lessons/${lessonId}/quizzes`);
api.submitQuizAttempt = (quizId, selectedIndex) => api.post(`/content/quizzes/${quizId}/attempt`, { selectedIndex });
api.completeLesson = (lessonId) => api.post(`/content/lessons/${lessonId}/complete`);
api.getLearningProgress = () => api.get('/content/progress');
api.getLeaderboard = () => api.get('/content/leaderboard');

// ─── Gamification ───────────────────────────────────────────
api.getGamificationStatus = () => api.get('/gamification/status');
api.logActivity = (action) => api.post('/gamification/log', { action });

// ─── Admin ──────────────────────────────────────────────────
api.getAdminStats = () => api.get('/admin/stats');
api.getPendingApprovals = () => api.get('/admin/pending-approvals');
api.approveUser = (userId) => api.post(`/admin/approve/${userId}`);
api.rejectUser = (userId, reason) => api.post(`/admin/reject/${userId}`, { reason });
api.getAdvisors = () => api.get('/admin/advisors');
api.updateAdvisorTier = (id, tier) => api.put(`/admin/advisors/${id}/tier`, { tier });
api.assignClient = (advisorId, clientId) => api.post(`/admin/advisors/${advisorId}/assign`, { clientId });
api.getUsers = (params) => api.get('/admin/users', { params });
api.getAllLessons = () => api.get('/content/admin/lessons');
api.createLesson = (data) => api.post('/content/admin/lessons', data);
api.updateLesson = (id, data) => api.put(`/content/admin/lessons/${id}`, data);
api.deleteLesson = (id) => api.delete(`/content/admin/lessons/${id}`);
api.getAllSchemes = () => api.get('/content/admin/schemes');
api.createScheme = (data) => api.post('/content/admin/schemes', data);
api.updateScheme = (id, data) => api.put(`/content/admin/schemes/${id}`, data);
api.deleteScheme = (id) => api.delete(`/content/admin/schemes/${id}`);

// ─── Partner ────────────────────────────────────────────────
api.getPartnerDashboard = () => api.get('/partners/dashboard');
api.getPartnerAnalytics = () => api.get('/partners/analytics');
api.getPartnerProducts = () => api.get('/partners/products');
api.createPartnerProduct = (data) => api.post('/partners/products', data);
api.updatePartnerProduct = (id, data) => api.put(`/partners/products/${id}`, data);
api.deletePartnerProduct = (id) => api.delete(`/partners/products/${id}`);

export default api;
