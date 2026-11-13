import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { PartyPopper, Home, ArrowRight } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';

export default function GoalAchieved({ navigation }) {
  const scaleAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#1a1a1a', '#000000']}
        style={styles.background}
      />

      <View style={styles.content}>
        <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
          <LinearGradient
            colors={['#2a2a2a', '#1e1e1e']}
            style={styles.cardGradient}
          >
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={['#ba8f0d', '#ffd700']}
                style={styles.iconGradient}
              >
                <PartyPopper size={48} color="#000" />
              </LinearGradient>
            </View>

            <Text style={styles.title}>Congratulations!</Text>
            <Text style={styles.subtitle}>You have reached your goal:</Text>

            <View style={styles.goalBox}>
              <Home size={24} color="#ba8f0d" style={styles.goalIcon} />
              <Text style={styles.goalName}>New Home</Text>
            </View>

            <Text style={styles.amount}>₹ 5,00,000</Text>
            <Text style={styles.savedText}>Saved</Text>
          </LinearGradient>
        </Animated.View>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('Dashboard')}
        >
          <Text style={styles.buttonText}>Back to Dashboard</Text>
          <ArrowRight size={20} color="#000" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    borderRadius: 30,
    overflow: 'hidden',
    marginBottom: 40,
    shadowColor: '#ba8f0d',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  cardGradient: {
    padding: 40,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 30,
  },
  iconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    marginBottom: 30,
  },
  goalBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 30,
  },
  goalIcon: {
    marginRight: 10,
  },
  goalName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  amount: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#ba8f0d',
    marginBottom: 4,
  },
  savedText: {
    fontSize: 16,
    color: '#666',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  button: {
    flexDirection: 'row',
    backgroundColor: '#ba8f0d',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 10,
  },
});
