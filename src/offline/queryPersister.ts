import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';

export const CACHE_STORAGE_KEY = 'HRMS_OFFLINE_QUERY_CACHE';

/**
 * 7-Day Persistent Query Cache Storage Persister
 */
export const asyncStoragePersister = createAsyncStoragePersister({
    storage: AsyncStorage,
    key: CACHE_STORAGE_KEY,
    throttleTime: 1000,
});

/**
 * Enterprise Query Client configured for Offline-First operation
 */
export const offlineQueryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes fresh
            gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days cache retention
            retry: 2,
            networkMode: 'offlineFirst', // Read immediately from local storage cache when offline
        },
        mutations: {
            networkMode: 'offlineFirst',
            retry: 2,
        },
    },
});
