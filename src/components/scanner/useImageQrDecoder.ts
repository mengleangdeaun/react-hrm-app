import { useState } from 'react';
import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { scanFromURLAsync } from 'expo-camera';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as Haptics from 'expo-haptics';
import { useTranslation } from '../../context/LanguageContext';

export interface UseImageQrDecoderOptions {
    onQrDecoded: (data: string) => void | Promise<void>;
    onError?: (error: string) => void;
}

/**
 * Scan a single image URI using expo-camera's native Vision/MLKit detectors.
 * Catches individual errors so a rejection doesn't abort multi-pass recovery.
 */
async function scanSingle(uri: string): Promise<string | null> {
    // 1. Primary: Scan explicitly for QR format
    try {
        const results = await scanFromURLAsync(uri, ['qr']);
        if (results && results.length > 0 && results[0]?.data) {
            const data = results[0].data.trim();
            if (data) return data;
        }
    } catch (err) {
        console.warn('[useImageQrDecoder] scan [qr] attempt warning:', err);
    }

    // 2. Secondary: Scan without format restriction in case of type mismatch
    try {
        const genericResults = await scanFromURLAsync(uri);
        if (genericResults && genericResults.length > 0 && genericResults[0]?.data) {
            const data = genericResults[0].data.trim();
            if (data) return data;
        }
    } catch (err) {
        console.warn('[useImageQrDecoder] scan generic attempt warning:', err);
    }

    return null;
}

/**
 * Multi-Pass Adaptive QR Decoder Engine.
 * 
 * Solves the 4 main reasons why photo QR scanning fails on real mobile devices:
 * 1. High-resolution / uncompressed 12MP-48MP camera images that overwhelm MLKit / CIDetector.
 * 2. Unnormalized EXIF rotation (iOS CIDetector misses barcodes on portrait/sideways photos).
 * 3. Small QR codes in large screenshots with background noise (center cropping resolves this).
 * 4. Odd orientation rotations (90° / 270° fallbacks).
 */
async function decodeQrWithRecovery(rawUri: string): Promise<string | null> {
    // Pass 1: Standard Normalized (Width: 1000px, EXIF orientation baked in, high contrast JPEG)
    try {
        const pass1 = await manipulateAsync(
            rawUri,
            [{ resize: { width: 1000 } }],
            { compress: 0.92, format: SaveFormat.JPEG }
        );
        const data1 = await scanSingle(pass1.uri);
        if (data1) return data1;
    } catch (e) {
        console.warn('[useImageQrDecoder] Pass 1 normalized failed:', e);
    }

    // Pass 2: Raw original URI directly
    try {
        const data2 = await scanSingle(rawUri);
        if (data2) return data2;
    } catch (e) {
        console.warn('[useImageQrDecoder] Pass 2 raw failed:', e);
    }

    // Pass 3: Higher Density (Width: 1600px for small/intricate QR codes)
    try {
        const pass3 = await manipulateAsync(
            rawUri,
            [{ resize: { width: 1600 } }],
            { compress: 0.95, format: SaveFormat.JPEG }
        );
        const data3 = await scanSingle(pass3.uri);
        if (data3) return data3;
    } catch (e) {
        console.warn('[useImageQrDecoder] Pass 3 high-res failed:', e);
    }

    // Pass 4: Center Square Focus (Crops central 70% to eliminate edge noise/documents)
    try {
        const pass4 = await manipulateAsync(
            rawUri,
            [
                { resize: { width: 1200 } },
                { crop: { originX: 180, originY: 180, width: 840, height: 840 } },
            ],
            { compress: 0.92, format: SaveFormat.JPEG }
        );
        const data4 = await scanSingle(pass4.uri);
        if (data4) return data4;
    } catch (e) {
        console.warn('[useImageQrDecoder] Pass 4 center-crop failed:', e);
    }

    // Pass 5: 90° & 270° Rotations (Handles cases where EXIF tag was lost or ignored)
    for (const deg of [90, 270]) {
        try {
            const rotated = await manipulateAsync(
                rawUri,
                [{ resize: { width: 1000 } }, { rotate: deg }],
                { compress: 0.92, format: SaveFormat.JPEG }
            );
            const dataRot = await scanSingle(rotated.uri);
            if (dataRot) return dataRot;
        } catch (e) {
            console.warn(`[useImageQrDecoder] Rotation ${deg}° failed:`, e);
        }
    }

    return null;
}

