import * as Application from 'expo-application';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { storage } from './storage';

const DEVICE_ID_KEY = 'hrms_app_persistent_device_id';

/**
 * Retrieves or generates a persistent device_id string for hardware device binding.
 */
export async function getDeviceId(): Promise<string> {
    try {
        const storedDeviceId = await storage.getItem(DEVICE_ID_KEY);
        if (storedDeviceId) {
            return storedDeviceId;
        }

        let deviceId: string | null = null;

        if (Platform.OS === 'android') {
            deviceId = Application.getAndroidId();
        } else if (Platform.OS === 'ios') {
            deviceId = await Application.getIosIdForVendorAsync();
        }

        if (!deviceId) {
            deviceId = Crypto.randomUUID();
        }

        await storage.setItem(DEVICE_ID_KEY, deviceId);
        return deviceId;
    } catch (error) {
        console.error('Failed to resolve device_id:', error);
        const fallbackId = 'dev-' + Math.random().toString(36).substring(2, 15);
        return fallbackId;
    }
}
