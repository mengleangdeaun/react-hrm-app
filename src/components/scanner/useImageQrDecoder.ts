import { useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { scanFromURLAsync } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useTranslation } from '../../context/LanguageContext';

export interface UseImageQrDecoderOptions {
    onQrDecoded: (data: string) => void | Promise<void>;
    onError?: (error: string) => void;
}

export function useImageQrDecoder({ onQrDecoded, onError }: UseImageQrDecoderOptions) {
    const [isDecoding, setIsDecoding] = useState(false);
    const { t } = useTranslation();

    const pickAndDecodeImage = async () => {
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            // 1. Request image library permission if required & launch picker
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

            setIsDecoding(true);

            // 2. Decode QR Code natively using MLKit / Vision
            let scannedBarcodes = await scanFromURLAsync(imageUri, ['qr']);

            // Fallback to all barcode types if 'qr' filter was empty
            if (!scannedBarcodes || scannedBarcodes.length === 0) {
                try {
                    scannedBarcodes = await scanFromURLAsync(imageUri);
                } catch {
                    // Ignore fallback failure
                }
            }

            if (scannedBarcodes && scannedBarcodes.length > 0 && scannedBarcodes[0].data) {
                const qrData = scannedBarcodes[0].data;
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                await onQrDecoded(qrData);
            } else {
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                const noQrMsg = t(
                    'no_qr_found_in_image',
                    'No QR code detected in the selected image. Please ensure the QR is clear and well-lit.'
                );
                Alert.alert(t('no_qr_found', 'No QR Code Found'), noQrMsg);
                if (onError) {
                    onError(noQrMsg);
                }
            }
        } catch (error: any) {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            const errMsg = error?.message || t('image_decode_failed', 'Failed to scan image. Please try again.');
            Alert.alert(t('scan_error', 'Scan Error'), errMsg);
            if (onError) {
                onError(errMsg);
            }
        } finally {
            setIsDecoding(false);
        }
    };

    return {
        pickAndDecodeImage,
        isDecoding,
    };
}
