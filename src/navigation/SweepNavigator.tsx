import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SweepHomeScreen } from '../screens/sweep/SweepHomeScreen';
import { SweepPreviewScreen } from '../screens/sweep/SweepPreviewScreen';
import { SweepProgressScreen } from '../screens/sweep/SweepProgressScreen';
import { useTheme } from '../providers/ThemeProvider';

export type SweepStackParamList = {
  SweepHome:     { senderEmail?: string; senderName?: string; senderCount?: number } | undefined;
  SweepPreview:  { senderEmail: string; senderName: string; senderCount: number };
  SweepProgress: { senderEmail: string; senderName: string; senderCount: number };
};

const Stack = createNativeStackNavigator<SweepStackParamList>();

export function SweepNavigator() {
  const { C } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle:       { backgroundColor: C.background },
        headerTintColor:   C.ink,
        headerTitleStyle:  { color: C.ink },
        headerShown:       false,
        contentStyle:      { backgroundColor: C.background },
      }}
    >
      <Stack.Screen name="SweepHome"     component={SweepHomeScreen} />
      <Stack.Screen name="SweepPreview"  component={SweepPreviewScreen} />
      <Stack.Screen name="SweepProgress" component={SweepProgressScreen} />
    </Stack.Navigator>
  );
}
