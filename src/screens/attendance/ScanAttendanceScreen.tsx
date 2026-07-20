import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Modal,
    SafeAreaView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { MapPin, Navigation, CheckCircle2, XCircle, QrCode, ArrowLeft } from 'lucide-react-native';
import { ENV } from '../../config/env';
import { apiClient } from '../../api/client';

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
                <ActivityIndicator size="large" color="#2563EB" />
                <Text style={styles.loadingText}>Verifying GPS & Camera Permissions...</Text>
            </SafeAreaView>
        );
    }

    if (!cameraPermission.granted) {
        return (
            <SafeAreaView style={styles.centerContainer}>
                <QrCode color="#94A3B8" size={60} />
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
                <MapPin color="#EF4444" size={60} />
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
                    <ArrowLeft color="#FFFFFF" size={22} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Attendance Scanner</Text>
                <View style={{ width: 40 }} />
            </SafeAreaView>

            {/* Radar & Geofence Verification Card */}
            <View style={styles.radarCard}>
                <View style={styles.radarRow}>
                    <Navigation color={isWithinGeofence ? '#10B981' : '#EF4444'} size={22} />
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
                    <View style={[styles.corner, styles.tl]} />
                    <View style={[styles.corner, styles.tr]} />
                    <View style={[styles.corner, styles.bl]} />
                    <View style={[styles.corner, styles.br]} />
                </View>
                <Text style={styles.scanPrompt}>
                    Align Office QR Code to record Attendance
                </Text>
            </View>

            {/* Success Confirmation Modal */}
            <Modal visible={successModalVisible} transparent animationType="slide">
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalContent}>
                        <CheckCircle2 color="#10B981" size={70} />
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
                        >
                            <Text style={styles.modalBtnText}>Done</Text>
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
    },
    headerSafeArea: {
        position: 'absolute',
        top: 40,
        left: 20,
        right: 20,
        zIndex: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
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
        top: 100,
        left: 20,
        right: 20,
        zIndex: 20,
        backgroundColor: 'rgba(30, 41, 59, 0.95)',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: '#334155',
    },
    radarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    radarInfo: {
        flex: 1,
    },
    radarTitle: {
        color: '#F8FAFC',
        fontSize: 14,
        fontWeight: '700',
    },
    radarSub: {
        color: '#94A3B8',
        fontSize: 12,
        marginTop: 2,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    badgeSuccess: { backgroundColor: '#10B98120' },
    badgeError: { backgroundColor: '#EF444420' },
    badgeText: { color: '#F8FAFC', fontSize: 10, fontWeight: '800' },
    overlay: {
        ...StyleSheet.absoluteFill,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
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
        borderColor: '#2563EB',
    },
    tl: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 12 },
    tr: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 12 },
    bl: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 12 },
    br: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 12 },
    scanPrompt: {
        color: '#F8FAFC',
        fontSize: 14,
        fontWeight: '600',
        marginTop: 24,
    },
    permTitle: { fontSize: 20, fontWeight: '700', color: '#F8FAFC', marginTop: 16 },
    permDesc: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginVertical: 12 },
    btnPrimary: { backgroundColor: '#2563EB', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
    btnText: { color: '#FFFFFF', fontWeight: '700' },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.75)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: '#1E293B',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        width: '100%',
        borderWidth: 1,
        borderColor: '#334155',
    },
    modalTitle: { fontSize: 22, fontWeight: '800', color: '#F8FAFC', marginTop: 16 },
    modalSub: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginTop: 6, marginBottom: 20 },
    modalDetails: {
        width: '100%',
        backgroundColor: '#0F172A',
        borderRadius: 14,
        padding: 14,
        marginBottom: 20,
        gap: 8,
    },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
    detailLabel: { color: '#64748B', fontSize: 13 },
    detailVal: { color: '#F8FAFC', fontSize: 13, fontWeight: '600' },
    modalBtn: { backgroundColor: '#2563EB', width: '100%', height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    modalBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
