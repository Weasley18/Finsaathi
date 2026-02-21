import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

// ──────────────────────────────────────────────
// FadeInUp — Slides in from below with fade
// ──────────────────────────────────────────────
export function FadeInUp({ children, delay = 0, duration = 500, distance = 20, style }) {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(distance)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, {
                toValue: 1,
                duration,
                delay,
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: 0,
                duration,
                delay,
                easing: Easing.out(Easing.back(1.2)),
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    return (
        <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
            {children}
        </Animated.View>
    );
}

// ──────────────────────────────────────────────
// FadeIn — Simple opacity fade
// ──────────────────────────────────────────────
export function FadeIn({ children, delay = 0, duration = 600, style }) {
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(opacity, {
            toValue: 1,
            duration,
            delay,
            useNativeDriver: true,
        }).start();
    }, []);

    return (
        <Animated.View style={[style, { opacity }]}>
            {children}
        </Animated.View>
    );
}

// ──────────────────────────────────────────────
// ScaleIn — Pops in with scale
// ──────────────────────────────────────────────
export function ScaleIn({ children, delay = 0, duration = 400, style }) {
    const scale = useRef(new Animated.Value(0.8)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(scale, {
                toValue: 1,
                friction: 5,
                tension: 80,
                delay,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 1,
                duration: duration / 2,
                delay,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    return (
        <Animated.View style={[style, { opacity, transform: [{ scale }] }]}>
            {children}
        </Animated.View>
    );
}

// ──────────────────────────────────────────────
// SlideInRight — Slides from right edge
// ──────────────────────────────────────────────
export function SlideInRight({ children, delay = 0, duration = 500, style }) {
    const translateX = useRef(new Animated.Value(60)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(translateX, {
                toValue: 0,
                duration,
                delay,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 1,
                duration: duration * 0.6,
                delay,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    return (
        <Animated.View style={[style, { opacity, transform: [{ translateX }] }]}>
            {children}
        </Animated.View>
    );
}

// ──────────────────────────────────────────────
// PulseGlow — Continuous soft pulsing
// ──────────────────────────────────────────────
export function PulseGlow({ children, style }) {
    const scale = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(scale, {
                    toValue: 1.05,
                    duration: 1500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(scale, {
                    toValue: 1,
                    duration: 1500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    return (
        <Animated.View style={[style, { transform: [{ scale }] }]}>
            {children}
        </Animated.View>
    );
}

// ──────────────────────────────────────────────
// StaggeredList — Staggers children with delay
// ──────────────────────────────────────────────
export function StaggeredList({ children, staggerDelay = 80 }) {
    return (
        <View>
            {React.Children.map(children, (child, index) => (
                <FadeInUp delay={index * staggerDelay} distance={15}>
                    {child}
                </FadeInUp>
            ))}
        </View>
    );
}

// ──────────────────────────────────────────────
// AnimatedCounter — Counts up to a number
// ──────────────────────────────────────────────
export function AnimatedCounter({ value, duration = 1000, prefix = '', suffix = '', style }) {
    const animatedValue = useRef(new Animated.Value(0)).current;
    const [display, setDisplay] = React.useState('0');

    useEffect(() => {
        animatedValue.setValue(0);
        Animated.timing(animatedValue, {
            toValue: value,
            duration,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
        }).start();

        const listenerId = animatedValue.addListener(({ value: v }) => {
            setDisplay(Math.round(v).toLocaleString('en-IN'));
        });

        return () => animatedValue.removeListener(listenerId);
    }, [value]);

    return (
        <Animated.Text style={style}>
            {prefix}{display}{suffix}
        </Animated.Text>
    );
}

// ──────────────────────────────────────────────
// GlassShimmer — Shimmer loading placeholder
// ──────────────────────────────────────────────
export function GlassShimmer({ width = '100%', height = 20, borderRadius = 8, style }) {
    const shimmer = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.timing(shimmer, {
                toValue: 1,
                duration: 1200,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();
    }, []);

    return (
        <Animated.View
            style={[
                {
                    width,
                    height,
                    borderRadius,
                    backgroundColor: 'rgba(186, 143, 13, 0.08)',
                    opacity: shimmer.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [0.3, 0.8, 0.3],
                    }),
                },
                style,
            ]}
        />
    );
}
