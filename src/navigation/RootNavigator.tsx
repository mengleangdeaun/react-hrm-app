import React, { useEffect, useState, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { AuthNavigator } from './AuthNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import { FlashScreen } from '../components/startup/FlashScreen';

const MIN_FLASH_DURATION_MS = 400;
const WATCHDOG_TIMEOUT_MS = 1500;

interface RootNavigatorProps {
    onReady?: () => void;
}

export function RootNavigator({ onReady }: RootNavigatorProps) {
    const { user, isLoading } = useAuth();
    const [isFlashActive, setIsFlashActive] = useState<boolean>(true);
    const minTimerElapsedRef = useRef<boolean>(false);

    useEffect(() => {
        // Enforce a smooth, minimal flash screen display window on every launch
        const minTimer = setTimeout(() => {
            minTimerElapsedRef.current = true;
            // If auth restoration is already complete, transition immediately
            if (!isLoading) {
                setIsFlashActive(false);
            }
        }, MIN_FLASH_DURATION_MS);

        // Safety watchdog: guarantees app never deadlocks if storage or hydration hangs
        const watchdog = setTimeout(() => {
            setIsFlashActive(false);
        }, WATCHDOG_TIMEOUT_MS);

        return () => {
            clearTimeout(minTimer);
            clearTimeout(watchdog);
        };
    }, []);

    // Transition as soon as both the minimum timer and auth loading have resolved
    useEffect(() => {
        if (!isLoading && minTimerElapsedRef.current) {
            setIsFlashActive(false);
        }
    }, [isLoading]);

    // ── Phase 1: Show ultra-fast React Native Flash Screen on every launch ────
    if (isFlashActive) {
        return <FlashScreen onReady={onReady} />;
    }

    // ── Phase 2: Render targeted application navigation tree ─────────────────
    return (
        <NavigationContainer>
            {user ? <MainTabNavigator /> : <AuthNavigator initialRouteName="Welcome" />}
        </NavigationContainer>
    );
}
