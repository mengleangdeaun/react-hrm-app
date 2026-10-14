import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '../api/client';
import { onlineManager } from '@tanstack/react-query';
import { offlineQueryClient } from './queryPersister';
import { queryKeys } from '../api/queryKeys';
import { deleteVaultAttachments } from './attachmentVault';

export interface SyncAttachment {
    field: string;
    uri: string;
    name: string;
    type: string;
}

export interface SyncOperation {
    id: string;
    type: 'attendance_punch' | 'leave_request' | 'activity_log' | 'day_off_request' | 'day_off_action' | string;
    endpoint: string;
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    payload?: any;
    isMultipart?: boolean;
    attachments?: SyncAttachment[];
    createdAt: string;
    retryCount: number;
    lastAttempt?: string;
    idempotencyKey: string;
    description?: string;
}

export interface DeadLetterOperation extends SyncOperation {
    failureReason: string;
    failedAt: string;
    statusCode?: number;
}

export const SYNC_QUEUE_STORAGE_KEY = 'HRMS_OFFLINE_SYNC_QUEUE';
export const DEAD_LETTER_STORAGE_KEY = 'HRMS_OFFLINE_DEAD_LETTERS';
const MAX_RETRIES = 5;

type QueueListener = (items: SyncOperation[]) => void;
type SyncingListener = (isSyncing: boolean) => void;

const queueListeners = new Set<QueueListener>();
const syncingListeners = new Set<SyncingListener>();

function notifyQueueListeners(items: SyncOperation[]) {
    queueListeners.forEach((listener) => {
        try {
            listener(items);
        } catch (e) {
            console.warn('[SyncQueue] Listener error:', e);
        }
    });
}

function notifySyncingListeners(isSyncing: boolean) {
    syncingListeners.forEach((listener) => {
        try {
            listener(isSyncing);
        } catch (e) {
            console.warn('[SyncQueue] Syncing listener error:', e);
        }
    });
}

