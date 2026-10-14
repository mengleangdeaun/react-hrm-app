import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

const VAULT_FOLDER = `${FileSystem.documentDirectory || ''}offline_attachments/`;

export interface VaultAttachment {
    vaultUri: string;
    originalUri: string;
    filename: string;
    mimeType: string;
    size?: number;
}

/**
 * Ensures the persistent offline attachment vault directory exists.
 */
async function ensureVaultDirectoryExists(): Promise<void> {
    if (Platform.OS === 'web' || !FileSystem.documentDirectory) return;
    try {
        const dirInfo = await FileSystem.getInfoAsync(VAULT_FOLDER);
        if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(VAULT_FOLDER, { intermediates: true });
        }
    } catch (e) {
        console.warn('[attachmentVault] Failed to create vault directory:', e);
    }
}

/**
 * Copies a temporary image/document to persistent, hardware-backed storage so
 * it survives application restarts, OS cache sweeps, and prolonged offline periods.
 */
export async function saveAttachmentToVault(
    sourceUri: string,
    suggestedFilename?: string,
    mimeType: string = 'image/jpeg'
): Promise<VaultAttachment> {
    // Web fallback
    if (Platform.OS === 'web' || !FileSystem.documentDirectory || sourceUri.startsWith('data:') || sourceUri.startsWith('blob:')) {
        return {
            vaultUri: sourceUri,
            originalUri: sourceUri,
            filename: suggestedFilename || `offline_${Date.now()}.jpg`,
            mimeType,
        };
    }

    try {
        await ensureVaultDirectoryExists();

        const ext = suggestedFilename?.split('.').pop() || sourceUri.split('.').pop() || 'jpg';
        const cleanExt = ext.split('?')[0].toLowerCase();
        const safeFilename = `vault_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${cleanExt}`;
        const targetUri = `${VAULT_FOLDER}${safeFilename}`;

        await FileSystem.copyAsync({
            from: sourceUri,
            to: targetUri,
        });

        const fileInfo = await FileSystem.getInfoAsync(targetUri);

        return {
            vaultUri: targetUri,
            originalUri: sourceUri,
            filename: safeFilename,
            mimeType,
            size: fileInfo.exists && 'size' in fileInfo ? fileInfo.size : undefined,
        };
    } catch (error) {
        console.warn('[attachmentVault] Failed to copy attachment into vault, falling back to original URI:', error);
        return {
            vaultUri: sourceUri,
            originalUri: sourceUri,
            filename: suggestedFilename || `fallback_${Date.now()}.jpg`,
            mimeType,
        };
    }
}

/**
 * Removes synced attachments from persistent vault storage once synced.
 */
export async function deleteVaultAttachment(vaultUri: string): Promise<void> {
    if (Platform.OS === 'web' || !FileSystem.documentDirectory || !vaultUri) return;
    try {
        if (vaultUri.startsWith(VAULT_FOLDER) || vaultUri.includes('offline_attachments')) {
            const info = await FileSystem.getInfoAsync(vaultUri);
            if (info.exists) {
                await FileSystem.deleteAsync(vaultUri, { idempotent: true });
            }
        }
    } catch (e) {
        console.warn('[attachmentVault] Error cleaning up vault file:', vaultUri, e);
    }
}

/**
 * Batch deletes vault attachments.
 */
export async function deleteVaultAttachments(vaultUris: string[]): Promise<void> {
    await Promise.all(vaultUris.map((uri) => deleteVaultAttachment(uri)));
}

/**
 * Clears the entire offline vault folder.
 */
export async function clearVault(): Promise<void> {
    if (Platform.OS === 'web' || !FileSystem.documentDirectory) return;
    try {
        const dirInfo = await FileSystem.getInfoAsync(VAULT_FOLDER);
        if (dirInfo.exists) {
            await FileSystem.deleteAsync(VAULT_FOLDER, { idempotent: true });
        }
    } catch (e) {
        console.warn('[attachmentVault] Failed to clear vault:', e);
    }
}
