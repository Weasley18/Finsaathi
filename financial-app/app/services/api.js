import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API base URL — change to your backend URL
const API_BASE_URL = __DEV__
    ? 'http://172.16.4.28:3001/api'
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
api.sendOtp = (phone) => api.post('/auth/send-otp', { phone });
api.verifyOtp = (phone, code) => api.post('/auth/verify-otp', { phone, code });
api.getMe = () => api.get('/auth/me');

// User Data
api.getDashboard = () => api.get('/users/dashboard');

// Advisor Data
api.getAdvisorClients = (id) => api.get(`/advisors/${id}/clients`);
// Mock stats for now as we don't have a dedicated endpoint, 
// but in real app we might have /advisors/:id/stats

export default api;
