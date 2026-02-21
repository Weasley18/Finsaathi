import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Send, MessageSquare, Search, Circle } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import api from '../services/api';
import { colors, gradients, glassmorphism } from '../theme';

export default function DirectMessages({ navigation, route }) {
    const [conversations, setConversations] = useState([]);
    const [selectedUser, setSelectedUser] = useState(route.params?.userId || null);
    const [selectedName, setSelectedName] = useState(route.params?.userName || '');
    const [thread, setThread] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [search, setSearch] = useState('');
    const flatListRef = useRef(null);

    useEffect(() => {
        loadConversations();
        const interval = setInterval(loadConversations, 5000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (selectedUser) {
            loadThread();
            const interval = setInterval(loadThread, 5000);
            return () => clearInterval(interval);
        }
    }, [selectedUser]);

    const loadConversations = async () => {
        try {
            const res = await api.getConversations();
            setConversations(res.data?.conversations || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const loadThread = async () => {
        if (!selectedUser) return;
        try {
            const res = await api.getConversation(selectedUser);
            setThread(res.data?.messages || []);
        } catch (err) { console.error(err); }
    };

    const handleSend = async () => {
        if (!input.trim() || sending) return;
        const msg = input.trim();
        setInput('');
        setThread(prev => [...prev, { id: Date.now(), content: msg, senderId: '__me__', createdAt: new Date().toISOString() }]);
        setSending(true);
        try {
            await api.sendDirectMessage(selectedUser, msg);
        } catch (err) { console.error(err); }
        finally { setSending(false); }
    };

    useEffect(() => {
        if (flatListRef.current && thread.length > 0)
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
    }, [thread]);

    const filteredConvos = conversations.filter(c =>
        !search || c.name?.toLowerCase().includes(search.toLowerCase())
    );

    const formatTime = (d) => {
        const diff = Date.now() - new Date(d).getTime();
        if (diff < 60000) return 'now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
        return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    };

    // Thread view
    if (selectedUser) {
        return (
            <LinearGradient colors={gradients.background} style={{ flex: 1 }}>
                <SafeAreaView style={{ flex: 1 }}>
                    <StatusBar style="light" />
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => setSelectedUser(null)} style={styles.backBtn}>
                            <ArrowLeft size={22} color={colors.textPrimary} />
                        </TouchableOpacity>
                        <View style={styles.headerAvatar}>
                            <Text style={styles.headerAvatarText}>{(selectedName || '?')[0]}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.headerTitle}>{selectedName || 'Chat'}</Text>
                        </View>
                    </View>

                    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                        <FlatList
                            ref={flatListRef}
                            data={thread}
                            renderItem={({ item }) => {
                                const isMe = item.senderId === '__me__' || item.isMine;
                                return (
                                    <View style={[styles.msgRow, isMe && styles.msgRowUser]}>
                                        <View style={[styles.bubble, isMe ? styles.bubbleUser : styles.bubbleBot]}>
                                            <Text style={[styles.bubbleText, isMe && { color: '#000' }]}>{item.content}</Text>
                                            <Text style={[styles.bubbleTime, isMe && { color: 'rgba(0,0,0,0.5)' }]}>{formatTime(item.createdAt)}</Text>
                                        </View>
                                    </View>
                                );
                            }}
                            keyExtractor={item => String(item.id)}
                            style={{ flex: 1, paddingHorizontal: 16 }}
                            contentContainerStyle={{ paddingVertical: 12 }}
                            ListEmptyComponent={
                                <View style={styles.empty}>
                                    <MessageSquare size={40} color={colors.textMuted} strokeWidth={1} />
                                    <Text style={styles.emptyText}>Send a message to start the conversation</Text>
                                </View>
                            }
                        />

                        <View style={styles.inputBar}>
                            <TextInput
                                style={styles.input}
                                value={input}
                                onChangeText={setInput}
                                placeholder="Type a message..."
                                placeholderTextColor={colors.textMuted}
                                onSubmitEditing={handleSend}
                            />
                            <TouchableOpacity
                                onPress={handleSend}
                                disabled={!input.trim() || sending}
                                style={[styles.sendBtn, (!input.trim() || sending) && { opacity: 0.4 }]}
                            >
                                <Send size={18} color="#000" />
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </SafeAreaView>
            </LinearGradient>
        );
    }

    // Conversations list view
    return (
        <LinearGradient colors={gradients.background} style={{ flex: 1 }}>
            <SafeAreaView style={{ flex: 1 }}>
                <StatusBar style="light" />
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <ArrowLeft size={22} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerTitle}>Messages</Text>
                        <Text style={{ fontSize: 12, color: colors.textMuted }}>Direct conversations</Text>
                    </View>
                </View>

                {/* Search */}
                <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
                    <View style={[glassmorphism.input, { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 }]}>
                        <Search size={16} color={colors.textMuted} />
                        <TextInput
                            style={{ flex: 1, paddingVertical: 10, paddingLeft: 8, color: colors.textPrimary, fontSize: 14 }}
                            placeholder="Search conversations..."
                            placeholderTextColor={colors.textMuted}
                            value={search}
                            onChangeText={setSearch}
                        />
                    </View>
                </View>

                {loading ? (
                    <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
                ) : (
                    <FlatList
                        data={filteredConvos}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.convoItem}
                                onPress={() => { setSelectedUser(item.userId); setSelectedName(item.name); }}
                            >
                                <View style={styles.convoAvatar}>
                                    <Text style={styles.convoAvatarText}>{(item.name || '?')[0]}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.convoName}>{item.name}</Text>
                                    <Text style={styles.convoPreview} numberOfLines={1}>
                                        {item.lastMessage || 'No messages yet'}
                                    </Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={styles.convoTime}>{item.lastMessageAt ? formatTime(item.lastMessageAt) : ''}</Text>
                                    {item.unreadCount > 0 && (
                                        <View style={styles.badge}>
                                            <Text style={styles.badgeText}>{item.unreadCount}</Text>
                                        </View>
                                    )}
                                </View>
                            </TouchableOpacity>
                        )}
                        keyExtractor={item => item.userId}
                        style={{ paddingHorizontal: 16 }}
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <MessageSquare size={40} color={colors.textMuted} strokeWidth={1} />
                                <Text style={styles.emptyText}>No conversations yet</Text>
                            </View>
                        }
                    />
                )}
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
    headerAvatar: {
        width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accent,
        alignItems: 'center', justifyContent: 'center',
    },
    headerAvatarText: { fontSize: 16, fontWeight: '700', color: '#000' },
    convoItem: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.divider,
    },
    convoAvatar: {
        width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(186,143,13,0.15)',
        alignItems: 'center', justifyContent: 'center',
    },
    convoAvatarText: { fontSize: 18, fontWeight: '600', color: colors.accent },
    convoName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary, marginBottom: 2 },
    convoPreview: { fontSize: 13, color: colors.textMuted },
    convoTime: { fontSize: 11, color: colors.textMuted, marginBottom: 4 },
    badge: {
        backgroundColor: colors.accent, borderRadius: 10, minWidth: 20, height: 20,
        alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
    },
    badgeText: { fontSize: 11, fontWeight: '700', color: '#000' },
    msgRow: { flexDirection: 'row', marginBottom: 10, gap: 8 },
    msgRowUser: { flexDirection: 'row-reverse' },
    bubble: { maxWidth: '78%', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 16 },
    bubbleUser: { backgroundColor: colors.accent, borderBottomRightRadius: 4 },
    bubbleBot: { ...glassmorphism.card, borderBottomLeftRadius: 4 },
    bubbleText: { fontSize: 14, lineHeight: 20, color: colors.textPrimary },
    bubbleTime: { fontSize: 10, color: colors.textMuted, marginTop: 4, textAlign: 'right' },
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
    empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
    emptyText: { color: colors.textMuted, fontSize: 14 },
});
