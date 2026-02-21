import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Send, Sparkles, Trash2, Volume2, Square } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import * as Speech from 'expo-speech';
import useFinanceStore from '../store/financeStore';
import { colors, gradients, glassmorphism } from '../theme';
import { useTranslation } from 'react-i18next';

export default function AIChat({ navigation }) {
  const { t, i18n } = useTranslation();
  const [input, setInput] = useState('');
  const [speakingMsgId, setSpeakingMsgId] = useState(null);
  const flatListRef = useRef(null);
  const { chatMessages, chatLoading, fetchChatHistory, sendChatMessage, clearChat } = useFinanceStore();

  useEffect(() => {
    fetchChatHistory();
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom
    if (flatListRef.current && chatMessages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
    }
  }, [chatMessages]);

  const handleSend = async () => {
    if (!input.trim() || chatLoading) return;
    const msg = input.trim();
    setInput('');
    try {
      await sendChatMessage(msg);
    } catch (error) {
      console.error('Chat error:', error);
    }
  };

  const handleSpeak = async (messageId, text) => {
    if (speakingMsgId === messageId) {
      // Stop speaking
      await Speech.stop();
      setSpeakingMsgId(null);
    } else {
      // Stop anything currently speaking first
      await Speech.stop();
      setSpeakingMsgId(messageId);

      const cleanText = text.replace(/[*_~`]/g, ''); // Strip basic markdown bounds
      const ttsLangMap = {
        en: 'en-IN', hi: 'hi-IN', ta: 'ta-IN', te: 'te-IN',
        bn: 'bn-IN', mr: 'mr-IN', gu: 'gu-IN', kn: 'kn-IN',
        ml: 'ml-IN', pa: 'pa-IN', or: 'or-IN', as: 'as-IN',
      };
      Speech.speak(cleanText, {
        language: ttsLangMap[i18n.language] || 'en-IN',
        pitch: 1.0,
        rate: 1.0,
        onDone: () => setSpeakingMsgId(null),
        onStopped: () => setSpeakingMsgId(null),
        onError: () => setSpeakingMsgId(null),
      });
    }
  };

  // Stop speaking when user exits screen
  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  const quickActions = [
    { label: '📊 How am I doing?', query: 'Give me an overview of my financial health' },
    { label: '💰 Save more', query: 'How can I save more money this month?' },
    { label: '🎯 My goals', query: 'What is the progress on my savings goals?' },
    { label: '🏛️ Govt schemes', query: 'Which government schemes am I eligible for?' },
  ];

  const renderMessage = ({ item }) => {
    const isUser = item.role === 'user';

    return (
      <View style={[styles.messageRow, isUser ? styles.userRow : styles.botRow]}>
        {!isUser && (
          <View style={styles.botAvatar}>
            <Sparkles size={14} color={colors.accentLight} />
          </View>
        )}
        <View style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.botBubble,
        ]}>
          <Text style={[styles.messageText, isUser ? styles.userText : styles.botText]}>
            {item.content}
          </Text>
          {item.toolCalls && (
            <Text style={styles.toolCallsText}>
              📡 Used: {typeof item.toolCalls === 'string' ? item.toolCalls : JSON.stringify(item.toolCalls)}
            </Text>
          )}
          <Text style={styles.messageTime}>
            {new Date(item.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </Text>

          {!isUser && (
            <TouchableOpacity
              style={styles.ttsBtn}
              onPress={() => handleSpeak(item.id, item.content)}
            >
              {speakingMsgId === item.id ? (
                <Square size={14} color={colors.accent} fill={colors.accent} />
              ) : (
                <Volume2 size={16} color={colors.textMuted} />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyChat}>
      <View style={styles.emptyAvatar}>
        <Sparkles size={40} color={colors.brightGold} />
      </View>
      <Text style={styles.emptyTitle}>{t('chat.title')}</Text>
      <Text style={styles.emptySubtitle}>
        I can help with budgets, investments, savings goals, government schemes, and more!
      </Text>

      <View style={styles.quickActionGrid}>
        {quickActions.map((action, i) => (
          <TouchableOpacity
            key={i}
            style={styles.quickActionBtn}
            onPress={() => {
              setInput(action.query);
              setTimeout(() => handleSend(), 100);
            }}
          >
            <Text style={styles.quickActionText}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={gradients.backgroundRoyal} style={styles.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.headerAvatar}>
            <Sparkles size={16} color={colors.accentLight} />
          </View>
          <View>
            <Text style={styles.headerTitle}>{t('chat.title')}</Text>
            <Text style={styles.headerSubtitle}>{t('chat.online')}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={clearChat} style={styles.clearBtn}>
          <Trash2 size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Chat Messages */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.chatArea}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={chatMessages}
          renderItem={renderMessage}
          keyExtractor={(item, index) => item.id || index.toString()}
          contentContainerStyle={[
            styles.messagesList,
            chatMessages.length === 0 && styles.emptyList,
          ]}
          ListEmptyComponent={renderEmpty}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        {/* Typing Indicator */}
        {chatLoading && (
          <View style={[styles.messageRow, styles.botRow]}>
            <View style={styles.botAvatar}>
              <Sparkles size={14} color={colors.accentLight} />
            </View>
            <View style={[styles.messageBubble, styles.botBubble, styles.typingBubble]}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={styles.typingText}>{t('chat.thinking')}</Text>
            </View>
          </View>
        )}

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder={t('chat.placeholder')}
              placeholderTextColor={colors.textMuted}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={handleSend}
              multiline
              maxLength={2000}
              editable={!chatLoading}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!input.trim() || chatLoading) && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!input.trim() || chatLoading}
            >
              <Send size={18} color={input.trim() && !chatLoading ? '#000' : colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  background: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  backBtn: { padding: 8, marginRight: 8 },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  headerAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(186,143,13,0.2)',
    borderWidth: 1, borderColor: colors.accent,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  headerSubtitle: { fontSize: 12, color: colors.textMuted },
  clearBtn: { padding: 8 },
  // Chat
  chatArea: { flex: 1 },
  messagesList: { padding: 16, paddingBottom: 8 },
  emptyList: { flex: 1, justifyContent: 'center' },
  messageRow: { flexDirection: 'row', marginBottom: 12, maxWidth: '85%' },
  userRow: { alignSelf: 'flex-end' },
  botRow: { alignSelf: 'flex-start' },
  botAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(186,143,13,0.2)',
    borderWidth: 1, borderColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 8, marginTop: 4,
  },
  messageBubble: {
    borderRadius: 20, padding: 14, maxWidth: '100%',
  },
  userBubble: {
    backgroundColor: colors.accent,
    borderBottomRightRadius: 4,
  },
  botBubble: {
    ...glassmorphism.card,
    borderBottomLeftRadius: 4,
  },
  messageText: { fontSize: 15, lineHeight: 22 },
  userText: { color: '#000' },
  botText: { color: colors.textPrimary },
  toolCallsText: {
    fontSize: 10, color: colors.textMuted, marginTop: 6,
    fontStyle: 'italic',
  },
  messageTime: {
    fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 4, alignSelf: 'flex-end',
  },
  ttsBtn: {
    position: 'absolute',
    bottom: -15,
    right: 5,
    padding: 6,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 15,
  },
  typingBubble: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
  },
  typingText: {
    color: colors.textMuted, fontSize: 13, marginLeft: 8,
  },
  // Empty State
  emptyChat: { alignItems: 'center', padding: 24 },
  emptyAvatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(186,143,13,0.15)',
    borderWidth: 2, borderColor: colors.accent,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 22, fontWeight: 'bold', color: colors.brightGold, marginBottom: 8 },
  emptySubtitle: {
    fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 24,
    paddingHorizontal: 20,
  },
  quickActionGrid: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10,
  },
  quickActionBtn: {
    ...glassmorphism.card,
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 20,
  },
  quickActionText: { color: colors.textPrimary, fontSize: 13 },
  // Input
  inputBar: {
    padding: 12, paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    borderTopWidth: 1, borderTopColor: colors.divider,
  },
  inputContainer: {
    flexDirection: 'row', alignItems: 'flex-end',
    ...glassmorphism.input,
    paddingLeft: 16, paddingRight: 6, paddingVertical: 6,
  },
  textInput: {
    flex: 1, color: colors.textPrimary, fontSize: 15,
    maxHeight: 100, paddingVertical: 8,
  },
  sendBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
    marginLeft: 8,
  },
  sendBtnDisabled: {
    backgroundColor: colors.surfaceLight,
  },
});
