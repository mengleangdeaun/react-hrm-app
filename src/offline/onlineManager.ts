import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { onlineManager, focusManager } from '@tanstack/react-query';

/**
 * Configure TanStack Query Online Manager & Focus Manager for React Native & Web
 */
export function setupNetworkAndFocusManagers() {
    // 1. Online Manager: Synchronize Network Status
    onlineManager.setEventListener((setOnline) => {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
            const handleOnline = () => setOnline(true);
            const handleOffline = () => setOnline(false);

            window.addEventListener('online', handleOnline);
            window.addEventListener('offline', handleOffline);

            return () => {
                window.removeEventListener('online', handleOnline);
                window.removeEventListener('offline', handleOffline);
            };
        }

        return NetInfo.addEventListener((state: NetInfoState) => {
            const isOnline = Boolean(state.isConnected && state.isInternetReachable !== false);
            setOnline(isOnline);
        });
    });

    // 2. Focus Manager: Synchronize App Foreground / Resume
    focusManager.setEventListener((handleFocus) => {
        const onAppStateChange = (status: string) => {
            if (Platform.OS !== 'web') {
                handleFocus(status === 'active');
            }
        };

        const subscription = AppState.addEventListener('change', onAppStateChange);
        return () => subscription.remove();
    });
}

/**
 * Hook to reactively monitor network connectivity status across components
 */
export function useNetworkStatus() {
    const [isOnline, setIsOnline] = useState<boolean>(true);
    const [connectionType, setConnectionType] = useState<string>('unknown');

    useEffect(() => {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
            setIsOnline(navigator.onLine);
            const handleOnline = () => setIsOnline(true);
            const handleOffline = () => setIsOnline(false);

            window.addEventListener('online', handleOnline);
            window.addEventListener('offline', handleOffline);

            return () => {
                window.removeEventListener('online', handleOnline);
                window.removeEventListener('offline', handleOffline);
            };
        }

        const unsubscribe = NetInfo.addEventListener((state) => {
            const online = Boolean(state.isConnected && state.isInternetReachable !== false);
            setIsOnline(online);
            setConnectionType(state.type);
        });

        // Initial check
        NetInfo.fetch().then((state) => {
            setIsOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
            setConnectionType(state.type);
        });

        return () => unsubscribe();
    }, []);

    return { isOnline, connectionType };
}