/**
 * Enterprise Offline Mutation Queue Manager
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
            notifyQueueListeners(queue);
        } catch (e) {
            console.warn('[SyncQueue] Failed to save queue to storage', e);
        }
    }

    /**
     * Store a failed operation into the Dead Letter log for auditing
     */
    private async recordDeadLetter(op: SyncOperation, reason: string, statusCode?: number): Promise<void> {
        try {
            const raw = await AsyncStorage.getItem(DEAD_LETTER_STORAGE_KEY);
            const current: DeadLetterOperation[] = raw ? JSON.parse(raw) : [];
            const deadLetterItem: DeadLetterOperation = {
                ...op,
                failureReason: reason,
                failedAt: new Date().toISOString(),
                statusCode,
            };
            current.unshift(deadLetterItem);
            // Cap to last 50 dead letters
            const capped = current.slice(0, 50);
            await AsyncStorage.setItem(DEAD_LETTER_STORAGE_KEY, JSON.stringify(capped));
        } catch (e) {
            console.warn('[SyncQueue] Failed to record dead letter', e);
        }
    }

    /**
     * Retrieve dead-letter logs
     */
    async getDeadLetters(): Promise<DeadLetterOperation[]> {
        try {
            const raw = await AsyncStorage.getItem(DEAD_LETTER_STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    }

    /**
     * Add a mutation operation to the persistent offline queue
     */
    async enqueue(
        type: string,
        endpoint: string,
        method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
        payload?: any,
        options?: {
            isMultipart?: boolean;
            attachments?: SyncAttachment[];
            description?: string;
        }
    ): Promise<SyncOperation> {
        const queue = await this.getQueue();
        const idempotencyKey = `sync_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

        const operation: SyncOperation = {
            id: idempotencyKey,
            type,
            endpoint,
            method,
            payload,
            isMultipart: options?.isMultipart || false,
            attachments: options?.attachments || [],
            createdAt: new Date().toISOString(),
            retryCount: 0,
            idempotencyKey,
            description: options?.description,
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
     * Clear all pending operations from storage (use with caution!)
     */
    async clear(): Promise<void> {
        try {
            await AsyncStorage.removeItem(SYNC_QUEUE_STORAGE_KEY);
            notifyQueueListeners([]);
        } catch (e) {
            console.warn('[SyncQueue] Failed to clear queue', e);
        }
    }

    /**
     * Invalidate associated caches following successful mutation delivery
     */
    private triggerCacheInvalidations(op: SyncOperation) {
        try {
            if (op.type === 'attendance_punch' || op.endpoint.includes('attendance')) {
                offlineQueryClient.invalidateQueries({ queryKey: queryKeys.dashboard.bootstrap });
                offlineQueryClient.invalidateQueries({ queryKey: queryKeys.attendance.all });
                offlineQueryClient.invalidateQueries({ queryKey: queryKeys.attendance.todayShift });
            } else if (op.type === 'leave_request' || op.endpoint.includes('leave')) {
                offlineQueryClient.invalidateQueries({ queryKey: queryKeys.leave.balances });
                offlineQueryClient.invalidateQueries({ queryKey: queryKeys.leave.all });
                offlineQueryClient.invalidateQueries({ queryKey: queryKeys.dashboard.bootstrap });
            } else if (op.type === 'activity_log' || op.endpoint.includes('activities')) {
                offlineQueryClient.invalidateQueries({ queryKey: ['activities'] });
            } else if (op.type.includes('day_off') || op.endpoint.includes('day-off')) {
                offlineQueryClient.invalidateQueries({ queryKey: queryKeys.leave.dayOffRequests });
                offlineQueryClient.invalidateQueries({ queryKey: queryKeys.leave.teamDayOffRequests });
                offlineQueryClient.invalidateQueries({ queryKey: queryKeys.leave.dayOffInfo });
            }
        } catch (e) {
            console.warn('[SyncQueue] Cache invalidation warning:', e);
        }
    }

    /**
     * Drain the sync queue sequentially with controlled backoff
     */
    async processQueue(): Promise<void> {
        if (this.inFlight || !onlineManager.isOnline()) return;

        this.inFlight = true;
        notifySyncingListeners(true);

        try {
            const queue = await this.getQueue();
            if (queue.length === 0) return;

            const remaining: SyncOperation[] = [];

            for (let i = 0; i < queue.length; i++) {
                const op = queue[i];

                try {
                    let requestData: any = op.payload;
                    const requestHeaders: Record<string, string> = {
                        'X-Idempotency-Key': op.idempotencyKey,
                    };

                    // Handle multipart FormData payloads (e.g. photos, documents)
                    if (op.isMultipart || (op.attachments && op.attachments.length > 0)) {
                        const formData = new FormData();

                        // Append scalar payload fields
                        if (op.payload && typeof op.payload === 'object') {
                            Object.entries(op.payload).forEach(([key, val]) => {
                                if (val !== undefined && val !== null) {
                                    if (typeof val === 'object') {
                                        formData.append(key, JSON.stringify(val));
                                    } else {
                                        formData.append(key, String(val));
                                    }
                                }
                            });
                        }

                        // Append file attachments from durable vault
                        if (op.attachments && op.attachments.length > 0) {
                            for (const att of op.attachments) {
                                formData.append(att.field || 'attachments[]', {
                                    uri: att.uri,
                                    name: att.name,
                                    type: att.type || 'image/jpeg',
                                } as any);
                            }
                        }

                        requestData = formData;
                    }

                    await apiClient.request({
                        url: op.endpoint,
                        method: op.method,
                        data: requestData,
                        headers: requestHeaders,
                        transformRequest: op.isMultipart
                            ? [
                                  (data, headers) => {
                                      if (headers) {
                                          delete headers['Content-Type'];
                                      }
                                      return data;
                                  },
                              ]
                            : undefined,
                    });

                    // Successfully delivered to backend! Clean up attachments and invalidate cache
                    if (op.attachments && op.attachments.length > 0) {
                        deleteVaultAttachments(op.attachments.map((a) => a.uri)).catch(() => {});
                    }

                    this.triggerCacheInvalidations(op);
                } catch (err: any) {
                    const status = err?.response?.status;

                    // CRITICAL GUARD: If 401 Unauthorized, token expired while offline.
                    // DO NOT discard punches/records! Keep this op and all remaining ops,
                    // pause the processor, and let the auth system prompt for re-auth.
                    if (status === 401) {
                        console.warn(`[SyncQueue] Halting sync queue drain: token expired (401). Preserving operation ${op.id}`);
                        remaining.push(op, ...queue.slice(i + 1));
                        break;
                    }

                    // If non-recoverable 4xx client-error (400, 422, etc., except 429 rate-limit):
                    // Save to dead-letter log for audit and discard from active queue to prevent poison pill
                    if (status && status >= 400 && status < 500 && status !== 429) {
                        const errMsg = err.response?.data?.message || err.message || `HTTP ${status}`;
                        console.warn(`[SyncQueue] Recording dead letter for operation ${op.id} due to 4xx (${status}):`, errMsg);
                        await this.recordDeadLetter(op, errMsg, status);
                        if (op.attachments && op.attachments.length > 0) {
                            deleteVaultAttachments(op.attachments.map((a) => a.uri)).catch(() => {});
                        }
                        continue;
                    }

                    // Network error, timeout, 429 rate limit, or 5xx server error -> retry with exponential backoff
                    const nextRetry = op.retryCount + 1;
                    if (nextRetry <= MAX_RETRIES) {
                        remaining.push({
                            ...op,
                            retryCount: nextRetry,
                            lastAttempt: new Date().toISOString(),
                        });
                        // Controlled exponential backoff delay (max 4s)
                        const backoffMs = Math.min(800 * Math.pow(2, op.retryCount), 4000);
                        await new Promise((resolve) => setTimeout(resolve, backoffMs));
                    } else {
                        console.warn(`[SyncQueue] Dropping operation ${op.id} after ${MAX_RETRIES} failed attempts into dead letters`);
                        await this.recordDeadLetter(op, `Exceeded ${MAX_RETRIES} retries: ${err?.message || 'Network/Server Error'}`, status);
                        if (op.attachments && op.attachments.length > 0) {
                            deleteVaultAttachments(op.attachments.map((a) => a.uri)).catch(() => {});
                        }
                    }
                }
            }

            await this.saveQueue(remaining);
        } finally {
            this.inFlight = false;
            notifySyncingListeners(false);
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
 * Hook to observe the number of pending synchronization operations and syncing state
 */
export function useSyncQueue() {
    const [pendingCount, setPendingCount] = useState<number>(0);
    const [isSyncing, setIsSyncing] = useState<boolean>(false);

    useEffect(() => {
        let isMounted = true;

        syncQueue.getQueue().then((q) => {
            if (isMounted) setPendingCount(q.length);
        });

        const qListener: QueueListener = (items) => {
            if (isMounted) setPendingCount(items.length);
        };

        const sListener: SyncingListener = (syncing) => {
            if (isMounted) setIsSyncing(syncing);
        };

        queueListeners.add(qListener);
        syncingListeners.add(sListener);

        return () => {
            isMounted = false;
            queueListeners.delete(qListener);
            syncingListeners.delete(sListener);
        };
    }, []);

    const triggerSync = useCallback(() => {
        syncQueue.processQueue();
    }, []);

    return {
        pendingCount,
        hasPending: pendingCount > 0,
        isSyncing,
        triggerSync,
    };
}
