import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { AuthNavigator } from './AuthNavigator';
import { MainTabNavigator } from './MainTabNavigator';

interface RootNavigatorProps {
    onReady?: () => void;
}

export function RootNavigator({ onReady }: RootNavigatorProps) {
    const { user, isLoading } = useAuth();

    useEffect(() => {
        if (!isLoading && onReady) {
            onReady();
        }
    }, [isLoading, onReady]);

    if (isLoading) {
        return null;
    }

    return (
        <NavigationContainer>
            {user ? <MainTabNavigator /> : <AuthNavigator initialRouteName="Welcome" />}
        </NavigationContainer>
    );
}

