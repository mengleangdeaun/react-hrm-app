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
import Svg, { Path } from 'react-native-svg';
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

// ABA Bank style rounded squircle radius (smooth curve, zero 90° boxy corners)
const CORNER_RADIUS = 28;

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
    const { width, height } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();

    const [torch, setTorch] = useState(false);
    const [zoom, setZoom] = useState(0); // 0 = 1.0x, 0.15 = ~2.0x, max 0.4

    // Responsive frame size: 70% of screen width, min 220, max 260
    const frameSize = Math.max(220, Math.min(width * 0.70, 260));
    const frameLeft = Math.round((width - frameSize) / 2);

    // Ergonomic clearance for thumb zone controls across iOS & Android
    const bottomClearance = Math.max(insets.bottom, Platform.OS === 'ios' ? 16 : 12) + (Platform.OS === 'ios' ? 24 : 28);
    const bottomControlsHeight = 50;

    // Top status clearance (top safe insets + status chip)
    const topBarTop = insets.top + (Platform.OS === 'ios' ? 8 : 16);
    const topReserved = topBarTop + (topContent ? 56 : 38);

    // Bottom reserved zone (instruction text + action controls)
    const bottomReserved = bottomClearance + bottomControlsHeight + 70;

    // Deterministic mathematical vertical centering in clear active scanning zone
    const availableHeight = height - topReserved - bottomReserved;
    const frameTop = Math.round(topReserved + Math.max(0, (availableHeight - frameSize) / 2));

    // ── Smooth Squircle Cutout SVG Path (Zero 90-degree boxy edges) ──────
    const cutoutPath = useMemo(() => {
        if (width <= 0 || height <= 0 || frameSize <= 0) return '';
        const r = CORNER_RADIUS;
        const x = frameLeft;
        const y = frameTop;
        const size = frameSize;
        return `M 0 0 L ${width} 0 L ${width} ${height} L 0 ${height} Z ` +
            `M ${x + r} ${y} ` +
            `L ${x + size - r} ${y} ` +
            `A ${r} ${r} 0 0 1 ${x + size} ${y + r} ` +
            `L ${x + size} ${y + size - r} ` +
            `A ${r} ${r} 0 0 1 ${x + size - r} ${y + size} ` +
            `L ${x + r} ${y + size} ` +
            `A ${r} ${r} 0 0 1 ${x} ${y + size - r} ` +
            `L ${x} ${y + r} ` +
            `A ${r} ${r} 0 0 1 ${x + r} ${y} Z`;
    }, [width, height, frameLeft, frameTop, frameSize]);

    // ── Pinch-to-Zoom Gesture (Multi-Touch via PanResponder) ─────────────
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
            <View style={[styles.topBar, { top: topBarTop }]}>
                {topContent ? topContent : <View style={{ height: 38 }} />}
            </View>

            {/* 3. Dark Backdrop with Smooth Squircle Cutout (ABA Bank Fintech Style) */}
            <Svg
                style={StyleSheet.absoluteFill}
                width={width}
                height={height}
                pointerEvents="none"
            >
                <Path
                    d={cutoutPath}
                    fill="rgba(0, 0, 0, 0.05)"
                    fillRule="evenodd"
                />
            </Svg>

            {/* Viewfinder Frame (Clean, Minimalist, 100% Unobstructed Camera View) */}
            <View
                style={[
                    styles.scannerFrame,
                    {
                        top: frameTop,
                        left: frameLeft,
                        width: frameSize,
                        height: frameSize,
                    },
                ]}
                pointerEvents="box-none"
            >
                {/* 4 Crisp White Rounded Corner Brackets */}
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />

                {/* Subtle continuous frame guide */}
                <View style={styles.frameGuideBorder} pointerEvents="none" />

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

            {/* 4. Anchored Guidance Copy & Rescan Action Below Frame */}
            <View
                style={[
                    styles.underFrameContainer,
                    {
                        top: frameTop + frameSize + 22,
                    },
                ]}
                pointerEvents="box-none"
            >
                <AppText style={styles.instructionText}>
                    {instructionText || t('align_qr_within_frame', 'Align QR code within the frame')}
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

            {/* 5. Ergonomic Bottom Thumb-Zone Controls */}
            <View
                style={[
                    styles.bottomControlsContainer,
                    {
                        bottom: bottomClearance,
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

                {/* Bottom Center: Primary Upload Photo Button */}
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

                {/* Bottom Right: Flash / Torch Toggle */}
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
        overflow: 'hidden',
    },
    topBar: {
        position: 'absolute',
        left: 20,
        right: 20,
        zIndex: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scannerFrame: {
        position: 'absolute',
        borderRadius: CORNER_RADIUS,
        zIndex: 20,
    },
    frameGuideBorder: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: CORNER_RADIUS,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.20)',
    },
    corner: {
        position: 'absolute',
        width: 36,
        height: 36,
        borderColor: '#FFFFFF',
    },
    topLeft: {
        top: 0,
        left: 0,
        borderTopWidth: 3.5,
        borderLeftWidth: 3.5,
        borderTopLeftRadius: CORNER_RADIUS,
    },
    topRight: {
        top: 0,
        right: 0,
        borderTopWidth: 3.5,
        borderRightWidth: 3.5,
        borderTopRightRadius: CORNER_RADIUS,
    },
    bottomLeft: {
        bottom: 0,
        left: 0,
        borderBottomWidth: 3.5,
        borderLeftWidth: 3.5,
        borderBottomLeftRadius: CORNER_RADIUS,
    },
    bottomRight: {
        bottom: 0,
        right: 0,
        borderBottomWidth: 3.5,
        borderRightWidth: 3.5,
        borderBottomRightRadius: CORNER_RADIUS,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(15, 23, 42, 0.88)',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: CORNER_RADIUS,
        padding: 16,
    },
    loadingOverlayText: {
        color: '#F8FAFC',
        fontSize: 13,
        fontWeight: '600',
        marginTop: 12,
        textAlign: 'center',
    },
    underFrameContainer: {
        position: 'absolute',
        left: 24,
        right: 24,
        alignItems: 'center',
        zIndex: 20,
    },
    instructionText: {
        color: '#FFFFFF',
        fontSize: 14,
        textAlign: 'center',
        paddingHorizontal: 20,
        fontWeight: '500',
        lineHeight: 20,
        letterSpacing: 0.2,
        textShadowColor: 'rgba(0, 0, 0, 0.80)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    rescanBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 16,
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
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(20, 24, 33, 0.75)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.20)',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 4,
    },
    circleActionButtonActiveTorch: {
        backgroundColor: 'rgba(251, 191, 36, 0.25)',
        borderColor: '#FBBF24',
    },
    heroUploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        height: 50,
        paddingHorizontal: 24,
        borderRadius: 25,
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