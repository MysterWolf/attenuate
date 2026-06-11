import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

type HealthLevel = 'pure_signal' | 'mastered' | 'mixed' | 'unmastered' | 'noisy' | 'distorted';

interface WaveParams {
  amplitude: number;
  freq:      number;
  noise:     number;
  speed:     number; // radians per second
}

const PARAMS: Record<HealthLevel, WaveParams> = {
  pure_signal: { amplitude: 0,  freq: 0,   noise: 0,    speed: 0   },
  mastered:    { amplitude: 8,  freq: 1.5, noise: 0.1,  speed: 1.0 },
  mixed:       { amplitude: 12, freq: 2.0, noise: 0.25, speed: 1.5 },
  unmastered:  { amplitude: 16, freq: 2.5, noise: 0.4,  speed: 2.0 },
  noisy:       { amplitude: 18, freq: 3.0, noise: 0.65, speed: 2.8 },
  distorted:   { amplitude: 22, freq: 3.5, noise: 0.95, speed: 4.0 },
};

export const HEALTH_LABELS: Record<HealthLevel, string> = {
  pure_signal: 'Pure Signal',
  mastered:    'Mastered',
  mixed:       'Mixed',
  unmastered:  'Unmastered',
  noisy:       'Noisy',
  distorted:   'Distorted',
};

export function getHealthLevel(unread: number): HealthLevel {
  if (unread === 0)      return 'pure_signal';
  if (unread < 1_000)    return 'mastered';
  if (unread < 10_000)   return 'mixed';
  if (unread < 50_000)   return 'unmastered';
  if (unread < 150_000)  return 'noisy';
  return 'distorted';
}

const BAR_COUNT  = 36;
const BAR_HEIGHT = 36;

function barH(idx: number, phase: number, p: WaveParams): number {
  const t     = idx / BAR_COUNT;
  const sine  = Math.sin(t * p.freq * Math.PI * 2 + phase);
  const seed  = Math.sin(idx * 73.137) * Math.cos(idx * 137.508);
  const raw   = (sine + seed * p.noise) * p.amplitude;
  return Math.max(2, Math.min(BAR_HEIGHT, BAR_HEIGHT / 2 + raw));
}

interface Props {
  unreadCount: number;
  accent: string;
  muted:  string;
}

export function InboxHealthWave({ unreadCount, accent, muted }: Props) {
  const level  = getHealthLevel(unreadCount);
  const params = PARAMS[level];

  const phaseRef = useRef(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    phaseRef.current = 0;
    if (params.speed === 0) return;
    const id = setInterval(() => {
      phaseRef.current += params.speed / 20;
      setTick(t => (t + 1) % 200);
    }, 50);
    return () => clearInterval(id);
  }, [level, params.speed]);

  return (
    <View style={s.container}>
      <Text style={[s.sectionLabel, { color: muted }]}>INBOX HEALTH</Text>
      <Text style={[s.healthLabel, { color: accent }]}>{HEALTH_LABELS[level]}</Text>
      {level === 'pure_signal' ? (
        <View style={s.flatLine}>
          <View style={[s.flatLineFill, { backgroundColor: accent }]} />
          <View style={[s.nullDot, { backgroundColor: accent }]} />
        </View>
      ) : (
        <View style={s.waveRow}>
          {Array.from({ length: BAR_COUNT }, (_, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: barH(i, phaseRef.current, params),
                borderRadius: 2,
                marginHorizontal: 0.5,
                backgroundColor: accent,
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  healthLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 10,
  },
  flatLine: {
    height: BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
  },
  flatLineFill: {
    flex: 1,
    height: 2,
    borderRadius: 1,
  },
  nullDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 6,
  },
  waveRow: {
    height: BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
  },
});
