import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API base URL — change to your backend URL
const API_BASE_URL = __DEV__
    ? 'http://192.168.137.83:3001/api'
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
        // Add language header for server-side translation
        try {
            const lang = await AsyncStorage.getItem('finsaathi_language');
            if (lang && lang !== 'en') {
                config.headers['X-User-Language'] = lang;
            }
        } catch (e) { /* ignore */ }
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

export default api;
