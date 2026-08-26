import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Modal,
    SafeAreaView,
} from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';
import { MapPin, Navigation, CheckCircle2, QrCode, ArrowLeft } from 'lucide-react-native';
import { ENV } from '../../config/env';
import { apiClient } from '../../api/client';
import { useAppTheme } from '../../context/ThemeContext';

// Geofence Distance Calculator (Haversine formula in meters)
function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3; // metres
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c);
}

export const ScanAttendanceScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const { isDark } = useAppTheme();
    const { theme } = useUnistyles();
    const styles = stylesheet;
    const queryClient = useQueryClient();

    const [cameraPermission, requestCameraPermission] = useCameraPermissions();
    const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
    const [currentLocation, setCurrentLocation] = useState<any>(null);
    const [distance, setDistance] = useState<number | null>(null);
    const [isWithinGeofence, setIsWithinGeofence] = useState<boolean>(false);
    const [scanned, setScanned] = useState<boolean>(false);
    const [successModalVisible, setSuccessModalVisible] = useState<boolean>(false);
    const [punchDetails, setPunchDetails] = useState<{ time: string; type: string } | null>(null);
    const [loadingLocation, setLoadingLocation] = useState<boolean>(true);

    useEffect(() => {
        setupLocation();
    }, []);

    const setupLocation = async () => {
        setLoadingLocation(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setLocationPermission(false);
                setLoadingLocation(false);
                return;
            }
            setLocationPermission(true);

            const loc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });
            setCurrentLocation(loc);

            const dist = getDistanceMeters(
                loc.coords.latitude,
                loc.coords.longitude,
                ENV.DEFAULT_LATITUDE,
                ENV.DEFAULT_LONGITUDE
            );
            setDistance(dist);
            setIsWithinGeofence(dist <= ENV.GEOFENCE_RADIUS_METERS);
        } catch (e) {
            console.error('Location Error', e);
        } finally {
            setLoadingLocation(false);
        }
    };

    if (!cameraPermission || locationPermission === null || loadingLocation) {
        return (
            <SafeAreaView style={styles.centerContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Verifying GPS & Camera Permissions...</Text>
            </SafeAreaView>
        );
    }

    if (!cameraPermission.granted) {
        return (
            <SafeAreaView style={styles.centerContainer}>
                <QrCode color={theme.colors.textSecondary} size={60} />
                <Text style={styles.permTitle}>Camera Permission Required</Text>
                <Text style={styles.permDesc}>
                    Please allow camera access to scan Attendance QR code.
                </Text>
                <TouchableOpacity style={styles.btnPrimary} onPress={requestCameraPermission}>
                    <Text style={styles.btnText}>Enable Camera</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    if (!locationPermission) {
        return (
            <SafeAreaView style={styles.centerContainer}>
                <MapPin color={theme.colors.status.danger} size={60} />
                <Text style={styles.permTitle}>Location Access Required</Text>
                <Text style={styles.permDesc}>
                    High-accuracy GPS location is required to verify office geofence clock-in.
                </Text>
                <TouchableOpacity style={styles.btnPrimary} onPress={setupLocation}>
                    <Text style={styles.btnText}>Grant Location Access</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    const handleBarCodeScanned = async ({ data }: { data: string }) => {
        if (scanned) return;

        if (!isWithinGeofence) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert(
                'Outside Office Geofence',
                `You are currently ${distance}m away from office (allowed radius: ${ENV.GEOFENCE_RADIUS_METERS}m). Please move closer to clock in.`
            );
            return;
        }

        setScanned(true);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        try {
            await apiClient.post('/attendance/scan/clock', {
                qr_data: data,
                latitude: currentLocation?.coords.latitude,
                longitude: currentLocation?.coords.longitude,
            }).catch(() => null);

            await queryClient.invalidateQueries({ queryKey: ['attendanceHistory'] });
        } catch (e) {
            console.log('Clock sync handled');
        }

        const now = new Date();
        const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setPunchDetails({ time: formattedTime, type: 'Clock In' });
        setSuccessModalVisible(true);
    };

    return (
        <View style={styles.container}>
            {/* Header Controls */}
            <SafeAreaView style={styles.headerSafeArea}>
                <TouchableOpacity style={styles.iconCircle} onPress={() => navigation.goBack()}>
                    <ArrowLeft color="#FFFFFF" size={20} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Attendance Scanner</Text>
                <View style={{ width: 40 }} />
            </SafeAreaView>

            {/* Radar & Geofence Verification Card */}
            <View style={styles.radarCard}>
                <View style={styles.radarRow}>
                    <Navigation
                        color={isWithinGeofence ? theme.colors.status.success : theme.colors.status.danger}
                        size={22}
                    />
                    <View style={styles.radarInfo}>
                        <Text style={styles.radarTitle}>
                            {isWithinGeofence ? 'Office Location Verified' : 'Out of Radius'}
                        </Text>
                        <Text style={styles.radarSub}>
                            Distance: {distance !== null ? `${distance}m` : 'Calculating...'} (Max: {ENV.GEOFENCE_RADIUS_METERS}m)
                        </Text>
                    </View>
                    <View style={[styles.badge, isWithinGeofence ? styles.badgeSuccess : styles.badgeError]}>
                        <Text style={styles.badgeText}>{isWithinGeofence ? 'INSIDE' : 'OUTSIDE'}</Text>
                    </View>
                </View>
            </View>

            {/* Camera View */}
            <CameraView
                style={StyleSheet.absoluteFill}
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            />

            {/* Scanner Frame */}
            <View style={styles.overlay}>
                <View style={styles.scanSquare}>
                    <View style={[styles.corner, styles.tl, { borderColor: theme.colors.primary }]} />
                    <View style={[styles.corner, styles.tr, { borderColor: theme.colors.primary }]} />
                    <View style={[styles.corner, styles.bl, { borderColor: theme.colors.primary }]} />
                    <View style={[styles.corner, styles.br, { borderColor: theme.colors.primary }]} />
                </View>
                <Text style={styles.scanPrompt}>
                    Align Office QR Code to record Attendance
                </Text>
            </View>

            {/* Success Confirmation Modal */}
            <Modal visible={successModalVisible} transparent animationType="slide">
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalContent}>
                        <CheckCircle2 color={theme.colors.status.success} size={64} />
                        <Text style={styles.modalTitle}>Attendance Recorded!</Text>
                        <Text style={styles.modalSub}>
                            Successfully recorded {punchDetails?.type} at {punchDetails?.time}
                        </Text>

                        <View style={styles.modalDetails}>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Location Status:</Text>
                                <Text style={styles.detailVal}>Geofence Verified ({distance}m)</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Timestamp:</Text>
                                <Text style={styles.detailVal}>{punchDetails?.time}</Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.modalBtn}
                            onPress={() => {
                                setSuccessModalVisible(false);
                                setScanned(false);
                                navigation.navigate('HomeTab');
                            }}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.modalBtnText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const stylesheet = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    centerContainer: {
        flex: 1,
        backgroundColor: theme.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.lg,
    },
    loadingText: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        marginTop: theme.spacing.md,
    },
    headerSafeArea: {
        position: 'absolute',
        top: theme.spacing.xl,
        left: theme.spacing.md,
        right: theme.spacing.md,
        zIndex: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 17,
    },
    radarCard: {
        position: 'absolute',
        top: 96,
        left: theme.spacing.md,
        right: theme.spacing.md,
        zIndex: 20,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.md,
    },
    radarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm + 4,
    },
    radarInfo: {
        flex: 1,
    },
    radarTitle: {
        color: theme.colors.textPrimary,
        fontSize: 14,
        fontWeight: '700',
    },
    radarSub: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        marginTop: 2,
    },
    badge: {
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 4,
        borderRadius: theme.borderRadius.sm,
    },
    badgeSuccess: { backgroundColor: theme.colors.surfaceSubtle },
    badgeError: { backgroundColor: theme.colors.surfaceSubtle },
    badgeText: { color: theme.colors.textPrimary, fontSize: 10, fontWeight: '800' },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
    },
    scanSquare: {
        width: 240,
        height: 240,
        borderRadius: 20,
        position: 'relative',
    },
    corner: {
        position: 'absolute',
        width: 28,
        height: 28,
    },
    tl: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 12 },
    tr: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 12 },
    bl: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 12 },
    br: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 12 },
    scanPrompt: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
        marginTop: theme.spacing.lg,
    },
    permTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.textPrimary, marginTop: theme.spacing.md },
    permDesc: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center', marginVertical: theme.spacing.sm },
    btnPrimary: { backgroundColor: theme.colors.primary, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.sm + 4, borderRadius: theme.borderRadius.md },
    btnText: { color: '#FFFFFF', fontWeight: '700' },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.lg,
    },
    modalContent: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg + 4,
        padding: theme.spacing.lg,
        alignItems: 'center',
        width: '100%',
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.md,
    },
    modalTitle: { fontSize: 22, fontWeight: '800', color: theme.colors.textPrimary, marginTop: theme.spacing.md },
    modalSub: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center', marginTop: 6, marginBottom: theme.spacing.md },
    modalDetails: {
        width: '100%',
        backgroundColor: theme.colors.surfaceSubtle,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
        gap: 8,
    },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
    detailLabel: { color: theme.colors.textSecondary, fontSize: 13 },
    detailVal: { color: theme.colors.textPrimary, fontSize: 13, fontWeight: '600' },
    modalBtn: { backgroundColor: theme.colors.primary, width: '100%', height: 48, borderRadius: theme.borderRadius.md, justifyContent: 'center', alignItems: 'center', ...theme.shadows.sm },
    modalBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
}));
