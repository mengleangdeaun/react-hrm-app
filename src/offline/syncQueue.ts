import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '../api/client';
import { onlineManager } from '@tanstack/react-query';

export interface SyncOperation {
    id: string;
    type: string;
    endpoint: string;
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    payload?: any;
    createdAt: string;
    retryCount: number;
    lastAttempt?: string;
    idempotencyKey: string;
}

export const SYNC_QUEUE_STORAGE_KEY = 'HRMS_OFFLINE_SYNC_QUEUE';
const MAX_RETRIES = 5;

type QueueListener = (items: SyncOperation[]) => void;
const listeners = new Set<QueueListener>();

function notifyListeners(items: SyncOperation[]) {
    listeners.forEach((listener) => listener(items));
}

/**
 * Durable Offline Mutation Queue Manager
 */
class SyncQueueManager {
    private inFlight: boolean = false;

    /**
     * Retrieve all pending sync operations from persistent storage
     */
    async getQueue(): Promise<SyncOperation[]> {
        try {
            const raw = await AsyncStorage.getItem(SYNC_QUEUE_STORAGE_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    /**
     * Overwrite queue in persistent storage and notify subscribers
     */
    private async saveQueue(queue: SyncOperation[]): Promise<void> {
        try {
            await AsyncStorage.setItem(SYNC_QUEUE_STORAGE_KEY, JSON.stringify(queue));
            notifyListeners(queue);
        } catch (e) {
            console.warn('[SyncQueue] Failed to save queue to storage', e);
        }
    }

    /**
     * Add a mutation operation to the persistent offline queue
     */
    async enqueue(
        type: string,
        endpoint: string,
        method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
        payload?: any
    ): Promise<SyncOperation> {
        const queue = await this.getQueue();
        const idempotencyKey = `sync_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

        const operation: SyncOperation = {
            id: idempotencyKey,
            type,
            endpoint,
            method,
            payload,
            createdAt: new Date().toISOString(),
            retryCount: 0,
            idempotencyKey,
        };

        queue.push(operation);
        await this.saveQueue(queue);

        // Attempt drain immediately if online
        if (onlineManager.isOnline()) {
            this.processQueue();
        }

        return operation;
    }

    /**
     * Clear all pending operations from storage
     */
    async clear(): Promise<void> {
        try {
            await AsyncStorage.removeItem(SYNC_QUEUE_STORAGE_KEY);
            notifyListeners([]);
        } catch (e) {
            console.warn('[SyncQueue] Failed to clear queue', e);
        }
    }

    /**
     * Drain the sync queue sequentially with controlled backoff
     */
    async processQueue(): Promise<void> {
        if (this.inFlight || !onlineManager.isOnline()) return;

        this.inFlight = true;
        try {
            const queue = await this.getQueue();
            if (queue.length === 0) return;

            const remaining: SyncOperation[] = [];

            for (const op of queue) {
                try {
                    await apiClient.request({
                        url: op.endpoint,
                        method: op.method,
                        data: op.payload,
                        headers: {
                            'X-Idempotency-Key': op.idempotencyKey,
                        },
                    });
                    // Successfully synced; do not re-enqueue
                } catch (err: any) {
                    const status = err?.response?.status;
                    // If client-error 4xx (unrecoverable except 429), discard to prevent poison pills
                    if (status && status >= 400 && status < 500 && status !== 429) {
                        console.warn(`[SyncQueue] Discarding operation ${op.id} due to 4xx status:`, status);
                        continue;
                    }

                    // Network error or 5xx server error -> retry with exponential backoff
                    const nextRetry = op.retryCount + 1;
                    if (nextRetry <= MAX_RETRIES) {
                        remaining.push({
                            ...op,
                            retryCount: nextRetry,
                            lastAttempt: new Date().toISOString(),
                        });
                    } else {
                        console.warn(`[SyncQueue] Dropping operation ${op.id} after ${MAX_RETRIES} failed attempts`);
                    }
                }
            }

            await this.saveQueue(remaining);
        } finally {
            this.inFlight = false;
        }
    }
}

export const syncQueue = new SyncQueueManager();

// Automatically trigger queue sync when network is restored
onlineManager.subscribe((isOnline) => {
    if (isOnline) {
        syncQueue.processQueue();
    }
});

/**
 * Hook to observe the number of pending synchronization operations
 */
export function useSyncQueue() {
    const [pendingCount, setPendingCount] = useState<number>(0);

    useEffect(() => {
        let isMounted = true;

        syncQueue.getQueue().then((q) => {
            if (isMounted) setPendingCount(q.length);
        });

        const listener: QueueListener = (items) => {
            if (isMounted) setPendingCount(items.length);
        };

        listeners.add(listener);
        return () => {
            isMounted = false;
            listeners.delete(listener);
        };
    }, []);

    const triggerSync = useCallback(() => {
        syncQueue.processQueue();
    }, []);

    return {
        pendingCount,
        hasPending: pendingCount > 0,
        triggerSync,
    };
}
