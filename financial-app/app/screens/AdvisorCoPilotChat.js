import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Send, Cpu, Plus } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import api from '../services/api';
import { colors, gradients, glassmorphism } from '../theme';

export default function AdvisorCoPilotChat({ navigation }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [rooms, setRooms] = useState([]);
    const [activeRoomId, setActiveRoomId] = useState(null);
    const [roomsLoading, setRoomsLoading] = useState(true);
    const [renameModalVisible, setRenameModalVisible] = useState(false);
    const [renameTitle, setRenameTitle] = useState('');
    const [renameRoomId, setRenameRoomId] = useState(null);
    const flatListRef = useRef(null);

    const suggestions = [
        'Which clients need attention?',
        'Portfolio risk summary',
        'Recommend SIP for low-income clients',
        'Insurance gap analysis',
    ];

    // Load rooms on mount
    useEffect(() => {
        (async () => {
            setRoomsLoading(true);
            try {
                const res = await api.getChatRooms('COPILOT');
                const loadedRooms = res.data?.rooms || [];
                setRooms(loadedRooms);
                if (loadedRooms.length > 0) {
                    setActiveRoomId(loadedRooms[0].id);
                    await loadMessages(loadedRooms[0].id);
                }
            } catch { setRooms([]); }
            setRoomsLoading(false);
        })();
    }, []);

    const loadMessages = async (roomId) => {
        if (!roomId) { setMessages([]); return; }
        try {
            const res = await api.getChatHistory(roomId);
            setMessages(res.data?.messages || []);
        } catch { setMessages([]); }
    };

    const selectRoom = async (roomId) => {
        if (roomId === activeRoomId) return;
        setActiveRoomId(roomId);
        setMessages([]);
        await loadMessages(roomId);
    };

    const handleNewRoom = async () => {
        try {
            const res = await api.createChatRoom('COPILOT');
            const newRoom = res.data?.room;
            if (newRoom) {
                setRooms(prev => [newRoom, ...prev]);
                setActiveRoomId(newRoom.id);
                setMessages([]);
            }
        } catch { }
    };

    const handleRoomLongPress = (room) => {
        Alert.alert(
            room.title || 'New Session',
            'What would you like to do?',
            [
                {
                    text: 'Rename',
                    onPress: () => {
                        setRenameRoomId(room.id);
                        setRenameTitle(room.title || '');
                        setRenameModalVisible(true);
                    },
                },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        Alert.alert('Delete Session', 'Are you sure?', [
                            { text: 'Cancel', style: 'cancel' },
                            {
                                text: 'Delete', style: 'destructive',
                                onPress: async () => {
                                    try {
                                        await api.deleteChatRoom(room.id);
                                        const remaining = rooms.filter(r => r.id !== room.id);
                                        setRooms(remaining);
                                        if (activeRoomId === room.id) {
                                            if (remaining.length > 0) {
                                                setActiveRoomId(remaining[0].id);
                                                await loadMessages(remaining[0].id);
                                            } else {
                                                setActiveRoomId(null);
                                                setMessages([]);
                                            }
                                        }
                                    } catch { }
                                },
                            },
                        ]);
                    },
                },
                { text: 'Cancel', style: 'cancel' },
            ]
        );
    };

    const handleSaveRename = async () => {
        if (renameTitle.trim() && renameRoomId) {
            try {
                await api.renameChatRoom(renameRoomId, renameTitle.trim());
                setRooms(prev => prev.map(r => r.id === renameRoomId ? { ...r, title: renameTitle.trim() } : r));
            } catch { }
        }
        setRenameModalVisible(false);
        setRenameRoomId(null);
        setRenameTitle('');
    };

    const refreshRooms = async () => {
        try {
            const res = await api.getChatRooms('COPILOT');
            setRooms(res.data?.rooms || []);
        } catch { }
    };

    const handleSend = async (text) => {
        const msg = (text || input).trim();
        if (!msg || loading) return;
        setInput('');
        setMessages(prev => [...prev, { id: Date.now(), role: 'user', content: msg }]);
        setLoading(true);
        try {
            const res = await api.advisorCoPilotChat(msg, activeRoomId);
            const data = res.data || res;

            if (!activeRoomId && data.chatRoomId) {
                setActiveRoomId(data.chatRoomId);
                setTimeout(() => refreshRooms(), 1500);
            } else {
                setTimeout(() => refreshRooms(), 1500);
            }

            setMessages(prev => [...prev, {
                id: Date.now() + 1, role: 'assistant',
                content: data.response || 'No response',
            }]);
        } catch {
            setMessages(prev => [...prev, {
                id: Date.now() + 1, role: 'assistant',
                content: 'Sorry, something went wrong. Try again.',
            }]);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (flatListRef.current && messages.length > 0)
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
    }, [messages]);

    const renderMessage = ({ item }) => {
        const isUser = item.role === 'user';
        return (
            <View style={[styles.msgRow, isUser && styles.msgRowUser]}>
                {!isUser && (
                    <View style={styles.avatarBot}><Cpu size={16} color={colors.accent} /></View>
                )}
                <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
                    <Text style={[styles.bubbleText, isUser && { color: '#000' }]}>{item.content}</Text>
                </View>
            </View>
        );
    };

    return (
        <LinearGradient colors={gradients.background} style={{ flex: 1 }}>
            <SafeAreaView style={{ flex: 1 }}>
                <StatusBar style="light" />

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <ArrowLeft size={22} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerTitle}>AI Co-Pilot</Text>
                        <Text style={styles.headerSub}>Advisor intelligence assistant</Text>
                    </View>
                    <Cpu size={24} color={colors.accent} />
                </View>

                {/* Room Tabs */}
                <View style={styles.roomTabsContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.roomTabsScroll}>
                        <TouchableOpacity style={styles.newRoomBtn} onPress={handleNewRoom}>
                            <Plus size={16} color="#000" />
                        </TouchableOpacity>
                        {rooms.map(room => (
                            <TouchableOpacity
                                key={room.id}
                                style={[styles.roomTab, activeRoomId === room.id && styles.roomTabActive]}
                                onPress={() => selectRoom(room.id)}
                                onLongPress={() => handleRoomLongPress(room)}
                            >
                                <Text
                                    style={[styles.roomTabText, activeRoomId === room.id && styles.roomTabTextActive]}
                                    numberOfLines={1}
                                >
                                    {room.title || 'New Session'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                        {rooms.length === 0 && !roomsLoading && (
                            <Text style={styles.noRoomsText}>Tap + to start a session</Text>
                        )}
                    </ScrollView>
                </View>

                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        renderItem={renderMessage}
                        keyExtractor={item => String(item.id)}
                        style={{ flex: 1, paddingHorizontal: 16 }}
                        contentContainerStyle={{ paddingVertical: 12 }}
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <Cpu size={48} color={colors.textMuted} strokeWidth={1} />
                                <Text style={styles.emptyText}>Ask your AI Co-Pilot anything about your clients</Text>
                                <View style={styles.suggestions}>
                                    {suggestions.map(s => (
                                        <TouchableOpacity key={s} style={styles.suggestionChip} onPress={() => handleSend(s)}>
                                            <Text style={styles.suggestionText}>{s}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        }
                    />

                    {loading && (
                        <View style={styles.typingRow}>
                            <View style={styles.avatarBot}><Cpu size={14} color={colors.accent} /></View>
                            <View style={styles.bubbleBot}>
                                <ActivityIndicator size="small" color={colors.accent} />
                            </View>
                        </View>
                    )}

                    {/* Input */}
                    <View style={styles.inputBar}>
                        <TextInput
                            style={styles.input}
                            value={input}
                            onChangeText={setInput}
                            placeholder="Ask your co-pilot..."
                            placeholderTextColor={colors.textMuted}
                            onSubmitEditing={() => handleSend()}
                        />
                        <TouchableOpacity
                            onPress={() => handleSend()}
                            disabled={!input.trim() || loading}
                            style={[styles.sendBtn, (!input.trim() || loading) && { opacity: 0.4 }]}
                        >
                            <Send size={18} color="#000" />
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>

                {/* Rename Modal */}
                <Modal visible={renameModalVisible} transparent animationType="fade">
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Rename Session</Text>
                            <TextInput
                                style={styles.modalInput}
                                value={renameTitle}
                                onChangeText={setRenameTitle}
                                placeholder="Enter new name"
                                placeholderTextColor={colors.textMuted}
                                autoFocus
                            />
                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={styles.modalBtnCancel}
                                    onPress={() => { setRenameModalVisible(false); setRenameRoomId(null); }}
                                >
                                    <Text style={styles.modalBtnCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.modalBtnSave} onPress={handleSaveRename}>
                                    <Text style={styles.modalBtnSaveText}>Save</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: colors.divider, gap: 12,
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
    headerSub: { fontSize: 12, color: colors.textMuted },
    // Room Tabs
    roomTabsContainer: {
        borderBottomWidth: 1, borderBottomColor: colors.divider,
        backgroundColor: 'rgba(0,0,0,0.15)',
    },
    roomTabsScroll: {
        paddingHorizontal: 12, paddingVertical: 8, gap: 8,
        flexDirection: 'row', alignItems: 'center',
    },
    newRoomBtn: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: colors.accent,
        alignItems: 'center', justifyContent: 'center',
        marginRight: 4,
    },
    roomTab: {
        paddingHorizontal: 14, paddingVertical: 8,
        borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.06)',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
        maxWidth: 140,
    },
    roomTabActive: {
        backgroundColor: 'rgba(186,143,13,0.15)',
        borderColor: colors.accent,
    },
    roomTabText: { fontSize: 13, color: colors.textSecondary },
    roomTabTextActive: { color: colors.accent, fontWeight: '600' },
    noRoomsText: { fontSize: 13, color: colors.textMuted, paddingHorizontal: 8, paddingVertical: 6 },
    // Messages
    msgRow: { flexDirection: 'row', marginBottom: 12, gap: 8, alignItems: 'flex-end' },
    msgRowUser: { flexDirection: 'row-reverse' },
    avatarBot: {
        width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(186,143,13,0.15)',
        alignItems: 'center', justifyContent: 'center',
    },
    bubble: { maxWidth: '75%', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 16 },
    bubbleUser: { backgroundColor: colors.accent, borderBottomRightRadius: 4 },
    bubbleBot: { ...glassmorphism.card, borderBottomLeftRadius: 4 },
    bubbleText: { fontSize: 14, lineHeight: 20, color: colors.textPrimary },
    typingRow: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 8, gap: 8, alignItems: 'flex-end' },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
    emptyText: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
    suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 8, paddingHorizontal: 16 },
    suggestionChip: { ...glassmorphism.card, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20 },
    suggestionText: { fontSize: 12, color: colors.textSecondary },
    inputBar: {
        flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8,
        borderTopWidth: 1, borderTopColor: colors.divider,
    },
    input: {
        flex: 1, ...glassmorphism.input, paddingVertical: 12, paddingHorizontal: 16,
        color: colors.textPrimary, fontSize: 14,
    },
    sendBtn: {
        width: 44, height: 44, borderRadius: 14, backgroundColor: colors.accent,
        alignItems: 'center', justifyContent: 'center',
    },
    // Rename Modal
    modalOverlay: {
        flex: 1, justifyContent: 'center', alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    modalContent: {
        width: '80%', padding: 24, borderRadius: 16,
        backgroundColor: colors.cardBg || '#1a1a2e',
        borderWidth: 1, borderColor: colors.divider,
    },
    modalTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 16 },
    modalInput: {
        padding: 12, borderRadius: 10, fontSize: 15,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderWidth: 1, borderColor: colors.divider,
        color: colors.textPrimary, marginBottom: 16,
    },
    modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
    modalBtnCancel: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
    modalBtnCancelText: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
    modalBtnSave: {
        paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
        backgroundColor: colors.accent,
    },
    modalBtnSaveText: { color: '#000', fontSize: 14, fontWeight: '600' },
});
