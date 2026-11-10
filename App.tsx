import './src/styles/unistyles';
import React, { useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider, useAppTheme } from './src/context/ThemeContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { setupNetworkAndFocusManagers } from './src/offline/onlineManager';
import { offlineQueryClient, persistOptions } from './src/offline/queryPersister';
import { AppErrorBoundary } from './src/components/common/AppErrorBoundary';

// Keep native splash screen visible while loading resources
SplashScreen.preventAutoHideAsync().catch(() => {});

// Initialize network and focus event listeners
setupNetworkAndFocusManagers();

function AppInner({ onReady }: { onReady?: () => void }) {
    const { isDark } = useAppTheme();
    return (
        <>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <RootNavigator onReady={onReady} />
        </>
    );
}

export default function App() {
    const [fontsLoaded, fontError] = useFonts({
        'Inter-Regular': require('./assets/fonts/Inter_18pt-Regular.ttf'),
        'Inter-Medium': require('./assets/fonts/Inter_18pt-Medium.ttf'),
        'Inter-SemiBold': require('./assets/fonts/Inter_18pt-SemiBold.ttf'),
        'Inter-Bold': require('./assets/fonts/Inter_18pt-Bold.ttf'),
        'InterKhmerLooped-Regular': require('./assets/fonts/InterKhmerLooped-Regular.ttf'),
        'InterKhmerLooped-Medium': require('./assets/fonts/InterKhmerLooped-Medium.ttf'),
        'InterKhmerLooped-SemiBold': require('./assets/fonts/InterKhmerLooped-SemiBold.ttf'),
        'InterKhmerLooped-Bold': require('./assets/fonts/InterKhmerLooped-Bold.ttf'),
    });

    // A font that fails to load must not strand the user on the splash screen forever:
    // continue with the system font instead.
    const fontsReady = fontsLoaded || !!fontError;

    const handleReady = useCallback(() => {
        SplashScreen.hideAsync().catch(() => {});
    }, []);

    if (!fontsReady) {
        return null;
    }

    return (
        <SafeAreaProvider>
            <AppErrorBoundary>
                <PersistQueryClientProvider client={offlineQueryClient} persistOptions={persistOptions}>
                    <ThemeProvider>
                        <LanguageProvider>
                            <AuthProvider>
                                <AppInner onReady={handleReady} />
                            </AuthProvider>
                        </LanguageProvider>
                    </ThemeProvider>
                </PersistQueryClientProvider>
            </AppErrorBoundary>
        </SafeAreaProvider>
    );
}

