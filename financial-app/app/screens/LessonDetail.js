import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Clock, Brain, Trophy, CheckCircle, BookOpen } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import api from '../services/api';
import { colors, gradients, glassmorphism } from '../theme';

export default function LessonDetail({ navigation, route }) {
  const { lesson } = route.params;
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizzes, setQuizzes] = useState([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [finished, setFinished] = useState(false);
  const [completed, setCompleted] = useState(false);

  const DIFF_COLORS = { Beginner: '#4caf50', Intermediate: '#ff9800', Advanced: '#e74c3c' };

  const startQuiz = async () => {
    setShowQuiz(true);
    setQuizLoading(true);
    try {
      const { data } = await api.getLessonQuizzes(lesson.id);
      setQuizzes(data.quizzes || []);
    } catch { /* ignore */ }
    finally { setQuizLoading(false); }
  };

  const handleSubmit = async () => {
    if (selected === null) return;
    try {
      const { data } = await api.submitQuizAttempt(quizzes[current].id, selected);
      setResult(data);
      setScore(prev => ({ correct: prev.correct + (data.correct ? 1 : 0), total: prev.total + 1 }));
    } catch { setResult({ correct: false, explanation: 'Submission failed' }); }
  };

  const handleNext = async () => {
    if (current + 1 >= quizzes.length) {
      setFinished(true);
      try { await api.completeLesson(lesson.id); setCompleted(true); } catch { /* */ }
    } else {
      setCurrent(c => c + 1);
      setSelected(null);
      setResult(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={gradients.backgroundRoyal} style={styles.background} />

      <View style={styles.content}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <ArrowLeft size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>Lesson</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Lesson content */}
          {!showQuiz && (
            <>
              <LinearGradient colors={gradients.surfaceCard} style={[glassmorphism.card, { padding: 20, marginBottom: 16 }]}>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                  <View style={{ backgroundColor: `${colors.accent}22`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                    <Text style={{ fontSize: 11, color: colors.accent, fontWeight: '600' }}>{lesson.category}</Text>
                  </View>
                  <View style={{ backgroundColor: `${DIFF_COLORS[lesson.difficulty] || colors.accent}20`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                    <Text style={{ fontSize: 11, color: DIFF_COLORS[lesson.difficulty] || colors.accent, fontWeight: '600' }}>{lesson.difficulty}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Clock size={12} color={colors.textMuted} />
                    <Text style={{ fontSize: 11, color: colors.textMuted, marginLeft: 4 }}>{lesson.duration}</Text>
                  </View>
                  {completed && (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <CheckCircle size={12} color="#4caf50" />
                      <Text style={{ fontSize: 11, color: '#4caf50', marginLeft: 4, fontWeight: '600' }}>Done</Text>
                    </View>
                  )}
                </View>
                <Text style={{ fontSize: 20, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 }}>{lesson.title}</Text>
                <Text style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 20, marginBottom: 16 }}>{lesson.description}</Text>
                <View style={{ backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 10, padding: 16 }}>
                  <Text style={{ fontSize: 14, color: colors.textPrimary, lineHeight: 22 }}>{lesson.content}</Text>
                </View>
              </LinearGradient>

              <TouchableOpacity onPress={startQuiz} style={styles.quizBtn}>
                <Brain size={18} color="#000" />
                <Text style={styles.quizBtnText}>Take Quiz</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Quiz section */}
          {showQuiz && (
            <>
              {quizLoading ? (
                <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
              ) : quizzes.length === 0 ? (
                <LinearGradient colors={gradients.surfaceCard} style={[glassmorphism.card, { padding: 32, alignItems: 'center' }]}>
                  <BookOpen size={40} color={colors.textMuted} />
                  <Text style={{ color: colors.textMuted, marginTop: 12 }}>No quizzes for this lesson yet.</Text>
                </LinearGradient>
              ) : finished ? (
                <LinearGradient colors={gradients.surfaceCard} style={[glassmorphism.card, { padding: 32, alignItems: 'center' }]}>
                  <Trophy size={48} color={score.correct / score.total >= 0.7 ? '#4caf50' : '#FF9800'} />
                  <Text style={{ fontSize: 20, fontWeight: '700', color: colors.textPrimary, marginTop: 12 }}>Quiz Complete!</Text>
                  <Text style={{ fontSize: 28, fontWeight: '700', color: score.correct / score.total >= 0.7 ? '#4caf50' : '#FF9800', marginTop: 8 }}>
                    {score.correct}/{score.total} ({Math.round((score.correct / score.total) * 100)}%)
                  </Text>
                  <Text style={{ color: colors.textSecondary, marginTop: 8 }}>
                    {score.correct / score.total >= 0.7 ? 'Great job! You passed!' : 'Keep learning and try again!'}
                  </Text>
                  <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.quizBtn, { marginTop: 20 }]}>
                    <Text style={styles.quizBtnText}>Back to Lessons</Text>
                  </TouchableOpacity>
                </LinearGradient>
              ) : (
                <LinearGradient colors={gradients.surfaceCard} style={[glassmorphism.card, { padding: 20 }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                    <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '600' }}>
                      Question {current + 1} of {quizzes.length}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.accent, fontWeight: '600' }}>
                      Score: {score.correct}/{score.total}
                    </Text>
                  </View>

                  {/* Progress bar */}
                  <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.divider, marginBottom: 16, overflow: 'hidden' }}>
                    <View style={{ width: `${((current + 1) / quizzes.length) * 100}%`, height: '100%', backgroundColor: colors.accent, borderRadius: 2 }} />
                  </View>

                  <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginBottom: 16 }}>
                    {quizzes[current].question}
                  </Text>

                  {quizzes[current].options?.map((opt, i) => {
                    let bg = 'rgba(255,255,255,0.05)';
                    let border = colors.divider;
                    if (result) {
                      if (i === result.correctIndex) { bg = 'rgba(76,175,80,0.15)'; border = '#4caf50'; }
                      else if (i === selected && !result.correct) { bg = 'rgba(244,67,54,0.15)'; border = '#F44336'; }
                    } else if (i === selected) { bg = `${colors.accent}15`; border = colors.accent; }
                    return (
                      <TouchableOpacity key={i} onPress={() => !result && setSelected(i)} disabled={!!result}
                        style={[styles.optionBtn, { backgroundColor: bg, borderColor: border }]}>
                        <Text style={{ fontWeight: '600', color: colors.accent, marginRight: 8 }}>{String.fromCharCode(65 + i)}.</Text>
                        <Text style={{ flex: 1, color: colors.textPrimary, fontSize: 14 }}>{opt}</Text>
                      </TouchableOpacity>
                    );
                  })}

                  {result && result.explanation ? (
                    <View style={{
                      marginTop: 12, padding: 12, borderRadius: 8,
                      backgroundColor: result.correct ? 'rgba(76,175,80,0.1)' : 'rgba(255,152,0,0.1)',
                    }}>
                      <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 18 }}>
                        <Text style={{ fontWeight: '700' }}>{result.correct ? '✓ Correct! ' : '✗ Incorrect. '}</Text>
                        {result.explanation}
                      </Text>
                    </View>
                  ) : null}

                  <View style={{ alignItems: 'flex-end', marginTop: 16 }}>
                    {!result ? (
                      <TouchableOpacity onPress={handleSubmit} disabled={selected === null}
                        style={[styles.quizBtn, selected === null && { opacity: 0.4 }]}>
                        <Text style={styles.quizBtnText}>Submit</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity onPress={handleNext} style={styles.quizBtn}>
                        <Text style={styles.quizBtnText}>
                          {current + 1 >= quizzes.length ? 'Finish' : 'Next →'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </LinearGradient>
              )}
            </>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  background: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  content: { flex: 1 },
  scrollContent: { padding: 24 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24,
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary },
  quizBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.accent, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10,
  },
  quizBtnText: { color: '#000', fontWeight: '700', fontSize: 15 },
  optionBtn: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, borderRadius: 10, borderWidth: 2, marginBottom: 8,
  },
});
