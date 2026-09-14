import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Modal,
    TouchableOpacity,
    Animated,
    PanResponder,
    useWindowDimensions,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    BackHandler,
    ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { X } from 'lucide-react-native';
import { AppText as Text } from '../AppText';
import { useAppTheme } from '../../context/ThemeContext';
import { lightTheme, darkTheme } from '../../styles/theme';

export interface AppBottomSheetProps {
    visible: boolean;
    onClose: () => void;
    title?: string;
    subtitle?: string;
    headerRight?: React.ReactNode;
    children: React.ReactNode;
    maxHeightPercent?: number;
    scrollable?: boolean;
    showCloseButton?: boolean;
    avoidKeyboard?: boolean;
    containerStyle?: any;
    contentContainerStyle?: any;
    footer?: React.ReactNode;
}

export const AppBottomSheet: React.FC<AppBottomSheetProps> = ({
    visible,
    onClose,
    title,
    subtitle,
    headerRight,
    children,
    maxHeightPercent = 0.88,
    scrollable = true,
    showCloseButton = true,
    avoidKeyboard = true,
    containerStyle,
    contentContainerStyle,
    footer,
}) => {
    const { height: screenHeight } = useWindowDimensions();
    const { isDark } = useAppTheme();
    const theme = isDark ? darkTheme : lightTheme;
    const insets = useSafeAreaInsets();

    const [modalVisible, setModalVisible] = useState(visible);
    const backdropAnim = useRef(new Animated.Value(0)).current;
    const sheetAnim = useRef(new Animated.Value(screenHeight)).current;
    const panY = useRef(new Animated.Value(0)).current;

    const isDismissing = useRef(false);

    const handleDismiss = () => {
        if (isDismissing.current) return;
        isDismissing.current = true;

        Animated.parallel([
            Animated.timing(backdropAnim, {
                toValue: 0,
                duration: 220,
                useNativeDriver: true,
            }),
            Animated.timing(sheetAnim, {
                toValue: screenHeight,
                duration: 260,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setModalVisible(false);
            isDismissing.current = false;
            panY.setValue(0);
            onClose();
        });
    };

    useEffect(() => {
        if (visible) {
            isDismissing.current = false;
            setModalVisible(true);
            panY.setValue(0);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            Animated.parallel([
                Animated.timing(backdropAnim, {
                    toValue: 1,
                    duration: 240,
                    useNativeDriver: true,
                }),
                Animated.spring(sheetAnim, {
                    toValue: 0,
                    damping: 24,
                    stiffness: 220,
                    mass: 0.8,
                    useNativeDriver: true,
                }),
            ]).start();
        } else if (modalVisible) {
            handleDismiss();
        }
    }, [visible]);

    useEffect(() => {
        if (!modalVisible) return;
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            handleDismiss();
            return true;
        });
        return () => backHandler.remove();
    }, [modalVisible]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_: any, gestureState: any) => gestureState.dy > 6,
            onPanResponderMove: (_: any, gestureState: any) => {
                if (gestureState.dy > 0) {
                    panY.setValue(gestureState.dy);
                } else {
                    panY.setValue(gestureState.dy * 0.15);
                }
            },
            onPanResponderRelease: (_: any, gestureState: any) => {
                if (gestureState.dy > 120 || gestureState.vy > 0.6) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    handleDismiss();
                } else {
                    Animated.spring(panY, {
                        toValue: 0,
                        damping: 20,
                        stiffness: 250,
                        useNativeDriver: true,
                    }).start();
                }
            },
        })
    ).current;

    if (!modalVisible) return null;

    const translateY = Animated.add(sheetAnim, panY);
    const maxSheetHeight = screenHeight * maxHeightPercent;

    // Generous bottom clearance above navigation bars across iOS & Android
    const bottomSafeMargin = Math.max(insets.bottom, Platform.OS === 'ios' ? 16 : 12) + (Platform.OS === 'ios' ? 14 : 18);

    const renderSheetBody = () => (
        <Animated.View
            style={[
                styles.sheetContainer,
                {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    maxHeight: maxSheetHeight,
                    transform: [{ translateY }],
                },
                containerStyle,
            ]}
        >
            {/* Drag Handle Bar */}
            <View {...panResponder.panHandlers} style={styles.dragHandleArea}>
                <View
                    style={[
                        styles.dragHandleBar,
                        {
                            backgroundColor: isDark
                                ? 'rgba(255, 255, 255, 0.28)'
                                : 'rgba(0, 0, 0, 0.18)',
                        },
                    ]}
                />
            </View>

            {/* Header Bar */}
            {(title || headerRight || showCloseButton) && (
                <View style={[styles.headerRow, { borderBottomColor: theme.colors.border }]}>
                    <View style={styles.titleWrapper}>
                        {title && (
                            <Text style={[styles.titleText, { color: theme.colors.textPrimary }]}>
                                {title}
                            </Text>
                        )}
                        {subtitle && (
                            <Text style={[styles.subtitleText, { color: theme.colors.textSecondary }]}>
                                {subtitle}
                            </Text>
                        )}
                    </View>

                    <View style={styles.headerRightActions}>
                        {headerRight}
                        {showCloseButton && (
                            <TouchableOpacity
                                style={[styles.closeButton, { backgroundColor: theme.colors.surfaceSubtle }]}
                                onPress={handleDismiss}
                                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                                activeOpacity={0.7}
                                accessibilityLabel="Close sheet"
                                accessibilityRole="button"
                            >
                                <X color={theme.colors.textSecondary} size={18} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            )}

            {/* Sheet Content */}
            {scrollable ? (
                <ScrollView
                    style={styles.scrollContent}
                    contentContainerStyle={[
                        styles.scrollContentContainer,
                        { paddingBottom: footer ? 16 : bottomSafeMargin },
                        contentContainerStyle,
                    ]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    bounces={false}
                >
                    {children}
                </ScrollView>
            ) : (
                <View
                    style={[
                        styles.fixedContent,
                        { paddingBottom: footer ? 16 : bottomSafeMargin },
                        contentContainerStyle,
                    ]}
                >
                    {children}
                </View>
            )}

            {/* Sticky Bottom Footer with Extra Navigator Clearance */}
            {footer && (
                <View
                    style={[
                        styles.footerContainer,
                        {
                            borderTopColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
                            paddingBottom: bottomSafeMargin,
                        },
                    ]}
                >
                    {footer}
                </View>
            )}
        </Animated.View>
    );

    return (
        <Modal
            visible={modalVisible}
            transparent
            statusBarTranslucent
            animationType="none"
            onRequestClose={handleDismiss}
        >
            <View style={styles.modalOverlay}>
                {/* Backdrop Fade */}
                <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        activeOpacity={1}
                        onPress={handleDismiss}
                        accessibilityLabel="Dismiss modal backdrop"
                        accessibilityRole="button"
                    />
                </Animated.View>

                {avoidKeyboard ? (
                    <KeyboardAvoidingView
                        style={styles.keyboardContainer}
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : -insets.bottom}
                    >
                        {renderSheetBody()}
                    </KeyboardAvoidingView>
                ) : (
                    renderSheetBody()
                )}
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
    },
    keyboardContainer: {
        width: '100%',
        justifyContent: 'flex-end',
    },
    sheetContainer: {
        width: '100%',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        borderTopWidth: 1,
        borderLeftWidth: StyleSheet.hairlineWidth,
        borderRightWidth: StyleSheet.hairlineWidth,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 24,
        overflow: 'hidden',
    },
    dragHandleArea: {
        width: '100%',
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dragHandleBar: {
        width: 44,
        height: 5,
        borderRadius: 3,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    titleWrapper: {
        flex: 1,
        marginRight: 12,
    },
    titleText: {
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: -0.2,
    },
    subtitleText: {
        fontSize: 12,
        marginTop: 2,
        fontWeight: '500',
    },
    headerRightActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollContent: {
        flexShrink: 1,
    },
    scrollContentContainer: {
        paddingHorizontal: 20,
        paddingTop: 16,
        flexGrow: 1,
    },
    fixedContent: {
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    footerContainer: {
        paddingHorizontal: 20,
        paddingTop: 14,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
});