import { ENV } from '../../../config/env';
import { ActivityItem } from '../types';

export const HERO_IMAGE_HEIGHT = 200;

export const normalizeActivityImageUrl = (rawUrl?: string): string => {
    if (!rawUrl || typeof rawUrl !== 'string') return '';
    const trimmed = rawUrl.trim();
    if (!trimmed) return '';

    // If it's already an absolute URL (e.g. Cloudflare R2: https://pub-xxx.r2.dev/... or http://...)
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        // Rewrite loopback addresses from local dev Laravel (127.0.0.1 or localhost)
        // so that Android emulators and devices reach the backend host correctly
        if (trimmed.includes('127.0.0.1') || trimmed.includes('localhost')) {
            const apiBase = ENV.API_URL.replace(/\/api\/?$/, '');
            const pathAndQuery = trimmed.replace(/^https?:\/\/[^/]+/, '');
            return `${apiBase}${pathAndQuery}`;
        }
        return trimmed;
    }

    // Relative path (from storage/ or activities/)
    const cleanPath = trimmed.startsWith('/') ? trimmed.substring(1) : trimmed;
    const storagePath = cleanPath.startsWith('storage/') ? cleanPath : `storage/${cleanPath}`;
    const baseUrl = ENV.API_URL.replace(/\/api\/?$/, '');
    return `${baseUrl}/${storagePath}`;
};

export const getDisplayImageUrls = (item: ActivityItem): string[] => {
    // 1. Prefer resolved Cloudflare R2 / public URLs provided by the backend
    const resolvedUrls: string[] = [];

    if (Array.isArray(item.attachment_urls) && item.attachment_urls.length > 0) {
        resolvedUrls.push(...item.attachment_urls);
    }
    if (item.photo_url && !resolvedUrls.includes(item.photo_url)) {
        resolvedUrls.push(item.photo_url);
    }

    if (resolvedUrls.length > 0) {
        return resolvedUrls.map((u) => normalizeActivityImageUrl(u)).filter(Boolean);
    }

    // 2. Fallback only if backend didn't provide pre-resolved URLs
    const fallbackList: any[] = [];
    if (Array.isArray(item.attachments) && item.attachments.length > 0) {
        item.attachments.forEach((a) => {
            if (typeof a === 'string') fallbackList.push(a);
            else if (a && typeof a === 'object' && (a as any).uri) fallbackList.push((a as any).uri);
        });
    } else if (typeof item.attachments === 'string') {
        try {
            const parsed = JSON.parse(item.attachments);
            if (Array.isArray(parsed)) fallbackList.push(...parsed);
            else if (typeof parsed === 'string') fallbackList.push(parsed);
        } catch {
            fallbackList.push(item.attachments);
        }
    }

    if (item.photo_path && !fallbackList.includes(item.photo_path)) {
        fallbackList.push(item.photo_path);
    }

    const seen = new Set<string>();
    const result: string[] = [];

    for (const raw of fallbackList) {
        const normalized = normalizeActivityImageUrl(raw);
        if (normalized && !seen.has(normalized)) {
            seen.add(normalized);
            result.push(normalized);
        }
    }

    return result;
};
