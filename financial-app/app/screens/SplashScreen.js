import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import useAuthStore from '../store/authStore';

const { width, height } = Dimensions.get('window');

export default function SplashScreen({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const meshRotate = useRef(new Animated.Value(0)).current;
  const subtitleFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Slowly rotating gold gradient mesh
    Animated.loop(
      Animated.timing(meshRotate, {
        toValue: 1,
        duration: 12000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Golden shimmer loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0.4,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Logo fade-in + scale
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Subtitle delayed fade
    Animated.timing(subtitleFade, {
      toValue: 1,
      duration: 800,
      delay: 800,
      useNativeDriver: true,
    }).start();

  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      await new Promise(resolve => setTimeout(resolve, 3000)); // Minimum splash time

      try {
        const { token, user } = useAuthStore.getState();
        console.log('[Splash] Auth State:', { token: !!token, role: user?.role });

        if (token && user) {
          if (user.approvalStatus === 'PENDING' && (user.role === 'ADVISOR' || user.role === 'PARTNER')) {
            navigation.replace('WaitingRoom');
          } else if (user.role === 'ADVISOR') {
            navigation.replace('AdvisorDashboard');
          } else if (user.role === 'ADMIN') {
            navigation.replace('Dashboard'); // TODO: Admin screen
          } else {
            navigation.replace('Dashboard');
          }
        } else {
          navigation.replace('LanguageSelection');
        }
      } catch (e) {
        console.error('[Splash] Auth Check Error:', e);
        navigation.replace('LanguageSelection');
      }
    };

    checkAuth();
  }, []);

  const meshSpin = meshRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Royal burgundy background */}
      <LinearGradient
        colors={['#4a0e1e', '#2d0a14', '#1a0610', '#0d0308']}
        locations={[0, 0.35, 0.7, 1]}
        style={styles.background}
      />

      {/* Slowly rotating gold gradient mesh */}
      <Animated.View
        style={[
          styles.meshContainer,
          { transform: [{ rotate: meshSpin }] },
        ]}
      >
        <LinearGradient
          colors={['rgba(186,143,13,0.15)', 'rgba(255,215,0,0.08)', 'rgba(186,143,13,0.12)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.meshGradient}
        />
        <LinearGradient
          colors={['transparent', 'rgba(255,215,0,0.06)', 'rgba(186,143,13,0.1)', 'transparent']}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[styles.meshGradient, { position: 'absolute' }]}
        />
      </Animated.View>

      {/* Radial glow behind logo */}
      <View style={styles.glowContainer}>
        <LinearGradient
          colors={['rgba(186,143,13,0.2)', 'rgba(186,143,13,0.05)', 'transparent']}
          style={styles.glow}
        />
      </View>

      {/* Logo content */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Gold crown/emblem accent */}
        <Animated.Text style={[styles.emblem, { opacity: shimmerAnim }]}>
          ♛
        </Animated.Text>

        {/* Logo text with shimmer */}
        <Animated.Text style={[styles.title, { opacity: shimmerAnim }]}>
          FinSaathi
        </Animated.Text>

        <View style={styles.divider}>
          <LinearGradient
            colors={['transparent', '#ba8f0d', '#ffd700', '#ba8f0d', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.dividerLine}
          />
        </View>

        <Animated.Text style={[styles.subtitle, { opacity: subtitleFade }]}>
          AI-Driven Finance for Bharat
        </Animated.Text>
      </Animated.View>

      {/* Bottom loading indicator */}
      <Animated.View style={[styles.loadingContainer, { opacity: subtitleFade }]}>
        <Text style={styles.loadingText}>Initializing Secure Vault...</Text>
        <View style={styles.loadingDots}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.dot} />
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a0610',
    alignItems: 'center',
    justifyContent: 'center',
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  meshContainer: {
    position: 'absolute',
    width: width * 2,
    height: width * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meshGradient: {
    width: '100%',
    height: '100%',
    borderRadius: width,
  },
  glowContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  emblem: {
    fontSize: 48,
    color: '#ffd700',
    marginBottom: 8,
    textShadowColor: 'rgba(255, 215, 0, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  title: {
    fontSize: 52,
    fontWeight: '300',
    color: '#ffd700',
    letterSpacing: 4,
    fontFamily: 'serif',
    textShadowColor: 'rgba(255, 215, 0, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 15,
  },
  divider: {
    width: 120,
    height: 2,
    marginVertical: 20,
    overflow: 'hidden',
  },
  dividerLine: {
    width: '100%',
    height: '100%',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 215, 0, 0.7)',
    letterSpacing: 3,
    textTransform: 'uppercase',
    fontWeight: '300',
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 80,
    alignItems: 'center',
  },
  loadingText: {
    color: 'rgba(186, 143, 13, 0.6)',
    fontSize: 13,
    letterSpacing: 1,
    marginBottom: 12,
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(186, 143, 13, 0.4)',
  },
});
