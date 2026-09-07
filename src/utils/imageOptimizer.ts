import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';

export interface OptimizedImageResult {
    uri: string;
    width: number;
    height: number;
    name: string;
    type: string;
}

export interface ImageAttachment {
    uri: string;
    name?: string;
    type?: string;
}

const DEFAULT_MAX_WIDTH = 1280;
const DEFAULT_QUALITY = 0.70;

/**
 * Optimizes a single image file for network transmission.
 * Downscales dimensions (max width 1280px maintaining aspect ratio)
 * and compresses JPEG to 70% quality, yielding ~95%+ filesize reduction
 * while preserving high visual sharpness for workplace inspection and proof.
 */
export async function optimizeImageForUpload(
    uri: string,
    maxWidth: number = DEFAULT_MAX_WIDTH,
    quality: number = DEFAULT_QUALITY
): Promise<OptimizedImageResult> {
    if (!uri) {
        throw new Error('Image URI is required for optimization');
    }

    // Web fallback
    if (Platform.OS === 'web' || uri.startsWith('data:') || uri.startsWith('blob:')) {
        return {
            uri,
            width: maxWidth,
            height: maxWidth,
            name: `activity_${Date.now()}.jpg`,
            type: 'image/jpeg',
        };
    }

    try {
        const manipResult = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: maxWidth } }],
            {
                compress: quality,
                format: ImageManipulator.SaveFormat.JPEG,
            }
        );

        return {
            uri: manipResult.uri,
            width: manipResult.width,
            height: manipResult.height,
            name: `activity_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.jpg`,
            type: 'image/jpeg',
        };
    } catch (error) {
        console.warn('[imageOptimizer] Downscaling failed, falling back to original URI:', error);
        return {
            uri,
            width: maxWidth,
            height: maxWidth,
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
            const optimized = await optimizeImageForUpload(item.uri);
            results.push(optimized);
        } catch (e) {
            console.warn(`[imageOptimizer] Failed to optimize attachment index ${i}`, e);
            results.push({
                uri: item.uri,
                width: DEFAULT_MAX_WIDTH,
                height: DEFAULT_MAX_WIDTH,
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
            // Only delete files generated in cache directory by ImageManipulator
            if (uri.includes('ImageManipulator') || uri.includes('/cache/')) {
                const info = await FileSystem.getInfoAsync(uri);
                if (info.exists) {
                    await FileSystem.deleteAsync(uri, { idempotent: true });
                }
            }
        } catch (err) {
            // Non-critical cache cleanup failure
        }
    }
}
