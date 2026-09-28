import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';

export interface OptimizedImageResult {
    uri: string;
    width: number;
    height: number;
    name: string;
    type: string;
    size?: number; // File size in bytes
}

export interface ImageAttachment {
    uri: string;
    name?: string;
    type?: string;
    width?: number;
    height?: number;
    size?: number;
}

const DEFAULT_MAX_DIMENSION = 1280;
const DEFAULT_QUALITY = 0.70;

/**
 * Format bytes into human-readable string (e.g. '245 KB', '1.2 MB')
 */
export function formatFileSize(bytes?: number): string {
    if (!bytes || bytes <= 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Optimizes an image file for network transmission.
 * 
 * - Downscales large photos (max 1280px maintaining aspect ratio) without upscaling small photos.
 * - Compresses JPEG to 70% quality, yielding ~80-95% filesize reduction.
 * - Preserves high visual sharpness for workplace inspection and proof.
 */
export async function optimizeImageForUpload(
    uri: string,
    maxDimension: number = DEFAULT_MAX_DIMENSION,
    quality: number = DEFAULT_QUALITY,
    originalDimensions?: { width?: number; height?: number }
): Promise<OptimizedImageResult> {
    if (!uri) {
        throw new Error('Image URI is required for optimization');
    }

    // Web fallback
    if (Platform.OS === 'web' || uri.startsWith('data:') || uri.startsWith('blob:')) {
        return {
            uri,
            width: maxDimension,
            height: maxDimension,
            name: `activity_${Date.now()}.jpg`,
            type: 'image/jpeg',
        };
    }

    try {
        const origW = originalDimensions?.width;
        const origH = originalDimensions?.height;

        const actions: ImageManipulator.Action[] = [];

        // Only resize if original exceeds maxDimension; never upscale smaller images
        if (origW && origH) {
            if (origW > maxDimension || origH > maxDimension) {
                if (origW >= origH) {
                    actions.push({ resize: { width: maxDimension } });
                } else {
                    actions.push({ resize: { height: maxDimension } });
                }
            }
        } else {
            // If dimensions unknown, cap width to maxDimension
            actions.push({ resize: { width: maxDimension } });
        }

        const manipResult = await ImageManipulator.manipulateAsync(
            uri,
            actions,
            {
                compress: quality,
                format: ImageManipulator.SaveFormat.JPEG,
            }
        );

        let size: number | undefined;
        try {
            const info = await FileSystem.getInfoAsync(manipResult.uri);
            if (info.exists && 'size' in info) {
                size = info.size;
            }
        } catch {
            // Ignore file info error
        }

        return {
            uri: manipResult.uri,
            width: manipResult.width,
            height: manipResult.height,
            name: `activity_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.jpg`,
            type: 'image/jpeg',
            size,
        };
    } catch (error) {
        console.warn('[imageOptimizer] Optimization failed, falling back to original URI:', error);
        return {
            uri,
            width: maxDimension,
            height: maxDimension,
            name: `photo_${Date.now()}.jpg`,
            type: 'image/jpeg',
        };
    }
}

/**
 * Sequentially optimizes a batch of attachments to prevent peak memory spikes
 * on resource-constrained Android devices.
 * 
 * @param attachments List of picked/captured images
 * @param onProgress Optional callback reporting (currentFinished, total)
 */
export async function optimizeImagesBatch(
    attachments: ImageAttachment[],
    onProgress?: (current: number, total: number) => void
): Promise<OptimizedImageResult[]> {
    const results: OptimizedImageResult[] = [];
    const total = attachments.length;

    for (let i = 0; i < total; i++) {
        const item = attachments[i];
        if (onProgress) {
            onProgress(i + 1, total);
        }

        try {
            const optimized = await optimizeImageForUpload(
                item.uri,
                DEFAULT_MAX_DIMENSION,
                DEFAULT_QUALITY,
                item.width && item.height ? { width: item.width, height: item.height } : undefined
            );
            results.push(optimized);
        } catch (e) {
            console.warn(`[imageOptimizer] Failed to optimize attachment index ${i}`, e);
            results.push({
                uri: item.uri,
                width: DEFAULT_MAX_DIMENSION,
                height: DEFAULT_MAX_DIMENSION,
                name: item.name || `photo_${Date.now()}_${i}.jpg`,
                type: item.type || 'image/jpeg',
            });
        }
    }

    return results;
}

/**
 * Safely purges temporary downscaled files from device cache after successful upload
 */
export async function cleanupTempImages(uris: string[]): Promise<void> {
    if (Platform.OS === 'web') return;

    for (const uri of uris) {
        try {
            if (uri.includes('ImageManipulator') || uri.includes('/cache/')) {
                const info = await FileSystem.getInfoAsync(uri);
                if (info.exists) {
                    await FileSystem.deleteAsync(uri, { idempotent: true });
                }
            }
        } catch {
            // Non-critical cache cleanup failure
        }
    }
}
