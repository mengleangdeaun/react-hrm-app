import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { AuthNavigator } from './AuthNavigator';
import { MainTabNavigator } from './MainTabNavigator';

interface RootNavigatorProps {
    onReady?: () => void;
}

export function RootNavigator({ onReady }: RootNavigatorProps) {
    const { user, isLoading } = useAuth();

    // While credentials hydrate from SecureStore, native splash screen remains visible
    if (isLoading) {
        return null;
    }

    return (
        <NavigationContainer onReady={onReady}>
            {user ? <MainTabNavigator /> : <AuthNavigator initialRouteName="Welcome" />}
        </NavigationContainer>
    );
}
