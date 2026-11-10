import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { removeOldestQuery, type PersistQueryClientOptions } from '@tanstack/react-query-persist-client';
import { QueryClient, defaultShouldDehydrateQuery } from '@tanstack/react-query';
import * as Application from 'expo-application';

export const CACHE_STORAGE_KEY = 'HRMS_OFFLINE_QUERY_CACHE';

/** How long cached server data stays usable offline. Must match `gcTime` and the persister `maxAge`. */
export const OFFLINE_CACHE_MAX_AGE = 1000 * 60 * 60 * 24 * 7;

/**
 * Android stores each AsyncStorage value in one SQLite row, which cannot be read back once it
 * exceeds the ~2 MB cursor window. Stay well below that; the persister drops the oldest queries
 * until the payload fits instead of silently failing to persist anything.
 */
const MAX_PERSISTED_BYTES = 1_500_000;

/**
 * 7-Day Persistent Query Cache Storage Persister
 */
export const asyncStoragePersister = createAsyncStoragePersister({
    storage: AsyncStorage,
    key: CACHE_STORAGE_KEY,
    // The whole cache is re-serialized on every write. 1s made low-end devices stringify
    // hundreds of KB on the JS thread during scrolling/pagination; 3s batches those bursts.
    throttleTime: 3000,
    serialize: (client) => {
        const json = JSON.stringify(client);
        if (json.length > MAX_PERSISTED_BYTES) {
            // Caught by the persister, which calls `retry` and serializes the trimmed client again
            throw new Error('Offline cache exceeds the persisted size budget');
        }
        return json;
    },
    retry: removeOldestQuery,
});

/** Only the first pages of an infinite list are kept on disk; the rest is refetched on demand. */
const MAX_PERSISTED_PAGES = 2;

export const persistOptions: Omit<PersistQueryClientOptions, 'queryClient'> = {
    persister: asyncStoragePersister,
    // Without this the persisted cache is discarded after the 24h default, despite the 7-day gcTime
    maxAge: OFFLINE_CACHE_MAX_AGE,
    // A new app version may change response handling: never hydrate it with an older build's cache
    buster: Application.nativeApplicationVersion ?? 'dev',
    dehydrateOptions: {
        shouldDehydrateQuery: (query) =>
            // Successful queries only: no pending promises, no error states
            defaultShouldDehydrateQuery(query) && query.meta?.persist !== false,
        serializeData: (data: any) => {
            if (data && Array.isArray(data.pages) && Array.isArray(data.pageParams) && data.pages.length > MAX_PERSISTED_PAGES) {
                return {
                    ...data,
                    pages: data.pages.slice(0, MAX_PERSISTED_PAGES),
                    pageParams: data.pageParams.slice(0, MAX_PERSISTED_PAGES),
                };
            }
            return data;
        },
    },
};

/**
 * Enterprise Query Client configured for Offline-First operation
 */
export const offlineQueryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes fresh
            gcTime: OFFLINE_CACHE_MAX_AGE, // 7 days cache retention
            // 4xx responses are deterministic: retrying them only wastes battery, data and server time
            retry: (failureCount, error: any) => {
                const status = error?.response?.status;
                if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) return false;
                return failureCount < 2;
            },
            networkMode: 'offlineFirst', // Read immediately from local storage cache when offline
        },
        mutations: {
            networkMode: 'offlineFirst',
            // Mutations are not safe to replay blindly; offline delivery is the sync queue's job
            retry: false,
        },
    },
});

/**
 * Completely purges query caches (in-memory and AsyncStorage) on user logout
 * to ensure absolute data isolation across accounts on shared employee devices.
 */
export async function clearOfflineQueryCache(): Promise<void> {
    try {
        offlineQueryClient.clear();
        await AsyncStorage.removeItem(CACHE_STORAGE_KEY);
    } catch (e) {
        console.warn('[queryPersister] Failed to clear offline cache:', e);
    }
}

