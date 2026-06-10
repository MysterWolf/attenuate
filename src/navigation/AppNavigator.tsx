import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../providers/ThemeProvider';
import { StatsScreen } from '../screens/StatsScreen';
import { SweepNavigator } from './SweepNavigator';
import { HistoryScreen } from '../screens/HistoryScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

export type TabParamList = {
  Stats:    undefined;
  Sweep:    undefined;
  History:  undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

const TAB_ICONS: Record<string, string> = {
  Stats:    '◎',
  Sweep:    '⊘',
  History:  '≡',
  Settings: '⚙',
};

export function AppNavigator() {
  const { C } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor:    C.surface,
          borderTopColor:     C.border,
          borderTopWidth:     1,
          height:             56 + insets.bottom,
          paddingBottom:      insets.bottom,
        },
        tabBarActiveTintColor:   C.accent,
        tabBarInactiveTintColor: C.muted,
        tabBarIcon: ({ color }) => (
          <Text style={{ fontSize: 18, color }}>{TAB_ICONS[route.name]}</Text>
        ),
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: -2,
        },
      })}
    >
      <Tab.Screen name="Stats"    component={StatsScreen} />
      <Tab.Screen name="Sweep"    component={SweepNavigator} />
      <Tab.Screen name="History"  component={HistoryScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
