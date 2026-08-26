import './src/styles/unistyles';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useFonts } from 'expo-font';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider, useAppTheme } from './src/context/ThemeContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { setupNetworkAndFocusManagers } from './src/offline/onlineManager';
import { offlineQueryClient, asyncStoragePersister } from './src/offline/queryPersister';

// Initialize network and focus event listeners
setupNetworkAndFocusManagers();

function AppInner() {
    const { isDark } = useAppTheme();
    return (
        <>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <RootNavigator />
        </>
    );
}

export default function App() {
    const [fontsLoaded] = useFonts({
        'Google Sans': require('./assets/fonts/GoogleSans-Regular.ttf'),
        'Krasar': require('./assets/fonts/Krasar-regular.ttf'),
        'Kantumruy Pro': require('./assets/fonts/KantumruyPro-Regular.ttf'),
    });

    if (!fontsLoaded) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' }}>
                <ActivityIndicator size="large" color="#FF3333" />
            </View>
        );
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
                            <AppInner />
                        </AuthProvider>
                    </LanguageProvider>
                </ThemeProvider>
            </PersistQueryClientProvider>
        </SafeAreaProvider>
    );
}
