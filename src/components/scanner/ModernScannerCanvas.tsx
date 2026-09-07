import React, { useState, useRef, useMemo } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    useWindowDimensions,
    PanResponder,
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import {
    ArrowLeft,
    Image as ImageIcon,
    Zap,
    ZapOff,
    RefreshCw,
} from 'lucide-react-native';
import { AppText } from '../AppText';
import { useTranslation } from '../../context/LanguageContext';
import { useAppTheme } from '../../context/ThemeContext';

export interface ModernScannerCanvasProps {
    onBarcodeScanned?: (result: { data: string }) => void;
    onUploadPhotoPress?: () => void;
    onBackPress: () => void;
    isScanned: boolean;
    isActive?: boolean;
    isLoading?: boolean;
    loadingText?: string;
    instructionText?: string;
    accentColor?: string;
    topContent?: React.ReactNode;
    onRescanPress?: () => void;
    isDecodingImage?: boolean;
}

export const ModernScannerCanvas: React.FC<ModernScannerCanvasProps> = ({
    onBarcodeScanned,
    onUploadPhotoPress,
    onBackPress,
    isScanned,
    isActive = true,
    isLoading = false,
    loadingText,
    instructionText,
    accentColor = '#DF0000',
    topContent,
    onRescanPress,
    isDecodingImage = false,
}) => {
    const { width } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
    const { isDark } = useAppTheme();

    const [torch, setTorch] = useState(false);
    const [zoom, setZoom] = useState(0); // 0 = 1.0x, 0.15 = ~2.0x, max 0.5

    // Frame sizing
    const frameSize = Math.min(width * 0.70, 260);

    // ── Pinch-to-Zoom Gesture (Multi-Touch via PanResponder) ────────────────
    const baseDistanceRef = useRef<number | null>(null);
    const baseZoomRef = useRef<number>(0);

    const panResponder = useMemo(
        () =>
            PanResponder.create({
                onStartShouldSetPanResponder: (evt: any) => evt.nativeEvent.touches.length >= 2,
                onMoveShouldSetPanResponder: (evt: any) => evt.nativeEvent.touches.length >= 2,
                onPanResponderGrant: (evt: any) => {
                    const touches = evt.nativeEvent.touches;
                    if (touches.length >= 2) {
                        const dx = touches[0].pageX - touches[1].pageX;
                        const dy = touches[0].pageY - touches[1].pageY;
                        baseDistanceRef.current = Math.hypot(dx, dy);
                        baseZoomRef.current = zoom;
                    }
                },
                onPanResponderMove: (evt: any) => {
                    const touches = evt.nativeEvent.touches;
                    if (touches.length >= 2 && baseDistanceRef.current !== null) {
                        const dx = touches[0].pageX - touches[1].pageX;
                        const dy = touches[0].pageY - touches[1].pageY;
                        const currentDistance = Math.hypot(dx, dy);
                        const scale = currentDistance / baseDistanceRef.current;
                        
                        // Map pinch scale to 0..0.4 zoom range
                        const newZoom = Math.min(
                            0.4,
                            Math.max(0, baseZoomRef.current + (scale - 1) * 0.15)
                        );
                        setZoom(newZoom);
                    }
                },
                onPanResponderRelease: () => {
                    baseDistanceRef.current = null;
                },
            }),
        [zoom]
    );

    const toggleTorch = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setTorch((prev) => !prev);
    };

    return (
        <View style={styles.container} {...panResponder.panHandlers}>
            {/* 1. Live Camera Preview with Native Auto Focus */}
            {isActive ? (
                <CameraView
                    style={StyleSheet.absoluteFill}
                    enableTorch={torch}
                    autofocus="on"
                    zoom={zoom}
                    barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                    onBarcodeScanned={isScanned ? undefined : onBarcodeScanned}
                />
            ) : (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000000' }]} />
            )}

            {/* 2. Top Bar / Status Utility Slot */}
            <View style={[styles.topBar, { top: insets.top + (Platform.OS === 'ios' ? 8 : 16) }]}>
                {topContent ? topContent : <View style={{ height: 38 }} />}
            </View>

            {/* 3. High-Contrast Viewfinder with Clean 4 Corner Brackets Only */}
            <View style={styles.overlay} pointerEvents="box-none">
                <View
                    style={[
                        styles.scannerFrame,
                        {
                            width: frameSize,
                            height: frameSize,
                        },
                    ]}
                >
                    {/* 4 Brand-Color Corner L-Brackets */}
                    <View style={[styles.corner, styles.topLeft, { borderColor: accentColor }]} />
                    <View style={[styles.corner, styles.topRight, { borderColor: accentColor }]} />
                    <View style={[styles.corner, styles.bottomLeft, { borderColor: accentColor }]} />
                    <View style={[styles.corner, styles.bottomRight, { borderColor: accentColor }]} />

                    {/* Authenticating / Submitting Loading Overlay */}
                    {(isLoading || isDecodingImage) && (
                        <View style={styles.loadingOverlay}>
                            <ActivityIndicator size="large" color={accentColor} />
                            <AppText style={styles.loadingOverlayText}>
                                {isDecodingImage
                                    ? t('scanning_image', 'Scanning QR from photo...')
                                    : loadingText || t('verifying_qr', 'Verifying QR Code...')}
                            </AppText>
                        </View>
                    )}
                </View>

                {/* Concise Guidance Copy */}
                <AppText style={styles.instructionText}>
                    {instructionText || t('align_qr_within_frame', 'Align the QR code within the frame to scan')}
                </AppText>

                {/* Tap to Rescan Button */}
                {isScanned && !isLoading && !isDecodingImage && onRescanPress && (
                    <TouchableOpacity
                        style={[styles.rescanBtn, { backgroundColor: accentColor }]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            onRescanPress();
                        }}
                        activeOpacity={0.85}
                        accessibilityLabel="Tap to rescan"
                    >
                        <RefreshCw size={16} color="#FFFFFF" />
                        <AppText style={styles.rescanBtnText}>
                            {t('tap_to_rescan', 'Tap to Rescan')}
                        </AppText>
                    </TouchableOpacity>
                )}
            </View>

            {/* 4. Thumb-Zone Bottom Action Bar */}
            <View
                style={[
                    styles.bottomControlsContainer,
                    {
                        bottom: insets.bottom + (Platform.OS === 'ios' ? 12 : 20),
                    },
                ]}
                pointerEvents="box-none"
            >
                {/* Bottom Left: Back Button */}
                <TouchableOpacity
                    style={styles.circleActionButton}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onBackPress();
                    }}
                    activeOpacity={0.75}
                    accessibilityLabel="Go back"
                >
                    <ArrowLeft color="#FFFFFF" size={20} />
                </TouchableOpacity>

                {/* Bottom Center: Primary Hero Photo Upload Button */}
                {onUploadPhotoPress && (
                    <TouchableOpacity
                        style={[
                            styles.heroUploadButton,
                            {
                                backgroundColor: accentColor,
                            },
                        ]}
                        onPress={onUploadPhotoPress}
                        activeOpacity={0.85}
                        disabled={isLoading || isDecodingImage}
                        accessibilityLabel="Upload photo from gallery"
                    >
                        <ImageIcon size={18} color="#FFFFFF" />
                        <AppText variant="button" weight="bold" style={styles.heroUploadText}>
                            {t('upload_photo', 'Upload Photo')}
                        </AppText>
                    </TouchableOpacity>
                )}

                {/* Bottom Right: Flash/Torch Toggle */}
                <TouchableOpacity
                    style={[
                        styles.circleActionButton,
                        torch && styles.circleActionButtonActiveTorch,
                    ]}
                    onPress={toggleTorch}
                    activeOpacity={0.75}
                    accessibilityLabel={torch ? 'Turn off flash' : 'Turn on flash'}
                >
                    {torch ? (
                        <Zap size={20} color="#FBBF24" />
                    ) : (
                        <ZapOff size={20} color="#FFFFFF" />
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    topBar: {
        position: 'absolute',
        left: 20,
        right: 20,
        zIndex: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.52)',
        zIndex: 10,
    },
    scannerFrame: {
        borderRadius: 24,
        position: 'relative',
        overflow: 'hidden',
    },
    corner: {
        position: 'absolute',
        width: 38,
        height: 38,
    },
    topLeft: {
        top: 0,
        left: 0,
        borderTopWidth: 4,
        borderLeftWidth: 4,
        borderTopLeftRadius: 24,
    },
    topRight: {
        top: 0,
        right: 0,
        borderTopWidth: 4,
        borderRightWidth: 4,
        borderTopRightRadius: 24,
    },
    bottomLeft: {
        bottom: 0,
        left: 0,
        borderBottomWidth: 4,
        borderLeftWidth: 4,
        borderBottomLeftRadius: 24,
    },
    bottomRight: {
        bottom: 0,
        right: 0,
        borderBottomWidth: 4,
        borderRightWidth: 4,
        borderBottomRightRadius: 24,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(15, 23, 42, 0.88)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    loadingOverlayText: {
        color: '#F8FAFC',
        fontSize: 13,
        fontWeight: '600',
        marginTop: 12,
        textAlign: 'center',
    },
    instructionText: {
        color: '#F1F5F9',
        fontSize: 13.5,
        textAlign: 'center',
        marginTop: 36,
        paddingHorizontal: 36,
        fontWeight: '500',
        lineHeight: 19,
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    rescanBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 20,
        paddingHorizontal: 22,
        paddingVertical: 12,
        borderRadius: 14,
        minHeight: 46,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 5,
    },
    rescanBtnText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 14,
    },
    bottomControlsContainer: {
        position: 'absolute',
        left: 24,
        right: 24,
        zIndex: 30,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    circleActionButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(15, 23, 42, 0.80)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.22)',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 3,
    },
    circleActionButtonActiveTorch: {
        backgroundColor: 'rgba(251, 191, 36, 0.30)',
        borderColor: '#FBBF24',
    },
    heroUploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
        height: 48,
        paddingHorizontal: 24,
        borderRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 6,
    },
    heroUploadText: {
        color: '#FFFFFF',
        fontSize: 14,
        letterSpacing: 0.2,
    },
});
