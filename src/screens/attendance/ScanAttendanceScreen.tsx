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
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
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
    AlertCircle,
    Clock,
    ShieldCheck,
    Calendar,
    X,
} from 'lucide-react-native';
import { attendanceApi, AttendanceClockInResponse } from '../../api/attendance';
import { syncQueue } from '../../offline/syncQueue';
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
import { useAttendanceGuard } from '../../hooks/useAttendanceGuard';

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

export const ScanAttendanceScreen: React.FC<{ navigation: any; route?: any }> = ({ navigation, route }) => {
    const { isDark } = useAppTheme();
    const { t } = useTranslation();
    const theme = isDark ? darkTheme : lightTheme;
    const queryClient = useQueryClient();

    // Proactive Attendance Guard
    const { evaluateGuard, reasonPresets, shiftPhase } = useAttendanceGuard();
    const routeReason = route?.params?.reason;
    const [activeReason, setActiveReason] = useState<string>(routeReason || '');
    // guardReady starts false so camera never mounts before the guard check runs
    const [guardReady, setGuardReady] = useState<boolean>(false);

    const isFocused = useIsFocused();
    const [isSuccess, setIsSuccess] = useState<boolean>(false);
    const autoReturnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);


    const handleReturnToDashboard = useCallback(() => {
        if (autoReturnTimerRef.current) {
            clearTimeout(autoReturnTimerRef.current);
            autoReturnTimerRef.current = null;
        }
        setIsSuccess(false);
        resetScanState();
        navigation.navigate('HomeTab');
    }, [navigation]);

    useEffect(() => {
        if (isSuccess) {
            autoReturnTimerRef.current = setTimeout(() => {
                handleReturnToDashboard();
            }, 3200);
        }
        return () => {
            if (autoReturnTimerRef.current) {
                clearTimeout(autoReturnTimerRef.current);
                autoReturnTimerRef.current = null;
            }
        };
    }, [isSuccess, handleReturnToDashboard]);

    useFocusEffect(
        useCallback(() => {
            setIsSuccess(false);
            setScanned(false);
            isProcessingRef.current = false;

            // -- Issue 1 Fix: Always reset activeReason on focus.
            // When navigating via bottom tab (no route.params), reason is cleared so
            // the guard correctly re-prompts for a new session instead of reusing
            // the stale reason from the previous session.
            const paramReason = route?.params?.reason || '';
            setActiveReason(paramReason);

            // -- Issue 2 Fix: Evaluate guard BEFORE activating the camera.
            // guardReady starts false, so the camera is not mounted yet.
            // We check here whether a reason is mandatory for the current punch type.
            setGuardReady(false);
            const guard = evaluateGuard(new Date());
            if (!paramReason && guard.require_reason && (guard.type === 'late' || guard.type === 'early_departure')) {
                // Reason is required — show modal first. Camera stays off (guardReady = false).
                setReasonType(guard.type);
                setDelayMinutes(guard.minutes);
                setReasonModalVisible(true);
            } else {
                // No guard needed — allow camera to mount immediately.
                setGuardReady(true);
            }

            return () => {
                if (autoReturnTimerRef.current) {
                    clearTimeout(autoReturnTimerRef.current);
                    autoReturnTimerRef.current = null;
                }
            };
        }, [route?.params?.reason, evaluateGuard])
    );

    useEffect(() => {
        if (route?.params?.reason) {
            setActiveReason(route.params.reason);
        }
    }, [route?.params?.reason]);

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

    // Camera only activates once the guard has been evaluated (guardReady) and no reason modal is blocking
    const isCameraActive = isFocused && !isSuccess && shiftPhase !== 'done' && guardReady && !reasonModalVisible;

    // Success Punch Confirmation State
    const [punchResult, setPunchResult] = useState<{
        time: string;
        message: string;
        action?: string;
    } | null>(null);

    // Error Modal State (Prominent In-App Geofence & Business Error Sheet)
    const [errorModalVisible, setErrorModalVisible] = useState<boolean>(false);
    const [errorDetails, setErrorDetails] = useState<{
        title: string;
        message: string;
        distance?: number | null;
        code?: string | null;
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
        setErrorModalVisible(false);
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
            let loc = await getVerifiedLocation(7000);

            if (!loc?.coords) {
                if (currentLocationRef.current?.coords) {
                    loc = currentLocationRef.current;
                } else {
                    throw new Error(
                        t('unable_gps_coords', 'Unable to retrieve GPS coordinates. Please ensure Location services are enabled and try again.')
                    );
                }
            }

            const deviceId = await getDeviceId();
            const punchPayload = {
                branch_code: qrResult.branchCode || undefined,
                payload: qrResult.payload || undefined,
                signature: qrResult.signature || 'STATIC',
                user_lat: loc.coords.latitude,
                user_lng: loc.coords.longitude,
                device_id: deviceId,
                reason: reason || undefined,
                scanned_at: new Date().toISOString(),
            };

            let response: AttendanceClockInResponse;
            try {
                response = await attendanceApi.clockIn(punchPayload);
            } catch (networkErr: any) {
                // If network failure or offline, queue punch for durable background sync
                const isOffline = !networkErr.response || networkErr.message === 'Network Error' || networkErr.code === 'ECONNABORTED';
                if (isOffline) {
                    await syncQueue.enqueue(
                        'attendance_punch',
                        '/employee-app/attendance/clock-in',
                        'POST',
                        punchPayload
                    );

                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

                    setPunchResult({
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        message: t('attendance_offline_saved', 'Attendance Saved Offline • Will sync automatically when connection is restored.'),
                        action: 'warning',
                    });

                    setReasonModalVisible(false);
                    setIsSubmitting(false);
                    setIsSuccess(true);
                    return;
                }

                // Propagate server business error (geofence, branch mismatch, etc.)
                throw networkErr;
            }

            // If the server requires a mandatory reason for late arrival or early departure
            if (response.require_reason && !reason) {
                setPendingQrResult(qrResult);
                setReasonType(response.type === 'early_departure' ? 'early_departure' : 'late');
                setDelayMinutes(response.minutes || 0);
                setIsSubmitting(false);
                setReasonModalVisible(true);
                return;
            }

            // Attendance punch successful! Instant UI feedback without blocking on background sync
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

            setPunchResult({
                time: response.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                message: response.message || t('attendance_success_desc', 'Attendance Recorded Successfully'),
                action: response.action || 'success',
            });

            setReasonModalVisible(false);
            setIsSubmitting(false);
            setIsSuccess(true);

            // Fire-and-forget cache invalidation in background (never block success screen)
            queryClient.invalidateQueries({ queryKey: ['dashboardBootstrap'] });
            queryClient.invalidateQueries({ queryKey: ['attendanceHistory'] });
            queryClient.invalidateQueries({ queryKey: ['shiftToday'] });
        } catch (error: any) {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

            const resData = error?.response?.data;
            const rawMessage = resData?.message || error?.message || t('attendance_record_failed', 'Attendance recording failed.');

            const distMatch = rawMessage?.match(/Distance:\s*(\d+)m/i);
            const distanceVal = resData?.distance ?? (distMatch ? Number(distMatch[1]) : null);

            let errTitle = t('clock_in_failed', 'Clock-in Failed');
            let errDesc = rawMessage;

            if (distanceVal !== null && distanceVal !== undefined) {
                const roundedDist = Math.round(distanceVal);
                errTitle = t('outside_branch_geofence', 'Outside Branch Geofence');
                errDesc = `${t('you_are_away_by', 'You are')} ${roundedDist}m ${t('away_from_branch', 'away from this branch. Please scan while inside the office premises.')}`;
            } else if (resData?.code === 'BRANCH_NOT_FOUND_QR') {
                errTitle = t('invalid_qr_code', 'Invalid QR Code');
                errDesc = t('branch_invalid_qr', 'Branch not found. Please scan an authorized branch QR code.');
            } else if (resData?.code === 'ATTENDANCE_ALREADY_COMPLETED') {
                errTitle = t('attendance_recorded', 'Attendance Completed');
                errDesc = t('attendance_completed_today', 'All attendance sessions for today have already been completed.');
            } else if (resData?.code === 'DEVICE_TAKEN') {
                errTitle = t('security_error', 'Security Error');
                errDesc = t('device_registered_to_other', 'This device is bound to another employee account.');
            }

            setErrorDetails({
                title: errTitle,
                message: errDesc,
                distance: distanceVal,
                code: resData?.code || null,
            });
            setErrorModalVisible(true);
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

        // Proactive Guard: If reason is required but not yet provided, block scan and prompt reason modal
        const currentReason = activeReason || route?.params?.reason || '';
        if (!currentReason) {
            const guard = evaluateGuard(new Date());
            if (guard.require_reason && (guard.type === 'late' || guard.type === 'early_departure')) {
                setPendingQrResult(parseResult);
                setReasonType(guard.type);
                setDelayMinutes(guard.minutes);
                setReasonModalVisible(true);
                isProcessingRef.current = false;
                return;
            }
        }

        await executePunch(parseResult, currentReason);
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
            // Guard check is now handled in the first useFocusEffect above.
            return () => subscription.remove();
        }, [handleBackNavigation])
    );

    // Permission Screen: Camera Explicitly Denied
    if (cameraPermission && !cameraPermission.granted) {
        return (
            <SafeAreaView {...({ style: [styles.centerContainer, { backgroundColor: theme.colors.background }] } as any)}>
                <View style={styles.permIconCircle}>
                    <QrCode color={theme.colors.brand} size={48} />
                </View>
                <AppText style={[styles.permTitle, { color: theme.colors.textPrimary }]}>{t('camera_permission_required', 'Camera Permission Required')}</AppText>
                <AppText style={[styles.permDesc, { color: theme.colors.textSecondary }]}>
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
            <SafeAreaView {...({ style: [styles.centerContainer, { backgroundColor: theme.colors.background }] } as any)}>
                <View style={[styles.permIconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}>
                    <MapPin color="#EF4444" size={48} />
                </View>
                <AppText style={[styles.permTitle, { color: theme.colors.textPrimary }]}>{t('gps_location_required', 'GPS Location Required')}</AppText>
                <AppText style={[styles.permDesc, { color: theme.colors.textSecondary }]}>
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

    // 1. Enterprise Success Screen (Full-screen, Camera Hardware Released)
    if (isSuccess) {
        return (
            <SafeAreaView {...({ style: [styles.fullScreenSuccess, { backgroundColor: theme.colors.background }] } as any)}>
                {/* Clean Top Bar */}
                <View style={styles.successTopBar}>
                    <TouchableOpacity
                        style={[styles.successCloseBtn, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' }]}
                        onPress={handleReturnToDashboard}
                        activeOpacity={0.7}
                        accessibilityLabel={t('close', 'Close')}
                    >
                        <X color={isDark ? '#94A3B8' : '#64748B'} size={22} />
                    </TouchableOpacity>
                </View>

                {/* Centered Success Confirmation Body */}
                <View style={styles.successBody}>
                    <View style={styles.successBadgeOuter}>
                        <View style={styles.successBadgeMiddle}>
                            <View style={styles.successBadgeInner}>
                                <CheckCircle2 color="#10B981" size={48} />
                            </View>
                        </View>
                    </View>

                    <AppText style={[styles.successTitle, { color: theme.colors.textPrimary }]}>
                        {t('attendance_recorded', 'Attendance Recorded!')}
                    </AppText>

                    {Boolean(punchResult?.message) && (
                        <AppText style={[styles.successSubtitle, { color: theme.colors.textSecondary }]}>
                            {punchResult?.message}
                        </AppText>
                    )}

                    {/* Formatted Timestamp Pill */}
                    {Boolean(punchResult?.time) && (
                        <View style={[
                            styles.timePill,
                            {
                                backgroundColor: isDark ? 'rgba(16, 185, 129, 0.14)' : 'rgba(16, 185, 129, 0.10)',
                                borderColor: isDark ? 'rgba(16, 185, 129, 0.35)' : 'rgba(16, 185, 129, 0.25)',
                            }
                        ]}>
                            <Clock size={16} color={isDark ? '#34D399' : '#059669'} style={{ marginRight: 6 }} />
                            <AppText style={[styles.timePillText, { color: isDark ? '#34D399' : '#059669' }]}>
                                {punchResult?.time}
                            </AppText>
                        </View>
                    )}

                    <AppText style={[styles.autoReturnHint, { color: theme.colors.textSecondary }]}>
                        {t('returning_to_dashboard', 'Returning to dashboard in a moment...')}
                    </AppText>
                </View>

                {/* Bottom Actions */}
                <View style={styles.successActions}>
                    <TouchableOpacity
                        style={[styles.primarySuccessBtn, { backgroundColor: theme.colors.brand }]}
                        onPress={handleReturnToDashboard}
                        activeOpacity={0.85}
                    >
                        <AppText style={styles.primarySuccessBtnText}>
                            {t('back_to_dashboard', 'Back to Dashboard')}
                        </AppText>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.secondarySuccessBtn,
                            {
                                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : theme.colors.surface,
                                borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : theme.colors.border,
                            }
                        ]}
                        onPress={() => {
                            if (autoReturnTimerRef.current) {
                                clearTimeout(autoReturnTimerRef.current);
                                autoReturnTimerRef.current = null;
                            }
                            setIsSuccess(false);
                            resetScanState();
                            navigation.navigate('History');
                        }}
                        activeOpacity={0.8}
                    >
                        <AppText style={[styles.secondarySuccessBtnText, { color: theme.colors.textPrimary }]}>
                            {t('view_attendance_history', 'View Attendance History')}
                        </AppText>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // 2. Shift Completed Screen (No camera hardware mounted if employee is already done)
    if (shiftPhase === 'done' && !isSuccess) {
        return (
            <SafeAreaView {...({ style: [styles.fullScreenSuccess, { backgroundColor: theme.colors.background }] } as any)}>
                <View style={styles.successTopBar}>
                    <TouchableOpacity
                        style={[styles.successCloseBtn, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : theme.colors.surfaceSubtle }]}
                        onPress={() => navigation.navigate('HomeTab')}
                        activeOpacity={0.7}
                    >
                        <X color={isDark ? '#94A3B8' : theme.colors.textSecondary} size={22} />
                    </TouchableOpacity>
                </View>

                <View style={styles.successBody}>
                    <View style={styles.successBadgeOuter}>
                        <View style={styles.successBadgeMiddle}>
                            <View style={styles.successBadgeInner}>
                                <CheckCircle2 color="#10B981" size={48} />
                            </View>
                        </View>
                    </View>

                    <AppText style={[styles.successTitle, { color: theme.colors.textPrimary }]}>
                        {t('shift_completed', 'Shift Completed')}
                    </AppText>
                    <AppText style={[styles.successSubtitle, { color: theme.colors.textSecondary }]}>
                        {t('you_have_completed_today_shift', 'All scheduled attendance punches for today have already been completed.')}
                    </AppText>
                </View>

                <View style={styles.successActions}>
                    <TouchableOpacity
                        style={[styles.primarySuccessBtn, { backgroundColor: theme.colors.brand }]}
                        onPress={() => navigation.navigate('HomeTab')}
                        activeOpacity={0.85}
                    >
                        <AppText style={styles.primarySuccessBtnText}>
                            {t('back_to_dashboard', 'Back to Dashboard')}
                        </AppText>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.secondarySuccessBtn,
                            {
                                borderColor: theme.colors.border,
                                backgroundColor: theme.colors.surface,
                            },
                        ]}
                        onPress={() => navigation.navigate('History')}
                        activeOpacity={0.8}
                    >
                        <AppText style={[styles.secondarySuccessBtnText, { color: theme.colors.textPrimary }]}>
                            {t('view_attendance_history', 'View Attendance History')}
                        </AppText>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // 3. Instant Scanner Viewport (Camera renders only when active and focused)
    return (
        <View style={styles.container}>
            {/* Modern Scanner Canvas */}
            <ModernScannerCanvas
                onBarcodeScanned={handleBarCodeScanned}
                onUploadPhotoPress={pickAndDecodeImage}
                onBackPress={handleBackNavigation}
                isScanned={scanned}
                isActive={isCameraActive}
                isLoading={isSubmitting}
                isDecodingImage={isDecoding}
                loadingText={t('verifying_geofence_punch', 'Verifying Geofence & Punch...')}
                instructionText={t('align_branch_qr_hint', 'Align Office Branch QR Code to Record Attendance')}
                accentColor={theme.colors.brand}
                onRescanPress={resetScanState}
                topContent={
                    <View style={{ alignItems: 'center' }}>
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
                        {Boolean(activeReason || route?.params?.reason) && (
                            <View style={styles.attachedReasonChip}>
                                <AppText style={styles.attachedReasonText} numberOfLines={1}>
                                    {t('reason_attached', 'Reason')}: {activeReason || route?.params?.reason}
                                </AppText>
                            </View>
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
                presets={reasonPresets}
                submitLabel={pendingQrResult ? t('confirm_and_submit_attendance', 'Confirm & Submit Attendance') : t('confirm_and_proceed', 'Confirm & Proceed')}
                onProceed={async (reasonText) => {
                    setActiveReason(reasonText);
                    setReasonModalVisible(false);

                    if (pendingQrResult) {
                        const qr = pendingQrResult;
                        setPendingQrResult(null);
                        await executePunch(qr, reasonText);
                    } else {
                        // Guard cleared — reason provided proactively before any scan.
                        // Activate the camera now that the guard is satisfied.
                        setGuardReady(true);
                        setScanned(false);
                        isProcessingRef.current = false;
                    }
                }}
                onCancel={() => {
                    setReasonModalVisible(false);
                    setPendingQrResult(null);
                    const currentReason = activeReason || route?.params?.reason;
                    if (!currentReason) {
                        handleBackNavigation();
                    } else {
                        setScanned(false);
                        isProcessingRef.current = false;
                    }
                }}
            />

            {/* Error Confirmation Sheet (Rich In-App Feedback for Distance & Geofence Errors) */}
            <AppBottomSheet
                visible={errorModalVisible}
                onClose={() => {
                    setErrorModalVisible(false);
                    resetScanState();
                }}
                title={errorDetails?.title || t('clock_in_failed', 'Clock-in Failed')}
                subtitle={errorDetails?.distance ? `${Math.round(errorDetails.distance)}m ${t('away', 'Away')}` : undefined}
                footer={
                    <View style={styles.errorBtnRow}>
                        <TouchableOpacity
                            style={[styles.modalSecondaryBtn, { borderColor: theme.colors.border }]}
                            onPress={() => {
                                setErrorModalVisible(false);
                                resetScanState();
                                handleBackNavigation();
                            }}
                            activeOpacity={0.8}
                        >
                            <AppText style={[styles.modalSecondaryBtnText, { color: theme.colors.textPrimary }]}>
                                {t('cancel', 'Cancel')}
                            </AppText>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.modalPrimaryBtn, { backgroundColor: theme.colors.brand }]}
                            onPress={() => {
                                setErrorModalVisible(false);
                                resetScanState();
                            }}
                            activeOpacity={0.85}
                        >
                            <AppText style={styles.modalPrimaryBtnText}>{t('try_again', 'Try Again')}</AppText>
                        </TouchableOpacity>
                    </View>
                }
            >
                <View style={styles.errorIconWrapper}>
                    <View
                        style={[
                            styles.errorIconOuter,
                            {
                                backgroundColor: isDark
                                    ? 'rgba(239, 68, 68, 0.12)'
                                    : 'rgba(254, 226, 226, 0.7)',
                            },
                        ]}
                    >
                        <View
                            style={[
                                styles.errorIconInner,
                                {
                                    backgroundColor: isDark
                                        ? 'rgba(239, 68, 68, 0.22)'
                                        : 'rgba(254, 202, 202, 0.8)',
                                },
                            ]}
                        >
                            <AlertCircle color={theme.colors.status.danger} size={32} />
                        </View>
                    </View>
                </View>

                {/* Refined Error Confirmation Card with Clean Typography & Subtle Semantic Tint */}
                <View
                    style={[
                        styles.errorDetailsCard,
                        {
                            backgroundColor: isDark
                                ? 'rgba(239, 68, 68, 0.08)'
                                : '#FEF2F2',
                            borderColor: isDark
                                ? 'rgba(239, 68, 68, 0.25)'
                                : 'rgba(248, 113, 113, 0.35)',
                        },
                    ]}
                >
                    <AppText
                        style={[
                            styles.errorDescText,
                            { color: isDark ? '#F1F5F9' : '#1E293B' },
                        ]}
                    >
                        {errorDetails?.message}
                    </AppText>

                    {Boolean(errorDetails?.distance) && (
                        <View
                            style={[
                                styles.distancePill,
                                {
                                    backgroundColor: isDark
                                        ? 'rgba(239, 68, 68, 0.18)'
                                        : 'rgba(239, 68, 68, 0.10)',
                                    borderColor: isDark
                                        ? 'rgba(239, 68, 68, 0.35)'
                                        : 'rgba(239, 68, 68, 0.25)',
                                },
                            ]}
                        >
                            <MapPin color={theme.colors.status.danger} size={13} />
                            <AppText
                                style={[
                                    styles.distancePillText,
                                    { color: isDark ? '#F87171' : '#DC2626' },
                                ]}
                            >
                                {t('detected_distance', 'Detected Distance')}: {Math.round(errorDetails!.distance!)}m
                            </AppText>
                        </View>
                    )}
                </View>

                <AppText style={[styles.errorHelperText, { color: theme.colors.textSecondary }]}>
                    {t('geofence_tip', 'Tip: Please ensure you are physically located inside the branch office premises before scanning.')}
                </AppText>
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
    attachedReasonChip: {
        marginTop: 6,
        backgroundColor: 'rgba(245, 158, 11, 0.9)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        maxWidth: 260,
    },
    attachedReasonText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700',
    },
    errorIconWrapper: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    errorIconOuter: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorIconInner: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorDetailsCard: {
        width: '100%',
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 18,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorDescText: {
        fontSize: 14,
        lineHeight: 22,
        fontWeight: '500',
        textAlign: 'center',
    },
    distancePill: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 12,
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        alignSelf: 'center',
    },
    distancePillText: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    errorHelperText: {
        fontSize: 12,
        lineHeight: 18,
        textAlign: 'center',
        marginTop: 10,
        marginBottom: 4,
        paddingHorizontal: 8,
    },
    errorBtnRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        width: '100%',
    },
    modalSecondaryBtn: {
        flex: 1,
        minHeight: 48,
        borderRadius: 14,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    modalSecondaryBtnText: {
        fontSize: 14,
        fontWeight: '600',
    },
    modalPrimaryBtn: {
        flex: 1,
        minHeight: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    modalPrimaryBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
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
    fullScreenSuccess: {
        flex: 1,
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingBottom: 24,
    },
    successTopBar: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingTop: 8,
        paddingBottom: 8,
    },
    successCloseBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    successBody: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 8,
    },
    successBadgeOuter: {
        width: 112,
        height: 112,
        borderRadius: 56,
        backgroundColor: 'rgba(16, 185, 129, 0.08)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    successBadgeMiddle: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: 'rgba(16, 185, 129, 0.16)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    successBadgeInner: {
        width: 68,
        height: 68,
        borderRadius: 34,
        backgroundColor: 'rgba(16, 185, 129, 0.28)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    successTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#F8FAFC',
        textAlign: 'center',
        marginBottom: 8,
        letterSpacing: -0.3,
    },
    successSubtitle: {
        fontSize: 14,
        color: '#94A3B8',
        textAlign: 'center',
        marginBottom: 16,
        lineHeight: 20,
        maxWidth: 290,
    },
    timePill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(16, 185, 129, 0.14)',
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.35)',
        paddingHorizontal: 16,
        paddingVertical: 7,
        borderRadius: 24,
        marginBottom: 20,
    },
    timePillText: {
        color: '#34D399',
        fontSize: 15,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    verifiedCard: {
        width: '100%',
        borderRadius: 18,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 16,
    },
    verifiedRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
    },
    verifiedRowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    verifiedLabel: {
        fontSize: 13,
        color: '#94A3B8',
        fontWeight: '600',
    },
    verifiedVal: {
        fontSize: 13,
        color: '#F8FAFC',
        fontWeight: '700',
    },
    cardDivider: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        marginVertical: 4,
    },
    autoReturnHint: {
        fontSize: 12,
        color: '#64748B',
        textAlign: 'center',
        marginTop: 6,
    },
    successActions: {
        width: '100%',
        gap: 12,
    },
    primarySuccessBtn: {
        width: '100%',
        minHeight: 52,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primarySuccessBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '800',
    },
    secondarySuccessBtn: {
        width: '100%',
        minHeight: 50,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondarySuccessBtnText: {
        color: '#E2E8F0',
        fontSize: 14,
        fontWeight: '700',
    },
});
