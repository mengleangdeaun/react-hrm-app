import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Modal,
    BackHandler,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';
import {
    MapPin,
    Navigation as NavigationIcon,
    CheckCircle2,
    QrCode,
} from 'lucide-react-native';
import { attendanceApi, AttendanceClockInResponse } from '../../api/attendance';
import { useAppTheme } from '../../context/ThemeContext';
import { AppText } from '../../components/AppText';
import { extractBranchQrPayload, BranchQrParseResult } from '../../utils/qrPayload';
import { getDeviceId } from '../../utils/device';
import { AttendanceReasonModal } from '../../components/attendance/AttendanceReasonModal';
import { AppBottomSheet } from '../../components/common/AppBottomSheet';
import { useTranslation } from '../../context/LanguageContext';
import { lightTheme, darkTheme } from '../../styles/theme';
import { ModernScannerCanvas } from '../../components/scanner/ModernScannerCanvas';
import { useImageQrDecoder } from '../../components/scanner/useImageQrDecoder';

export interface GpsLocation {
    coords: {
        latitude: number;
        longitude: number;
        altitude?: number | null;
        accuracy?: number | null;
        altitudeAccuracy?: number | null;
        heading?: number | null;
        speed?: number | null;
    };
    timestamp: number;
}

export const ScanAttendanceScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const { isDark } = useAppTheme();
    const { t } = useTranslation();
    const theme = isDark ? darkTheme : lightTheme;
    const queryClient = useQueryClient();

    // Camera & Location Permissions
    const [cameraPermission, requestCameraPermission] = useCameraPermissions();
    const [locationPermission, setLocationPermission] = useState<boolean | null>(null);

    // Live GPS State
    const [currentLocation, setCurrentLocation] = useState<GpsLocation | null>(null);
    const [isLocating, setIsLocating] = useState<boolean>(true);

    // Scanner UI States
    const [scanned, setScanned] = useState<boolean>(false);
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

    // Anti-race condition locks & in-flight promises
    const isProcessingRef = useRef<boolean>(false);
    const isMountedRef = useRef<boolean>(true);
    const locationPromiseRef = useRef<Promise<GpsLocation | null> | null>(null);
    const currentLocationRef = useRef<GpsLocation | null>(null);

    // Keep ref in sync with state for instantaneous access during callbacks
    useEffect(() => {
        currentLocationRef.current = currentLocation;
    }, [currentLocation]);

    /**
     * Start location acquisition concurrently in the background.
     * Uses fast cached position if available, then refines with a fresh fix.
     */
    const startLocationAcquisition = useCallback(async (): Promise<GpsLocation | null> => {
        setIsLocating(true);

        try {
            // 1. Check or request foreground permission
            const permissionResponse = await Location.getForegroundPermissionsAsync();
            let hasPermission = permissionResponse.granted;

            if (!hasPermission && permissionResponse.canAskAgain) {
                const reqResponse = await Location.requestForegroundPermissionsAsync();
                hasPermission = reqResponse.granted;
            }

            if (!isMountedRef.current) return null;

            if (!hasPermission) {
                setLocationPermission(false);
                setIsLocating(false);
                return null;
            }

            setLocationPermission(true);

            // 2. Fast-Path: Obtain last known position immediately if fresh (within 60s)
            try {
                const lastKnown = (await Location.getLastKnownPositionAsync({ maxAge: 60000 })) as GpsLocation | null;
                if (lastKnown && isMountedRef.current) {
                    setCurrentLocation(lastKnown);
                    currentLocationRef.current = lastKnown;
                }
            } catch {
                // Non-fatal, continue to live fix
            }

            // 3. High-Accuracy Live Position Fix
            const livePosition = (await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            })) as GpsLocation | null;

            if (isMountedRef.current && livePosition) {
                setCurrentLocation(livePosition);
                currentLocationRef.current = livePosition;
                setIsLocating(false);
            }

            return livePosition;
        } catch (error) {
            console.warn('Background GPS acquisition warning:', error);
            if (isMountedRef.current) {
                setIsLocating(false);
            }
            return currentLocationRef.current;
        }
    }, []);

    // Lifecycle: Kick off concurrent GPS acquisition on mount
    useEffect(() => {
        isMountedRef.current = true;
        locationPromiseRef.current = startLocationAcquisition();

        return () => {
            isMountedRef.current = false;
            isProcessingRef.current = false;
        };
    }, [startLocationAcquisition]);

    const resetScanState = () => {
        isProcessingRef.current = false;
        setScanned(false);
        setIsSubmitting(false);
        setPendingQrResult(null);
        setReasonModalVisible(false);
    };

    /**
     * Resolve verified location with safety timeout before executing punch
     */
    const getVerifiedLocation = async (timeoutMs: number = 7000): Promise<GpsLocation | null> => {
        // Fast path: Location already cached and available
        if (currentLocationRef.current) {
            return currentLocationRef.current;
        }

        // Await in-flight background promise or start a fresh one
        const activePromise = locationPromiseRef.current || startLocationAcquisition();

        // Safety timeout to prevent indefinite hanging on slow GPS
        const timeoutPromise = new Promise<null>((resolve) =>
            setTimeout(() => resolve(null), timeoutMs)
        );

        const resolved = await Promise.race([activePromise, timeoutPromise]);
        return resolved || currentLocationRef.current;
    };

    /**
     * Execute attendance punch against authoritative backend
     */
    const executePunch = async (
        qrResult: BranchQrParseResult,
        reason?: string
    ) => {
        setIsSubmitting(true);

        try {
            // Strictly resolve location before dispatching attendance request
            const loc = await getVerifiedLocation(7000);

            if (!loc?.coords) {
                throw new Error(
                    t('unable_gps_coords', 'Unable to retrieve GPS coordinates. Please ensure Location services are enabled and try again.')
                );
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

    const handleBarCodeScanned = async ({ data }: { data: string }, force: boolean = false) => {
        if ((isProcessingRef.current && !force) || (scanned && !force) || isSubmitting) return;
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

    // Photo QR Decoder
    const { pickAndDecodeImage, isDecoding } = useImageQrDecoder({
        onQrDecoded: async (data) => {
            resetScanState();
            await handleBarCodeScanned({ data }, true);
        },
        onError: () => {
            resetScanState();
        },
    });

    const handleBackNavigation = useCallback(() => {
        resetScanState();
        if (navigation.canGoBack()) {
            navigation.goBack();
        } else {
            navigation.navigate('HomeTab');
        }
        return true;
    }, [navigation]);

    useFocusEffect(
        useCallback(() => {
            const onBackPress = () => {
                handleBackNavigation();
                return true;
            };
            const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
            return () => subscription.remove();
        }, [handleBackNavigation])
    );

    // Permission Screen: Camera Explicitly Denied
    if (cameraPermission && !cameraPermission.granted) {
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

    // Permission Screen: Location Explicitly Denied
    if (locationPermission === false) {
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
                    onPress={() => {
                        locationPromiseRef.current = startLocationAcquisition();
                    }}
                    activeOpacity={0.85}
                >
                    <AppText style={styles.permBtnText}>{t('grant_location_access', 'Grant Location Access')}</AppText>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    // Instant Scanner Viewport (Camera renders immediately while GPS resolves concurrently)
    return (
        <View style={styles.container}>
            {/* Modern Scanner Canvas */}
            <ModernScannerCanvas
                onBarcodeScanned={handleBarCodeScanned}
                onUploadPhotoPress={pickAndDecodeImage}
                onBackPress={handleBackNavigation}
                isScanned={scanned}
                isLoading={isSubmitting}
                isDecodingImage={isDecoding}
                loadingText={t('verifying_geofence_punch', 'Verifying Geofence & Punch...')}
                instructionText={t('align_branch_qr_hint', 'Align Office Branch QR Code to Record Attendance')}
                accentColor={theme.colors.brand}
                onRescanPress={resetScanState}
                topContent={
                    <View style={styles.gpsChip}>
                        <NavigationIcon color={currentLocation ? '#10B981' : '#FBBF24'} size={13} />
                        <AppText style={styles.gpsChipText}>
                            {currentLocation
                                ? t('gps_calibrated', 'GPS Calibrated')
                                : isLocating
                                ? t('acquiring_gps', 'Acquiring GPS...')
                                : t('gps_ready', 'GPS Ready')}
                        </AppText>
                        {isLocating && !currentLocation && (
                            <ActivityIndicator size="small" color="#FBBF24" style={{ marginLeft: 2 }} />
                        )}
                    </View>
                }
            />

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
            <AppBottomSheet
                visible={successModalVisible}
                onClose={() => {
                    setSuccessModalVisible(false);
                    resetScanState();
                    navigation.navigate('HomeTab');
                }}
                title={t('attendance_recorded', 'Attendance Recorded!')}
                subtitle={punchResult?.message}
                footer={
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
                }
            >
                <View style={styles.successIconCircle}>
                    <CheckCircle2 color={theme.colors.status.success} size={56} />
                </View>

                <View style={[styles.modalDetailsCard, { backgroundColor: theme.colors.surfaceSubtle, borderColor: theme.colors.border }]}>
                    <View style={styles.detailRow}>
                        <AppText style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>{t('timestamp', 'Timestamp')}</AppText>
                        <AppText style={[styles.detailVal, { color: theme.colors.textPrimary }]}>
                            {punchResult?.time}
                        </AppText>
                    </View>
                    <View style={styles.detailRow}>
                        <AppText style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>{t('status', 'Status')}</AppText>
                        <AppText style={[styles.detailVal, { color: theme.colors.status.success }]}>
                            {t('verified_and_saved', 'Verified & Saved')}
                        </AppText>
                    </View>
                </View>
            </AppBottomSheet>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    gpsChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(15, 23, 42, 0.82)',
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.35)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
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
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
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
        textAlign: 'center',
    },
    modalSub: {
        fontSize: 14,
        textAlign: 'center',
        marginTop: 6,
        marginBottom: 20,
    },
    modalDetailsCard: {
        width: '100%',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        gap: 10,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    detailLabel: {
        fontSize: 13,
        fontWeight: '500',
    },
    detailVal: {
        fontSize: 14,
        fontWeight: '700',
    },
    modalBtn: {
        width: '100%',
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
