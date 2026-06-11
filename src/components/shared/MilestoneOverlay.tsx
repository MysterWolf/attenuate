import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';

const COPY: Record<number, string> = {
  1_000:   'Noise reduced.',
  5_000:   'Signal improving.',
  10_000:  'The inbox bows.',
  25_000:  'Serious attenuation.',
  50_000:  'Inbox decimated.',
  100_000: 'Pure signal achieved.',
};

function fmt(n: number): string {
  return n.toLocaleString();
}

interface Props {
  value:     number | null;
  onDismiss: () => void;
}

export function MilestoneOverlay({ value, onDismiss }: Props) {
  const scale   = useRef(new Animated.Value(0.7)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (value == null) return;
    scale.setValue(0.7);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(scale,   { toValue: 1, useNativeDriver: true, tension: 120, friction: 8 }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [value, scale, opacity]);

  if (value == null) return null;

  return (
    <Modal transparent animationType="none" visible statusBarTranslucent onRequestClose={onDismiss}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onDismiss}>
        <Animated.View style={[s.card, { opacity, transform: [{ scale }] }]}>
          <Text style={s.number}>{fmt(value)}</Text>
          <Text style={s.unit}>EMAILS ELIMINATED</Text>
          <Text style={s.copy}>{COPY[value] ?? ''}</Text>
          <Text style={s.hint}>tap to continue</Text>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.93)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  number: {
    fontSize: 80,
    fontWeight: '700',
    letterSpacing: -3,
    color: '#00C2A8',
    lineHeight: 88,
  },
  unit: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2.5,
    color: '#5A5870',
  },
  copy: {
    fontSize: 20,
    fontWeight: '500',
    color: '#E8E6F0',
    textAlign: 'center',
    marginTop: 8,
  },
  hint: {
    fontSize: 12,
    color: '#5A5870',
    marginTop: 40,
  },
});
