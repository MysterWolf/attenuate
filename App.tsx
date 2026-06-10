import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/providers/ThemeProvider';
import { MWSSplash } from './src/components/shared/MWSSplash';
import { AppNavigator } from './src/navigation/AppNavigator';
import { APP_NAME, APP_TAGLINE } from './src/constants/config';

function AppContent() {
  const [splashDone, setSplashDone] = useState(false);
  const { resolvedMode } = useTheme();

  if (!splashDone) {
    return (
      <>
        <StatusBar hidden />
        <MWSSplash
          appName={APP_NAME}
          tagline={APP_TAGLINE}
          onComplete={() => setSplashDone(true)}
        />
      </>
    );
  }

  return (
    <>
      <StatusBar style={resolvedMode === 'dark' ? 'light' : 'dark'} />
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
