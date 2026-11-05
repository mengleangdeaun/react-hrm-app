import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import { AuthNavigator } from './AuthNavigator';
import { MainTabNavigator } from './MainTabNavigator';

interface RootNavigatorProps {
    onReady?: () => void;
}

export function RootNavigator({ onReady }: RootNavigatorProps) {
    const { user, isLoading } = useAuth();
    const { isDark } = useAppTheme();

    // While credentials hydrate from SecureStore, native splash screen remains visible
    if (isLoading) {
        return null;
    }

    const navigationTheme = isDark ? DarkTheme : DefaultTheme;

    return (
        <NavigationContainer onReady={onReady} theme={navigationTheme}>
            {user ? <MainTabNavigator /> : <AuthNavigator initialRouteName="Welcome" />}
        </NavigationContainer>
    );
}
