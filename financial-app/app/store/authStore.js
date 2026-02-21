import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { setApiToken } from '../services/api';

const useAuthStore = create(
    persist(
        (set, get) => ({
            token: null,
            user: null,
            isAuthenticated: false,
            isLoading: false,

            // Send OTP
            sendOtp: async (phone) => {
                set({ isLoading: true });
                try {
                    const { data } = await api.post('/auth/send-otp', { phone });
                    set({ isLoading: false });
                    return data;
                } catch (error) {
                    set({ isLoading: false });
                    throw error;
                }
            },

            // Verify OTP & Login
            verifyOtp: async (phone, code) => {
                set({ isLoading: true });
                try {
                    const { data } = await api.post('/auth/verify-otp', { phone, code });
                    set({
                        token: data.token,
                        user: data.user,
                        isAuthenticated: true,
                        isLoading: false,
                    });
                    // Set token for future requests
                    setApiToken(data.token);
                    return data;
                } catch (error) {
                    set({ isLoading: false });
                    throw error;
                }
            },

            // Complete Profile
            completeProfile: async (profileData) => {
                const { data } = await api.post('/auth/complete-profile', profileData);
                set({ user: data.user });
                return data;
            },

            // Get current user
            fetchUser: async () => {
                try {
                    const { data } = await api.get('/auth/me');
                    set({ user: data.user });
                    return data.user;
                } catch (error) {
                    console.error('Failed to fetch user:', error);
                }
            },

            // Update profile
            updateProfile: async (profileData) => {
                try {
                    const { user } = get();
                    const { data } = await api.put('/users/profile', profileData);
                    set({ user: { ...user, ...profileData } });
                    return data;
                } catch (error) {
                    throw error;
                }
            },

            // Logout
            logout: () => {
                set({ token: null, user: null, isAuthenticated: false });
                setApiToken(null);
            },

            // Set auth from stored token
            setAuth: (token, user) => {
                set({ token, user, isAuthenticated: true });
                setApiToken(token);
            },
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => AsyncStorage),
            onRehydrateStorage: () => (state) => {
                if (state?.token) {
                    setApiToken(state.token);
                }
            },
        }
    )
);

export default useAuthStore;
