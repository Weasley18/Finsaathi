import { create } from 'zustand';
import api from '../services/api';

const useFinanceStore = create((set, get) => ({
    // Dashboard
    dashboard: null,
    dashboardLoading: false,

    // Transactions
    transactions: [],
    transactionsLoading: false,

    // Goals
    goals: [],
    goalsSummary: null,
    goalsLoading: false,

    // Budgets
    budgets: [],
    budgetOverview: null,
    budgetsLoading: false,

    // Insights
    healthScore: null,
    spendingInsights: null,
    lessons: [],
    anomalies: null,
    forecast: null,
    adaptiveBudget: null,
    learningProgress: null,
    leaderboard: [],

    // Chat
    chatMessages: [],
    chatLoading: false,
    chatRooms: [],
    activeChatRoomId: null,
    chatRoomsLoading: false,

    // ─── Dashboard ─────────────────────────────────────────────
    fetchDashboard: async () => {
        set({ dashboardLoading: true });
        try {
            const { data } = await api.get('/users/dashboard');
            set({ dashboard: data, dashboardLoading: false });
            return data;
        } catch (error) {
            set({ dashboardLoading: false });
            console.error('Dashboard fetch error:', error);
        }
    },

    // ─── Transactions ──────────────────────────────────────────
    fetchTransactions: async (params = {}) => {
        set({ transactionsLoading: true });
        try {
            const { data } = await api.get('/transactions', { params });
            set({ transactions: data.transactions, transactionsLoading: false });
            return data;
        } catch (error) {
            set({ transactionsLoading: false });
            console.error('Transactions fetch error:', error);
        }
    },

    addTransaction: async (transaction) => {
        try {
            const { data } = await api.post('/transactions', transaction);
            // Refresh transactions
            get().fetchTransactions();
            get().fetchDashboard();
            return data;
        } catch (error) {
            console.error('Add transaction error:', error);
            throw error;
        }
    },

    deleteTransaction: async (id) => {
        await api.delete(`/transactions/${id}`);
        get().fetchTransactions();
        get().fetchDashboard();
    },

    // ─── Goals ─────────────────────────────────────────────────
    fetchGoals: async () => {
        set({ goalsLoading: true });
        try {
            const { data } = await api.get('/goals');
            set({
                goals: data.goals,
                goalsSummary: data.summary,
                goalsLoading: false,
            });
            return data;
        } catch (error) {
            set({ goalsLoading: false });
            console.error('Goals fetch error:', error);
        }
    },

    addGoal: async (goal) => {
        const { data } = await api.post('/goals', goal);
        get().fetchGoals();
        return data;
    },

    contributeToGoal: async (goalId, amount) => {
        const { data } = await api.post(`/goals/${goalId}/contribute`, { amount });
        get().fetchGoals();
        get().fetchDashboard();
        return data;
    },

    updateGoal: async (goalId, goalData) => {
        const { data } = await api.put(`/goals/${goalId}`, goalData);
        get().fetchGoals();
        get().fetchDashboard();
        return data;
    },

    // ─── Budgets ───────────────────────────────────────────────
    fetchBudgets: async () => {
        set({ budgetsLoading: true });
        try {
            const { data } = await api.get('/budgets');
            set({ budgets: data.budgets, budgetsLoading: false });
        } catch (error) {
            set({ budgetsLoading: false });
        }
    },

    fetchBudgetOverview: async () => {
        try {
            const { data } = await api.get('/budgets/overview');
            set({ budgetOverview: data });
        } catch (error) {
            console.error('Budget overview error:', error);
        }
    },

    setBudget: async (budget) => {
        await api.post('/budgets', budget);
        get().fetchBudgets();
    },

    // ─── Insights ──────────────────────────────────────────────
    fetchHealthScore: async () => {
        try {
            const { data } = await api.get('/insights/health-score');
            set({ healthScore: data });
            return data;
        } catch (error) {
            console.error('Health score error:', error);
        }
    },

    fetchSpendingInsights: async () => {
        try {
            const { data } = await api.get('/insights/spending');
            set({ spendingInsights: data });
            return data;
        } catch (error) {
            console.error('Spending insights error:', error);
        }
    },

    fetchLessons: async () => {
        try {
            const { data } = await api.get('/content/lessons');
            set({ lessons: data.lessons });
        } catch (error) {
            console.error('Lessons error:', error);
        }
    },

    // ─── Predictive Analysis ───────────────────────────────────
    fetchAnomalies: async () => {
        try {
            const { data } = await api.getAnomalies();
            set({ anomalies: data });
            return data;
        } catch (error) {
            console.error('Anomalies error:', error);
        }
    },

    fetchForecast: async (days = 30) => {
        try {
            const { data } = await api.getForecast(days);
            set({ forecast: data });
            return data;
        } catch (error) {
            console.error('Forecast error:', error);
        }
    },

    fetchAdaptiveBudget: async () => {
        try {
            const { data } = await api.getAdaptiveBudget();
            set({ adaptiveBudget: data });
            return data;
        } catch (error) {
            console.error('Adaptive budget error:', error);
        }
    },

    // ─── Learning Progress ─────────────────────────────────────
    fetchLearningProgress: async () => {
        try {
            const { data } = await api.getLearningProgress();
            set({ learningProgress: data });
            return data;
        } catch (error) {
            console.error('Learning progress error:', error);
        }
    },

    fetchLeaderboard: async () => {
        try {
            const { data } = await api.getLeaderboard();
            set({ leaderboard: data.leaderboard || [] });
            return data;
        } catch (error) {
            console.error('Leaderboard error:', error);
        }
    },

    // ─── Chat Rooms ─────────────────────────────────────────────
    fetchChatRooms: async (type) => {
        set({ chatRoomsLoading: true });
        try {
            const { data } = await api.getChatRooms(type);
            set({ chatRooms: data.rooms || [], chatRoomsLoading: false });
            return data.rooms || [];
        } catch (error) {
            set({ chatRoomsLoading: false });
            console.error('Chat rooms error:', error);
            return [];
        }
    },

    createChatRoom: async (type) => {
        try {
            const { data } = await api.createChatRoom(type);
            const newRoom = data.room;
            set((state) => ({
                chatRooms: [newRoom, ...state.chatRooms],
                activeChatRoomId: newRoom.id,
                chatMessages: [],
            }));
            return newRoom;
        } catch (error) {
            console.error('Create room error:', error);
        }
    },

    selectChatRoom: async (roomId) => {
        set({ activeChatRoomId: roomId, chatMessages: [] });
        if (roomId) {
            try {
                const { data } = await api.getChatHistory(roomId);
                set({ chatMessages: data.messages || [] });
            } catch (error) {
                console.error('Room history error:', error);
            }
        }
    },

    deleteChatRoom: async (roomId) => {
        try {
            await api.deleteChatRoom(roomId);
            const { chatRooms, activeChatRoomId } = get();
            const remaining = chatRooms.filter(r => r.id !== roomId);
            const updates = { chatRooms: remaining };
            if (activeChatRoomId === roomId) {
                updates.activeChatRoomId = remaining.length > 0 ? remaining[0].id : null;
                updates.chatMessages = [];
                if (remaining.length > 0) {
                    try {
                        const { data } = await api.getChatHistory(remaining[0].id);
                        updates.chatMessages = data.messages || [];
                    } catch { }
                }
            }
            set(updates);
        } catch (error) {
            console.error('Delete room error:', error);
        }
    },

    renameChatRoom: async (roomId, title) => {
        try {
            await api.renameChatRoom(roomId, title);
            set((state) => ({
                chatRooms: state.chatRooms.map(r => r.id === roomId ? { ...r, title } : r),
            }));
        } catch (error) {
            console.error('Rename room error:', error);
        }
    },

    // ─── Chat ──────────────────────────────────────────────────
    fetchChatHistory: async (roomId) => {
        try {
            const { data } = await api.getChatHistory(roomId);
            set({ chatMessages: data.messages || [] });
        } catch (error) {
            console.error('Chat history error:', error);
        }
    },

    sendChatMessage: async (message) => {
        set({ chatLoading: true });
        const { activeChatRoomId } = get();

        // Optimistic add user message
        const userMsg = {
            id: Date.now().toString(),
            content: message,
            role: 'user',
            createdAt: new Date().toISOString(),
        };

        set((state) => ({
            chatMessages: [...state.chatMessages, userMsg],
        }));

        try {
            const { data } = await api.sendChatMessage(message, activeChatRoomId);

            // Update active room if we got one back
            if (!activeChatRoomId && data.chatRoomId) {
                set({ activeChatRoomId: data.chatRoomId });
                // Refresh rooms list after title is generated
                setTimeout(() => get().fetchChatRooms('AI_CHAT'), 1500);
            } else {
                setTimeout(() => get().fetchChatRooms('AI_CHAT'), 1500);
            }

            const aiMsg = {
                id: data.messageId,
                content: data.response,
                role: 'assistant',
                toolCalls: data.toolsUsed?.join(', '),
                createdAt: new Date().toISOString(),
            };

            set((state) => ({
                chatMessages: [...state.chatMessages, aiMsg],
                chatLoading: false,
            }));

            return data;
        } catch (error) {
            set({ chatLoading: false });

            const errMsg = {
                id: (Date.now() + 1).toString(),
                content: 'Sorry, I could not process your request. Please try again.',
                role: 'assistant',
                createdAt: new Date().toISOString(),
            };

            set((state) => ({
                chatMessages: [...state.chatMessages, errMsg],
            }));

            throw error;
        }
    },

    clearChat: async (roomId) => {
        await api.clearChatHistory(roomId);
        set({ chatMessages: [] });
    },
}));

export default useFinanceStore;
