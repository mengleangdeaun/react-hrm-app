import './src/styles/unistyles';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider, useAppTheme } from './src/context/ThemeContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { RootNavigator } from './src/navigation/RootNavigator';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 2,
            staleTime: 1000 * 60 * 5,
        },
    },
});

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
            <QueryClientProvider client={queryClient}>
                <ThemeProvider>
                    <LanguageProvider>
                        <AuthProvider>
                            <AppInner />
                        </AuthProvider>
                    </LanguageProvider>
                </ThemeProvider>
            </QueryClientProvider>
        </SafeAreaProvider>
    );
}
