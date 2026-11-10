import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useCallback } from 'react';
import { AppState } from 'react-native';
import { apiClient, AUTH_TOKEN_KEY } from '../api/client';
import { storage } from '../utils/storage';
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
/**
 * Only *server* failures (5xx / 429) count towards this limit. Connectivity failures never do:
 * an employee on a flaky connection must not have an attendance punch discarded just because the
 * device reported "online" a few times before the network was actually usable.
 */
const MAX_RETRIES = 10;
const RETRY_BASE_DELAY_MS = 5000;
const RETRY_MAX_DELAY_MS = 5 * 60 * 1000;

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
    private rerunRequested: boolean = false;
    private retryTimer: ReturnType<typeof setTimeout> | null = null;
    private consecutiveFailures: number = 0;
    /** Serializes every read-modify-write of the persisted queue so concurrent callers cannot clobber each other. */
    private storageLock: Promise<unknown> = Promise.resolve();

    private withStorageLock<T>(task: () => Promise<T>): Promise<T> {
        const run = this.storageLock.then(task, task);
        this.storageLock = run.catch(() => undefined);
        return run;
    }

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
     * Atomically apply a change to the persisted queue and notify subscribers.
     * Throws if the write fails so callers never report "saved offline" for data that was not stored.
     */
    private mutateQueue(mutator: (queue: SyncOperation[]) => SyncOperation[]): Promise<SyncOperation[]> {
        return this.withStorageLock(async () => {
            const next = mutator(await this.getQueue());
            await AsyncStorage.setItem(SYNC_QUEUE_STORAGE_KEY, JSON.stringify(next));
            notifyQueueListeners(next);
            return next;
        });
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
            /**
             * Reuse the key of an online attempt that timed out, so the server can de-duplicate
             * if that first request did in fact arrive.
             */
            idempotencyKey?: string;
        }
    ): Promise<SyncOperation> {
        const idempotencyKey =
            options?.idempotencyKey || `sync_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

        const operation: SyncOperation = {
            id: `op_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
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

        await this.mutateQueue((queue) => [...queue, operation]);

        // Attempt drain immediately if online
        if (onlineManager.isOnline()) {
            this.processQueue().catch(() => {});
        }

        return operation;
    }

    /**
     * Clear all pending operations from storage (use with caution!)
     */
    async clear(): Promise<void> {
        try {
            await this.withStorageLock(async () => {
                await AsyncStorage.removeItem(SYNC_QUEUE_STORAGE_KEY);
                notifyQueueListeners([]);
            });
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
     * Build the HTTP request body for an operation (JSON or multipart).
     */
    private buildRequestData(op: SyncOperation): any {
        if (!(op.isMultipart || (op.attachments && op.attachments.length > 0))) {
            return op.payload;
        }

        const formData = new FormData();

        // Append scalar payload fields
        if (op.payload && typeof op.payload === 'object') {
            Object.entries(op.payload).forEach(([key, val]) => {
                if (val !== undefined && val !== null) {
                    formData.append(key, typeof val === 'object' ? JSON.stringify(val) : String(val));
                }
            });
        }

        // Append file attachments from durable vault
        for (const att of op.attachments || []) {
            formData.append(att.field || 'attachments[]', {
                uri: att.uri,
                name: att.name,
                type: att.type || 'image/jpeg',
            } as any);
        }

        return formData;
    }

    private cleanupAttachments(op: SyncOperation) {
        if (op.attachments && op.attachments.length > 0) {
            deleteVaultAttachments(op.attachments.map((a) => a.uri)).catch(() => {});
        }
    }

    /** Re-attempt a halted drain later, backing off while the server or network stays unhealthy. */
    private scheduleRetry() {
        if (this.retryTimer) return;
        const delay = Math.min(RETRY_BASE_DELAY_MS * Math.pow(2, this.consecutiveFailures), RETRY_MAX_DELAY_MS);
        this.consecutiveFailures += 1;
        this.retryTimer = setTimeout(() => {
            this.retryTimer = null;
            this.processQueue().catch(() => {});
        }, delay);
    }

    private cancelRetry() {
        if (this.retryTimer) {
            clearTimeout(this.retryTimer);
            this.retryTimer = null;
        }
    }

    /**
     * Drain the sync queue sequentially, in the order the user performed the actions.
     *
     * Each operation is removed from (or updated in) storage individually, so operations that are
     * enqueued while a drain is running are never overwritten by a stale snapshot.
     *
     * - success            -> remove, invalidate caches
     * - 401                -> stop; keep everything until the user signs in again
     * - other 4xx          -> dead-letter (the server will never accept it), continue
     * - network / timeout  -> stop; keep everything, retry later (does NOT consume a retry)
     * - 5xx / 429          -> stop; consume a retry, dead-letter only after MAX_RETRIES
     */
    async processQueue(): Promise<void> {
        if (this.inFlight) {
            this.rerunRequested = true;
            return;
        }
        if (!onlineManager.isOnline()) return;
        // Signed out: every request would 401. The queue is drained right after the next login.
        if (!(await storage.getItem(AUTH_TOKEN_KEY))) return;
        if (this.inFlight) return;

        this.inFlight = true;
        this.rerunRequested = false;
        this.cancelRetry();
        notifySyncingListeners(true);

        let halted = false;

        try {
            const attempted = new Set<string>();

            while (!halted) {
                const queue = await this.getQueue();
                const op = queue.find((item) => !attempted.has(item.id));
                if (!op) break;
                attempted.add(op.id);

                const removeOp = () => this.mutateQueue((q) => q.filter((item) => item.id !== op.id));

                try {
                    await apiClient.request({
                        url: op.endpoint,
                        method: op.method,
                        data: this.buildRequestData(op),
                        headers: { 'X-Idempotency-Key': op.idempotencyKey },
                        // Uploads over 2G/3G need far longer than the default API timeout
                        timeout: op.attachments && op.attachments.length > 0 ? 120000 : 30000,
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
                    await removeOp();
                    this.cleanupAttachments(op);
                    this.triggerCacheInvalidations(op);
                    this.consecutiveFailures = 0;
                } catch (err: any) {
                    const status: number | undefined = err?.response?.status;

                    // Token expired while offline. Keep this op and everything after it; the auth
                    // layer signs the user out and the queue drains after the next successful login.
                    if (status === 401) {
                        console.warn(`[SyncQueue] Halting drain: session expired (401). Preserving operation ${op.id}`);
                        halted = true;
                        break;
                    }

                    // No HTTP response at all: connectivity problem. Never counts as a retry.
                    if (!status) {
                        halted = true;
                        this.scheduleRetry();
                        break;
                    }

                    // Non-recoverable client error (400, 422, ...): dead-letter to avoid a poison pill
                    if (status >= 400 && status < 500 && status !== 429) {
                        const errMsg = err.response?.data?.message || err.message || `HTTP ${status}`;
                        console.warn(`[SyncQueue] Dead-lettering operation ${op.id} (${status}):`, errMsg);
                        await this.recordDeadLetter(op, errMsg, status);
                        await removeOp();
                        this.cleanupAttachments(op);
                        continue;
                    }

                    // 5xx / 429: the server is unhealthy or throttling us. Stop hammering it.
                    const nextRetry = op.retryCount + 1;
                    if (nextRetry > MAX_RETRIES) {
                        console.warn(`[SyncQueue] Dead-lettering operation ${op.id} after ${MAX_RETRIES} server failures`);
                        await this.recordDeadLetter(op, `Exceeded ${MAX_RETRIES} retries: ${err?.message || 'Server Error'}`, status);
                        await removeOp();
                        this.cleanupAttachments(op);
                        continue;
                    }

                    await this.mutateQueue((q) =>
                        q.map((item) =>
                            item.id === op.id
                                ? { ...item, retryCount: nextRetry, lastAttempt: new Date().toISOString() }
                                : item
                        )
                    );
                    halted = true;
                    this.scheduleRetry();
                }
            }
        } catch (e) {
            console.warn('[SyncQueue] Drain aborted:', e);
            this.scheduleRetry();
        } finally {
            this.inFlight = false;
            notifySyncingListeners(false);
        }

        // Something was enqueued (or a trigger fired) while we were draining
        if (this.rerunRequested && !halted) {
            this.rerunRequested = false;
            this.processQueue().catch(() => {});
        }
    }
}

export const syncQueue = new SyncQueueManager();

// Automatically trigger queue sync when network is restored
onlineManager.subscribe((isOnline) => {
    if (isOnline) {
        syncQueue.processQueue().catch(() => {});
    }
});

// ...and whenever the app returns to the foreground, so pending punches never wait for a network flap
AppState.addEventListener('change', (status: string) => {
    if (status === 'active') {
        syncQueue.processQueue().catch(() => {});
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
