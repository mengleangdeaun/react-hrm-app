import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    Easing,
} from 'react-native-reanimated';
import { ArrowLeft, QrCode, Zap, ZapOff, RefreshCw } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';
import { AppText } from '../../components/AppText';
import { extractEmployeeQrPayload } from '../../utils/qrPayload';

export const QrLoginScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [torch, setTorch] = useState(false);
    const isProcessingRef = useRef(false);

    const { loginWithQr, isLoading } = useAuth();
    const { isDark } = useAppTheme();
    const { t } = useTranslation();

    // Laser scan animation
    const translateY = useSharedValue(0);

    useEffect(() => {
        translateY.value = withRepeat(
            withTiming(230, { duration: 2500, easing: Easing.inOut(Easing.quad) }),
            -1,
            true
        );
    }, []);

    const laserAnimatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateY: translateY.value }],
        };
    });

    useEffect(() => {
        if (!permission) {
            requestPermission();
        }
    }, [permission]);

    if (!permission) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#3B82F6" />
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View style={styles.centerContainer}>
                <View style={styles.permIconCircle}>
                    <QrCode color="#3B82F6" size={48} />
                </View>
                <AppText style={styles.permTitle}>Camera Permission Required</AppText>
                <AppText style={styles.permDesc}>
                    We need camera access to scan your Employee Badge QR code for quick login.
                </AppText>
                <TouchableOpacity
                    style={styles.permButton}
                    onPress={requestPermission}
                    activeOpacity={0.85}
                >
                    <AppText style={styles.permBtnText}>Grant Permission</AppText>
                </TouchableOpacity>
            </View>
        );
    }

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
            Alert.alert('Invalid QR Code', parseCheck.error || 'Please scan a valid Employee Personal QR badge.', [
                { text: 'Try Again', onPress: resetScanState },
            ]);
            return;
        }

        try {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await loginWithQr(data, force);
        } catch (error: any) {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            if (error?.code === 'DEVICE_MISMATCH') {
                Alert.alert(
                    'Device Transfer Required',
                    error.message ||
                        'This account is registered to another device. Would you like to transfer your account to this device?',
                    [
                        { text: 'Cancel', style: 'cancel', onPress: resetScanState },
                        {
                            text: 'Transfer Account',
                            style: 'destructive',
                            onPress: () => handleBarcodeScanned({ data }, true),
                        },
                    ]
                );
            } else if (error?.code === 'DEVICE_TAKEN') {
                Alert.alert('Security Error', error.message || 'This device is registered to another employee.', [
                    { text: 'Try Again', onPress: resetScanState },
                ]);
            } else {
                Alert.alert('Login Failed', error?.message || 'Invalid Employee QR credentials.', [
                    { text: 'Try Again', onPress: resetScanState },
                ]);
            }
        }
    };

    return (
        <View style={styles.container}>
            {/* Top Bar Controls */}
            <View style={styles.topControls}>
                <TouchableOpacity
                    style={styles.iconCircleButton}
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.7}
                >
                    <ArrowLeft color="#FFFFFF" size={20} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.iconCircleButton,
                        torch && { backgroundColor: 'rgba(251, 191, 36, 0.35)', borderColor: '#FBBF24' },
                    ]}
                    onPress={() => setTorch((prev) => !prev)}
                    activeOpacity={0.7}
                >
                    {torch ? (
                        <Zap size={20} color="#FBBF24" />
                    ) : (
                        <ZapOff size={20} color="#FFFFFF" />
                    )}
                </TouchableOpacity>
            </View>

            {/* Live Camera View */}
            <CameraView
                style={StyleSheet.absoluteFill}
                enableTorch={torch}
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            />

            {/* Overlay Viewfinder */}
            <View style={styles.overlay}>
                <View style={styles.scannerFrame}>
                    <View style={[styles.corner, styles.topLeft]} />
                    <View style={[styles.corner, styles.topRight]} />
                    <View style={[styles.corner, styles.bottomLeft]} />
                    <View style={[styles.corner, styles.bottomRight]} />

                    {/* Animated Laser Beam */}
                    {!scanned && (
                        <Animated.View style={[styles.laserBeam, laserAnimatedStyle]} />
                    )}

                    {isLoading && (
                        <View style={styles.loadingOverlay}>
                            <ActivityIndicator size="large" color="#3B82F6" />
                            <AppText style={styles.authenticatingText}>
                                Authenticating Device...
                            </AppText>
                        </View>
                    )}
                </View>

                <AppText style={styles.instructionText}>
                    Align your Employee QR Code inside the box to sign in automatically
                </AppText>

                {scanned && !isLoading && (
                    <TouchableOpacity
                        style={styles.rescanBtn}
                        onPress={resetScanState}
                        activeOpacity={0.8}
                    >
                        <RefreshCw size={16} color="#FFFFFF" />
                        <AppText style={styles.rescanBtnText}>Tap to Rescan</AppText>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    topControls: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 56 : 36,
        left: 20,
        right: 20,
        zIndex: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    iconCircleButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
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
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.3)',
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
        backgroundColor: '#2563EB',
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderRadius: 14,
    },
    permBtnText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 15,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
    },
    scannerFrame: {
        width: 250,
        height: 250,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 24,
        position: 'relative',
        overflow: 'hidden',
    },
    corner: {
        position: 'absolute',
        width: 32,
        height: 32,
        borderColor: '#3B82F6',
    },
    topLeft: {
        top: -1,
        left: -1,
        borderTopWidth: 4,
        borderLeftWidth: 4,
        borderTopLeftRadius: 20,
    },
    topRight: {
        top: -1,
        right: -1,
        borderTopWidth: 4,
        borderRightWidth: 4,
        borderTopRightRadius: 20,
    },
    bottomLeft: {
        bottom: -1,
        left: -1,
        borderBottomWidth: 4,
        borderLeftWidth: 4,
        borderBottomLeftRadius: 20,
    },
    bottomRight: {
        bottom: -1,
        right: -1,
        borderBottomWidth: 4,
        borderRightWidth: 4,
        borderBottomRightRadius: 20,
    },
    laserBeam: {
        position: 'absolute',
        left: 8,
        right: 8,
        top: 8,
        height: 2,
        backgroundColor: '#60A5FA',
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 8,
        elevation: 4,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    authenticatingText: {
        color: '#F8FAFC',
        fontSize: 13,
        fontWeight: '600',
        marginTop: 12,
    },
    instructionText: {
        color: '#F8FAFC',
        fontSize: 14,
        textAlign: 'center',
        marginTop: 28,
        paddingHorizontal: 40,
        fontWeight: '500',
        lineHeight: 20,
    },
    rescanBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 24,
        backgroundColor: '#2563EB',
        paddingHorizontal: 22,
        paddingVertical: 12,
        borderRadius: 14,
    },
    rescanBtnText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 14,
    },
});
