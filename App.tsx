import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/providers/ThemeProvider';
import { AuthProvider, useAuth } from './src/providers/AuthProvider';
import { MWSSplash } from './src/components/shared/MWSSplash';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ConnectScreen } from './src/screens/ConnectScreen';
import { APP_NAME, APP_TAGLINE } from './src/constants/config';

// Inner component — can access ThemeProvider and AuthProvider contexts
function AppShell({ onSplashDone }: { onSplashDone: () => void }) {
  const [splashDone, setSplashDone] = useState(false);
  const { resolvedMode }            = useTheme();
  const { authStatus, onAuthSuccess } = useAuth();

  if (!splashDone) {
    return (
      <>
        <StatusBar hidden />
        <MWSSplash
          appName={APP_NAME}
          tagline={APP_TAGLINE}
          onComplete={() => {
            setSplashDone(true);
            onSplashDone(); // notify AuthProvider to start token check
          }}
        />
      </>
    );
  }

  // Brief null while AsyncStorage token read resolves after splash
  if (authStatus === 'checking') return null;

  const statusBarStyle = resolvedMode === 'dark' ? 'light' : 'dark';

  if (authStatus === 'unauthenticated') {
    return (
      <>
        <StatusBar style={statusBarStyle} />
        <ConnectScreen onSuccess={onAuthSuccess} />
      </>
    );
  }

  return (
    <>
      <StatusBar style={statusBarStyle} />
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </>
  );
}

export default function App() {
  // splashDone lives here so AuthProvider can receive it as a prop
  const [splashDone, setSplashDone] = useState(false);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider splashDone={splashDone}>
          <AppShell onSplashDone={() => setSplashDone(true)} />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
