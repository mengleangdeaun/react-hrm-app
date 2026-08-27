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
import { offlineQueryClient, asyncStoragePersister } from './src/offline/queryPersister';

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
    const [fontsLoaded] = useFonts({
        'Google Sans': require('./assets/fonts/GoogleSans-Regular.ttf'),
        'Krasar': require('./assets/fonts/Krasar-regular.ttf'),
        'Kantumruy Pro': require('./assets/fonts/KantumruyPro-Regular.ttf'),
    });

    const handleReady = useCallback(async () => {
        if (fontsLoaded) {
            await SplashScreen.hideAsync().catch(() => {});
        }
    }, [fontsLoaded]);

    if (!fontsLoaded) {
        return null;
    }

    return (
        <SafeAreaProvider>
            <PersistQueryClientProvider
                client={offlineQueryClient}
                persistOptions={{ persister: asyncStoragePersister }}
            >
                <ThemeProvider>
                    <LanguageProvider>
                        <AuthProvider>
                            <AppInner onReady={handleReady} />
                        </AuthProvider>
                    </LanguageProvider>
                </ThemeProvider>
            </PersistQueryClientProvider>
        </SafeAreaProvider>
    );
}