export function useImageQrDecoder({ onQrDecoded, onError }: UseImageQrDecoderOptions) {
    const [isDecoding, setIsDecoding] = useState(false);
    const { t } = useTranslation();

    /**
     * Internal decoder runner on a confirmed image asset
     */
    const processImageUri = async (imageUri: string, allowManualCropFallback: boolean = true) => {
        setIsDecoding(true);

        try {
            const qrData = await decodeQrWithRecovery(imageUri);

            if (qrData) {
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                await onQrDecoded(qrData);
                return;
            }

            // If auto recovery failed, offer manual crop if enabled
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

            if (allowManualCropFallback) {
                Alert.alert(
                    t('no_qr_found', 'No QR Code Detected'),
                    t(
                        'no_qr_found_prompt_crop',
                        'Could not automatically detect a QR code in this image. Would you like to crop directly around the QR code?'
                    ),
                    [
                        {
                            text: t('cancel', 'Cancel'),
                            style: 'cancel',
                            onPress: () => {
                                if (onError) onError('No QR code found');
                            },
                        },
                        {
                            text: t('crop_qr', 'Crop QR Code'),
                            onPress: () => {
                                launchPickerWithCrop();
                            },
                        },
                    ]
                );
            } else {
                const noQrMsg = t(
                    'no_qr_found_in_image',
                    'No QR code detected in the selected image. Please ensure the QR is clear and well-lit.'
                );
                Alert.alert(t('no_qr_found', 'No QR Code Found'), noQrMsg);
                if (onError) onError(noQrMsg);
            }
        } catch (error: any) {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            const errMsg = error?.message || t('image_decode_failed', 'Failed to scan image. Please try again.');
            Alert.alert(t('scan_error', 'Scan Error'), errMsg);
            if (onError) onError(errMsg);
        } finally {
            setIsDecoding(false);
        }
    };

    /**
     * Fallback picker with built-in crop square
     */
    const launchPickerWithCrop = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 1,
            });

            if (result.canceled || !result.assets || result.assets.length === 0) {
                return;
            }

            const croppedUri = result.assets[0].uri;
            if (croppedUri) {
                await processImageUri(croppedUri, false);
            }
        } catch (err: any) {
            console.warn('[useImageQrDecoder] launchPickerWithCrop failed:', err);
        }
    };

    /**
     * Primary entry point: Request permission if needed & launch standard picker
     */
    const pickAndDecodeImage = async () => {
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            // 1. Verify / Request Media Library Permission
            const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                const request = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (!request.granted) {
                    Alert.alert(
                        t('permission_required', 'Permission Required'),
                        t(
                            'photo_library_permission_desc',
                            'Photo library access is required to select and scan a QR code image.'
                        )
                    );
                    return;
                }
            }

            // 2. Launch Image Picker
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: false,
                quality: 1,
            });

            if (result.canceled || !result.assets || result.assets.length === 0) {
                return;
            }

            const imageUri = result.assets[0].uri;
            if (!imageUri) {
                return;
            }

            // 3. Process with Multi-Pass Recovery
            await processImageUri(imageUri, true);
        } catch (error: any) {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            const errMsg = error?.message || t('image_decode_failed', 'Failed to scan image. Please try again.');
            Alert.alert(t('scan_error', 'Scan Error'), errMsg);
            if (onError) onError(errMsg);
        }
    };

    return {
        pickAndDecodeImage,
        isDecoding,
    };
}
