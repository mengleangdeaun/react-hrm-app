import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Modal,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    Easing,
} from 'react-native-reanimated';
import { useQueryClient } from '@tanstack/react-query';
import {
    MapPin,
    Navigation,
    CheckCircle2,
    QrCode,
    ArrowLeft,
    Zap,
    ZapOff,
    RefreshCw,
    ShieldAlert,
} from 'lucide-react-native';
import { attendanceApi, AttendanceClockInResponse } from '../../api/attendance';
import { useAppTheme } from '../../context/ThemeContext';
import { AppText } from '../../components/AppText';
import { extractBranchQrPayload, BranchQrParseResult } from '../../utils/qrPayload';
import { getDeviceId } from '../../utils/device';
import { AttendanceReasonModal } from '../../components/attendance/AttendanceReasonModal';

import { useTranslation } from '../../context/LanguageContext';
import { lightTheme, darkTheme } from '../../styles/theme';

export const ScanAttendanceScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const { isDark } = useAppTheme();
    const { t } = useTranslation();
    const theme = isDark ? darkTheme : lightTheme;
    const queryClient = useQueryClient();

    // Camera & Location Permissions
    const [cameraPermission, requestCameraPermission] = useCameraPermissions();
    const [locationPermission, setLocationPermission] = useState<boolean | null>(null);

    // Live GPS State
    const [currentLocation, setCurrentLocation] = useState<any>(null);
    const [loadingLocation, setLoadingLocation] = useState<boolean>(true);

    // Scanner UI States
    const [scanned, setScanned] = useState<boolean>(false);
    const [torch, setTorch] = useState<boolean>(false);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    // Reason Modal State
    const [reasonModalVisible, setReasonModalVisible] = useState<boolean>(false);
    const [reasonType, setReasonType] = useState<'late' | 'early_departure'>('late');
    const [delayMinutes, setDelayMinutes] = useState<number>(0);
    const [pendingQrResult, setPendingQrResult] = useState<BranchQrParseResult | null>(null);

    // Success Punch Confirmation State
    const [successModalVisible, setSuccessModalVisible] = useState<boolean>(false);
    const [punchResult, setPunchResult] = useState<{
        time: string;
        message: string;
        action?: string;
    } | null>(null);

    // Anti-race condition lock
    const isProcessingRef = useRef<boolean>(false);

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
        acquireLocation();
    }, []);

    const acquireLocation = async () => {
        setLoadingLocation(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setLocationPermission(false);
                setLoadingLocation(false);
                return;
            }
            setLocationPermission(true);

            // Fetch live high-accuracy GPS coordinates concurrently
            const loc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });
            setCurrentLocation(loc);
        } catch (e) {
            console.warn('Failed to acquire GPS location:', e);
        } finally {
            setLoadingLocation(false);
        }
    };

    const resetScanState = () => {
        isProcessingRef.current = false;
        setScanned(false);
        setIsSubmitting(false);
        setPendingQrResult(null);
        setReasonModalVisible(false);
    };

    // Execute attendance punch against authoritative backend
    const executePunch = async (
        qrResult: BranchQrParseResult,
        reason?: string
    ) => {
        setIsSubmitting(true);

        try {
            // Re-check live location if missing
            let loc = currentLocation;
            if (!loc) {
                loc = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.High,
                });
                setCurrentLocation(loc);
            }

            if (!loc?.coords) {
                throw new Error(t('unable_gps_coords', 'Unable to retrieve GPS coordinates. Please ensure Location services are turned on.'));
            }

            const deviceId = await getDeviceId();

            const response: AttendanceClockInResponse = await attendanceApi.clockIn({
                branch_code: qrResult.branchCode || undefined,
                payload: qrResult.payload || undefined,
                signature: qrResult.signature || 'STATIC',
                user_lat: loc.coords.latitude,
                user_lng: loc.coords.longitude,
                device_id: deviceId,
                reason: reason || undefined,
                scanned_at: new Date().toISOString(),
            });

            // If the server requires a mandatory reason for late arrival or early departure
            if (response.require_reason && !reason) {
                setPendingQrResult(qrResult);
                setReasonType(response.type === 'early_departure' ? 'early_departure' : 'late');
                setDelayMinutes(response.minutes || 0);
                setIsSubmitting(false);
                setReasonModalVisible(true);
                return;
            }

            // Attendance punch successful!
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            // Invalidate React Query caches for instant dashboard & history sync
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['dashboardBootstrap'] }),
                queryClient.invalidateQueries({ queryKey: ['attendanceHistory'] }),
                queryClient.invalidateQueries({ queryKey: ['shiftToday'] }),
            ]);

            setPunchResult({
                time: response.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                message: response.message || t('attendance_success_desc', 'Attendance Recorded Successfully'),
                action: response.action || 'success',
            });

            setReasonModalVisible(false);
            setSuccessModalVisible(true);
        } catch (error: any) {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

            const resData = error?.response?.data;
            const message = resData?.message || error?.message || t('attendance_record_failed', 'Attendance recording failed.');

            if (resData?.distance) {
                Alert.alert(
                    t('outside_branch_geofence', 'Outside Branch Geofence'),
                    `${t('you_are_away_by', 'You are')} ${Math.round(resData.distance)}m ${t('away_from_branch', 'away from this branch. Please scan while inside the office premises.')}`,
                    [{ text: t('try_again', 'Try Again'), onPress: resetScanState }]
                );
            } else if (resData?.code === 'BRANCH_NOT_FOUND_QR') {
                Alert.alert(t('invalid_qr_code', 'Invalid QR Code'), t('branch_invalid_qr', 'Branch not found. Please scan an authorized branch QR code.'), [
                    { text: t('try_again', 'Try Again'), onPress: resetScanState },
                ]);
            } else if (resData?.code === 'ATTENDANCE_ALREADY_COMPLETED') {
                Alert.alert(t('attendance_recorded', 'Attendance Completed'), t('attendance_completed_today', 'All attendance sessions for today have already been completed.'), [
                    { text: t('ok', 'OK'), onPress: () => navigation.navigate('HomeTab') },
                ]);
            } else if (resData?.code === 'DEVICE_TAKEN') {
                Alert.alert(t('security_error', 'Security Error'), t('device_registered_to_other', 'This device is bound to another employee account.'), [
                    { text: t('try_again', 'Try Again'), onPress: resetScanState },
                ]);
            } else {
                Alert.alert(t('attendance_audit', 'Attendance Error'), message, [
                    { text: t('try_again', 'Try Again'), onPress: resetScanState },
                ]);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBarCodeScanned = async ({ data }: { data: string }) => {
        if (isProcessingRef.current || scanned || isSubmitting) return;
        isProcessingRef.current = true;
        setScanned(true);

        const parseResult = extractBranchQrPayload(data);

        if (!parseResult.isValid) {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert(
                t('invalid_qr_code', 'Invalid QR Code'),
                parseResult.error || t('scan_valid_branch_qr', 'Please scan a valid physical Branch Attendance QR code.'),
                [{ text: t('try_again', 'Try Again'), onPress: resetScanState }]
            );
            return;
        }

        await executePunch(parseResult);
    };

    if (!cameraPermission || locationPermission === null || loadingLocation) {
        return (
            <SafeAreaView {...({ style: styles.centerContainer } as any)}>
                <ActivityIndicator size="large" color={theme.colors.brand} />
                <AppText style={styles.loadingText}>{t('initializing_gps_camera', 'Initializing GPS & Camera Sensor...')}</AppText>
            </SafeAreaView>
        );
    }

    if (!cameraPermission.granted) {
        return (
            <SafeAreaView {...({ style: styles.centerContainer } as any)}>
                <View style={styles.permIconCircle}>
                    <QrCode color={theme.colors.brand} size={48} />
                </View>
                <AppText style={styles.permTitle}>{t('camera_permission_required', 'Camera Permission Required')}</AppText>
                <AppText style={styles.permDesc}>
                    {t('camera_perm_desc_attendance', 'Camera access is required to scan physical branch QR codes for attendance.')}
                </AppText>
                <TouchableOpacity
                    style={[styles.permButton, { backgroundColor: theme.colors.brand }]}
                    onPress={requestCameraPermission}
                    activeOpacity={0.85}
                >
                    <AppText style={styles.permBtnText}>{t('enable_camera', 'Enable Camera')}</AppText>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    if (!locationPermission) {
        return (
            <SafeAreaView {...({ style: styles.centerContainer } as any)}>
                <View style={[styles.permIconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}>
                    <MapPin color="#EF4444" size={48} />
                </View>
                <AppText style={styles.permTitle}>{t('gps_location_required', 'GPS Location Required')}</AppText>
                <AppText style={styles.permDesc}>
                    {t('gps_location_desc', 'High-accuracy GPS location is required to verify physical branch presence.')}
                </AppText>
                <TouchableOpacity
                    style={[styles.permButton, { backgroundColor: '#EF4444' }]}
                    onPress={acquireLocation}
                    activeOpacity={0.85}
                >
                    <AppText style={styles.permBtnText}>{t('grant_location_access', 'Grant Location Access')}</AppText>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    return (
        <View style={styles.container}>
            {/* Top Bar Controls */}
            <SafeAreaView {...({ edges: ['top'], style: styles.topControlsSafeArea } as any)}>
                <View style={styles.topControls}>
                    <TouchableOpacity
                        style={styles.iconCircleButton}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                            if (navigation.canGoBack()) {
                                navigation.goBack();
                            } else {
                                navigation.navigate('HomeTab');
                            }
                        }}
                        activeOpacity={0.7}
                        accessibilityLabel="Go back"
                    >
                        <ArrowLeft color="#FFFFFF" size={19} />
                    </TouchableOpacity>

                    {/* GPS Status Chip */}
                    <View style={styles.gpsChip}>
                        <Navigation color="#10B981" size={14} />
                        <AppText style={styles.gpsChipText}>
                            {currentLocation ? t('gps_calibrated', 'GPS Calibrated') : t('acquiring_gps', 'Acquiring GPS...')}
                        </AppText>
                    </View>

                    <TouchableOpacity
                        style={[
                            styles.iconCircleButton,
                            torch && { backgroundColor: 'rgba(251, 191, 36, 0.35)', borderColor: '#FBBF24' },
                        ]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                            setTorch((prev) => !prev);
                        }}
                        activeOpacity={0.7}
                        accessibilityLabel="Toggle torch"
                    >
                        {torch ? <Zap size={18} color="#FBBF24" /> : <ZapOff size={18} color="#FFFFFF" />}
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            {/* Live Camera View */}
            <CameraView
                style={StyleSheet.absoluteFill}
                enableTorch={torch}
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            />

            {/* Overlay Viewfinder */}
            <View style={styles.overlay}>
                <View style={styles.scannerFrame}>
                    <View style={[styles.corner, styles.topLeft]} />
                    <View style={[styles.corner, styles.topRight]} />
                    <View style={[styles.corner, styles.bottomLeft]} />
                    <View style={[styles.corner, styles.bottomRight]} />

                    {/* Animated Laser Beam */}
                    {!scanned && <Animated.View style={[styles.laserBeam, laserAnimatedStyle]} />}

                    {isSubmitting && (
                        <View style={styles.loadingOverlay}>
                            <ActivityIndicator size="large" color={theme.colors.brand} />
                            <AppText style={styles.recordingText}>{t('verifying_geofence_punch', 'Verifying Geofence & Punch...')}</AppText>
                        </View>
                    )}
                </View>

                <AppText style={styles.instructionText}>
                    {t('align_branch_qr_hint', 'Align Office Branch QR Code to Record Attendance')}
                </AppText>

                {scanned && !isSubmitting && (
                    <TouchableOpacity
                        style={[styles.rescanBtn, { backgroundColor: theme.colors.brand }]}
                        onPress={resetScanState}
                        activeOpacity={0.8}
                    >
                        <RefreshCw size={16} color="#FFFFFF" />
                        <AppText style={styles.rescanBtnText}>{t('tap_to_rescan', 'Tap to Rescan')}</AppText>
                    </TouchableOpacity>
                )}
            </View>

            {/* Reason Modal for Late / Early Departure */}
            <AttendanceReasonModal
                visible={reasonModalVisible}
                reasonType={reasonType}
                delayMinutes={delayMinutes}
                isLoading={isSubmitting}
                onProceed={(reason) => {
                    if (pendingQrResult) {
                        executePunch(pendingQrResult, reason);
                    }
                }}
                onCancel={resetScanState}
            />

            {/* Success Confirmation Modal */}
            <Modal visible={successModalVisible} transparent animationType="slide">
                <View style={styles.modalBackdrop}>
                    <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
                        <View style={styles.successIconCircle}>
                            <CheckCircle2 color="#10B981" size={56} />
                        </View>
                        <AppText style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
                            {t('attendance_recorded', 'Attendance Recorded!')}
                        </AppText>
                        <AppText style={[styles.modalSub, { color: theme.colors.textSecondary }]}>
                            {punchResult?.message}
                        </AppText>

                        <View style={[styles.modalDetailsCard, { backgroundColor: theme.colors.surfaceSubtle, borderColor: theme.colors.border }]}>
                            <View style={styles.detailRow}>
                                <AppText style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>{t('timestamp', 'Timestamp')}</AppText>
                                <AppText style={[styles.detailVal, { color: theme.colors.textPrimary }]}>
                                    {punchResult?.time}
                                </AppText>
                            </View>
                            <View style={styles.detailRow}>
                                <AppText style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>{t('status', 'Status')}</AppText>
                                <AppText style={[styles.detailVal, { color: '#10B981' }]}>
                                    {t('verified_and_saved', 'Verified & Saved')}
                                </AppText>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.modalBtn, { backgroundColor: theme.colors.brand }]}
                            onPress={() => {
                                setSuccessModalVisible(false);
                                resetScanState();
                                navigation.navigate('HomeTab');
                            }}
                            activeOpacity={0.85}
                        >
                            <AppText style={styles.modalBtnText}>{t('done', 'Done')}</AppText>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    topControlsSafeArea: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 20,
    },
    topControls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 8,
    },
    iconCircleButton: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    gpsChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.3)',
    },
    gpsChipText: {
        color: '#F8FAFC',
        fontSize: 12,
        fontWeight: '600',
    },
    centerContainer: {
        flex: 1,
        backgroundColor: '#0F172A',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    loadingText: {
        color: '#94A3B8',
        fontSize: 14,
        marginTop: 16,
        fontWeight: '500',
    },
    permIconCircle: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: 'rgba(37, 99, 235, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(37, 99, 235, 0.3)',
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
        minHeight: 48,
        justifyContent: 'center',
        alignItems: 'center',
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
        borderColor: '#2563EB',
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
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 8,
        elevation: 4,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(15, 23, 42, 0.88)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    recordingText: {
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
        minHeight: 46,
        justifyContent: 'center',
    },
    rescanBtnText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 14,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        width: '100%',
        maxWidth: 380,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
    },
    modalContentDark: {
        backgroundColor: '#0F172A',
    },
    successIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0F172A',
        textAlign: 'center',
    },
    modalSub: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        marginTop: 6,
        marginBottom: 20,
    },
    textLight: {
        color: '#F8FAFC',
    },
    modalDetailsCard: {
        width: '100%',
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 10,
    },
    modalDetailsCardDark: {
        backgroundColor: 'rgba(30, 41, 59, 0.5)',
        borderColor: '#334155',
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    detailLabel: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '500',
    },
    detailVal: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0F172A',
    },
    modalBtn: {
        width: '100%',
        backgroundColor: '#2563EB',
        borderRadius: 16,
        paddingVertical: 14,
        minHeight: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
});
