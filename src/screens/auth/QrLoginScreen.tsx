import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, QrCode } from 'lucide-react-native';

export const QrLoginScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const { loginWithQr, isLoading } = useAuth();

    useEffect(() => {
        if (!permission) {
            requestPermission();
        }
    }, [permission]);

    if (!permission) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#2563EB" />
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View style={styles.centerContainer}>
                <QrCode color="#94A3B8" size={60} />
                <Text style={styles.permTitle}>Camera Permission Required</Text>
                <Text style={styles.permDesc}>
                    We need camera access to scan your Employee Badge QR code for quick login.
                </Text>
                <TouchableOpacity style={styles.permButton} onPress={requestPermission}>
                    <Text style={styles.permBtnText}>Grant Permission</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const handleBarcodeScanned = async ({ data }: { data: string }, force: boolean = false) => {
        if ((scanned && !force) || isLoading) return;
        setScanned(true);

        try {
            await loginWithQr(data, force);
        } catch (error: any) {
            if (error?.code === 'DEVICE_MISMATCH') {
                Alert.alert(
                    'Device Transfer Required',
                    error.message || 'This account is registered to another device. Would you like to transfer your account to this device?',
                    [
                        { text: 'Cancel', style: 'cancel', onPress: () => setScanned(false) },
                        {
                            text: 'Transfer Account',
                            style: 'destructive',
                            onPress: () => handleBarcodeScanned({ data }, true),
                        },
                    ]
                );
            } else if (error?.code === 'DEVICE_TAKEN') {
                Alert.alert('Security Error', error.message || 'This device is registered to another employee.', [
                    { text: 'Try Again', onPress: () => setScanned(false) }
                ]);
            } else {
                Alert.alert('Scan Failed', error?.message || 'Invalid Employee QR code.', [
                    { text: 'Try Again', onPress: () => setScanned(false) }
                ]);
            }
        }
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <ArrowLeft color="#FFFFFF" size={24} />
            </TouchableOpacity>

            <CameraView
                style={StyleSheet.absoluteFill}
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            />

            {/* Overlay Mask */}
            <View style={styles.overlay}>
                <View style={styles.scannerFrame}>
                    <View style={[styles.corner, styles.topLeft]} />
                    <View style={[styles.corner, styles.topRight]} />
                    <View style={[styles.corner, styles.bottomLeft]} />
                    <View style={[styles.corner, styles.bottomRight]} />
                </View>
                <Text style={styles.instructionText}>
                    Align your Employee QR Code inside the box to sign in automatically
                </Text>
                {scanned && (
                    <TouchableOpacity style={styles.rescanBtn} onPress={() => setScanned(false)}>
                        <Text style={styles.rescanBtnText}>Tap to Rescan</Text>
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
    centerContainer: {
        flex: 1,
        backgroundColor: '#0F172A',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    backButton: {
        position: 'absolute',
        top: 50,
        left: 20,
        zIndex: 10,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        padding: 12,
        borderRadius: 12,
    },
    permTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#F8FAFC',
        marginTop: 16,
    },
    permDesc: {
        fontSize: 14,
        color: '#94A3B8',
        textAlign: 'center',
        marginTop: 8,
        marginBottom: 24,
    },
    permButton: {
        backgroundColor: '#2563EB',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    permBtnText: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    overlay: {
        ...StyleSheet.absoluteFill,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
    },
    scannerFrame: {
        width: 250,
        height: 250,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 24,
        position: 'relative',
    },
    corner: {
        position: 'absolute',
        width: 30,
        height: 30,
        borderColor: '#2563EB',
    },
    topLeft: { top: -2, left: -2, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 16 },
    topRight: { top: -2, right: -2, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 16 },
    bottomLeft: { bottom: -2, left: -2, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 16 },
    bottomRight: { bottom: -2, right: -2, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 16 },
    instructionText: {
        color: '#F8FAFC',
        fontSize: 14,
        textAlign: 'center',
        marginTop: 24,
        paddingHorizontal: 40,
        fontWeight: '500',
    },
    rescanBtn: {
        marginTop: 20,
        backgroundColor: '#2563EB',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10,
    },
    rescanBtnText: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
});
