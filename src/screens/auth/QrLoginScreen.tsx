import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { QrCode } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';
import { AppText } from '../../components/AppText';
import { extractEmployeeQrPayload } from '../../utils/qrPayload';
import { ModernScannerCanvas } from '../../components/scanner/ModernScannerCanvas';
import { useImageQrDecoder } from '../../components/scanner/useImageQrDecoder';

export const QrLoginScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const isProcessingRef = useRef(false);

    const { loginWithQr, isLoading } = useAuth();
    const { isDark } = useAppTheme();
    const { t } = useTranslation();

    useEffect(() => {
        if (!permission) {
            requestPermission();
        }
    }, [permission]);

    const resetScanState = () => {
        isProcessingRef.current = false;
        setScanned(false);
    };

    const handleBarcodeScanned = async ({ data }: { data: string }, force: boolean = false) => {
        if ((isProcessingRef.current && !force) || (scanned && !force) || isLoading) return;
        isProcessingRef.current = true;
        setScanned(true);

        // Pre-validate QR locally for instant feedback
        const parseCheck = extractEmployeeQrPayload(data);
        if (!parseCheck.isValid) {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert(
                t('invalid_qr_code', 'Invalid QR Code'),
                parseCheck.error || t('scan_valid_employee_qr', 'Please scan a valid Employee Personal QR badge.'),
                [{ text: t('try_again', 'Try Again'), onPress: resetScanState }]
            );
            return;
        }

        try {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await loginWithQr(data, force);
        } catch (error: any) {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            if (error?.code === 'DEVICE_MISMATCH') {
                Alert.alert(
                    t('device_transfer_required', 'Device Transfer Required'),
                    error.message ||
                        t('device_transfer_prompt', 'This account is registered to another device. Would you like to transfer your account to this device?'),
                    [
                        { text: t('cancel', 'Cancel'), style: 'cancel', onPress: resetScanState },
                        {
                            text: t('transfer_account', 'Transfer Account'),
                            style: 'destructive',
                            onPress: () => handleBarcodeScanned({ data }, true),
                        },
                    ]
                );
            } else if (error?.code === 'DEVICE_TAKEN') {
                Alert.alert(
                    t('security_error', 'Security Error'),
                    error.message || t('device_registered_to_other', 'This device is registered to another employee.'),
                    [{ text: t('try_again', 'Try Again'), onPress: resetScanState }]
                );
            } else {
                Alert.alert(
                    t('login_failed', 'Login Failed'),
                    error?.message || t('invalid_employee_qr', 'Invalid Employee QR credentials.'),
                    [{ text: t('try_again', 'Try Again'), onPress: resetScanState }]
                );
            }
        }
    };

    // Photo QR Decoder
    const { pickAndDecodeImage, isDecoding } = useImageQrDecoder({
        onQrDecoded: async (data) => {
            resetScanState();
            await handleBarcodeScanned({ data }, true);
        },
        onError: () => {
            resetScanState();
        },
    });

    if (!permission) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#DF0000" />
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View style={styles.centerContainer}>
                <View style={styles.permIconCircle}>
                    <QrCode color="#DF0000" size={48} />
                </View>
                <AppText style={styles.permTitle}>{t('camera_permission_required', 'Camera Permission Required')}</AppText>
                <AppText style={styles.permDesc}>
                    {t('camera_perm_desc_login', 'We need camera access to scan your Employee Badge QR code for quick login.')}
                </AppText>
                <TouchableOpacity
                    style={styles.permButton}
                    onPress={requestPermission}
                    activeOpacity={0.85}
                >
                    <AppText style={styles.permBtnText}>{t('grant_permission', 'Grant Permission')}</AppText>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <ModernScannerCanvas
            onBarcodeScanned={handleBarcodeScanned}
            onUploadPhotoPress={pickAndDecodeImage}
            onBackPress={() => navigation.goBack()}
            isScanned={scanned}
            isLoading={isLoading}
            isDecodingImage={isDecoding}
            loadingText={t('authenticating_device', 'Authenticating Device...')}
            instructionText={t('align_qr_login_hint', 'Align your Employee QR Code inside the box to sign in automatically')}
            accentColor="#DF0000"
            onRescanPress={resetScanState}
        />
    );
};

const styles = StyleSheet.create({
    centerContainer: {
        flex: 1,
        backgroundColor: '#0F172A',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    permIconCircle: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: 'rgba(223, 0, 0, 0.12)',
        borderWidth: 1,
        borderColor: 'rgba(223, 0, 0, 0.28)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    permTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#F8FAFC',
        marginTop: 8,
        textAlign: 'center',
    },
    permDesc: {
        fontSize: 14,
        color: '#94A3B8',
        textAlign: 'center',
        marginTop: 8,
        marginBottom: 24,
        lineHeight: 20,
        paddingHorizontal: 16,
    },
    permButton: {
        backgroundColor: '#DF0000',
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderRadius: 14,
        minHeight: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    permBtnText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 15,
    },
});
