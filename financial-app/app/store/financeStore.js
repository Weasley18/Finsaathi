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

    // Chat
    chatMessages: [],
    chatLoading: false,

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
            const { data } = await api.get('/insights/lessons');
            set({ lessons: data.lessons });
        } catch (error) {
            console.error('Lessons error:', error);
        }
    },

    // ─── Chat ──────────────────────────────────────────────────
    fetchChatHistory: async () => {
        try {
            const { data } = await api.get('/chat/history');
            set({ chatMessages: data.messages });
        } catch (error) {
            console.error('Chat history error:', error);
        }
    },

    sendChatMessage: async (message) => {
        set({ chatLoading: true });

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
            const { data } = await api.post('/chat', { message });

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

            // Add error message
            const errMsg = {
                id: (Date.now() + 1).toString(),
                content: 'Sorry, I could not process your request. Please try again. 🙏',
                role: 'assistant',
                createdAt: new Date().toISOString(),
            };

            set((state) => ({
                chatMessages: [...state.chatMessages, errMsg],
            }));

            throw error;
        }
    },

    clearChat: async () => {
        await api.delete('/chat/history');
        set({ chatMessages: [] });
    },
}));

export default useFinanceStore;
