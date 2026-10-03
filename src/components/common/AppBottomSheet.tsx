import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Modal,
    TouchableOpacity,
    Animated,
    PanResponder,
    useWindowDimensions,
    Dimensions,
    Platform,
    StyleSheet,
    BackHandler,
    ScrollView,
    ActivityIndicator,
    Keyboard,
    EmitterSubscription,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { X } from 'lucide-react-native';
import { AppText as Text } from '../AppText';
import { useAppTheme } from '../../context/ThemeContext';
import { lightTheme, darkTheme } from '../../styles/theme';

export const BottomSheetContext = React.createContext<boolean>(false);

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
    scrollViewRef?: React.RefObject<any>;
    // Built-in standard buttons matching OnboardingScreen aesthetics
    primaryButtonTitle?: string;
    onPrimaryButtonPress?: () => void;
    primaryButtonLoading?: boolean;
    primaryButtonDisabled?: boolean;
    primaryButtonVariant?: 'primary' | 'secondary' | 'destructive';
    primaryButtonIcon?: React.ReactNode;
    secondaryButtonTitle?: string;
    onSecondaryButtonPress?: () => void;
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
    scrollViewRef,
    primaryButtonTitle,
    onPrimaryButtonPress,
    primaryButtonLoading = false,
    primaryButtonDisabled = false,
    primaryButtonVariant = 'primary',
    primaryButtonIcon,
    secondaryButtonTitle,
    onSecondaryButtonPress,
}) => {
    const { height: windowHeight } = useWindowDimensions();
    const screenHeight = Dimensions.get('screen').height || windowHeight;
    const { isDark } = useAppTheme();
    const theme = isDark ? darkTheme : lightTheme;
    const insets = useSafeAreaInsets();

    const [modalVisible, setModalVisible] = useState(visible);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const keyboardOffsetAnim = useRef(new Animated.Value(0)).current;

    const backdropAnim = useRef(new Animated.Value(0)).current;
    const sheetAnim = useRef(new Animated.Value(screenHeight)).current;
    const panY = useRef(new Animated.Value(0)).current;
    const internalScrollRef = useRef<any>(null);

    const isDismissing = useRef(false);

    // Cross-platform keyboard listeners
    useEffect(() => {
        if (!avoidKeyboard) return;

        const onKeyboardShow = (e: any) => {
            const h = e?.endCoordinates?.height || 0;
            setKeyboardHeight(h);
            Animated.timing(keyboardOffsetAnim, {
                toValue: h,
                duration: Platform.OS === 'ios' ? (e?.duration || 250) : 180,
                useNativeDriver: false,
            }).start();
        };

        const onKeyboardHide = (e: any) => {
            setKeyboardHeight(0);
            Animated.timing(keyboardOffsetAnim, {
                toValue: 0,
                duration: Platform.OS === 'ios' ? (e?.duration || 200) : 180,
                useNativeDriver: false,
            }).start();
        };

        const subscriptions: any[] = [];
        if (Platform.OS === 'ios') {
            subscriptions.push(
                Keyboard.addListener('keyboardWillShow', onKeyboardShow),
                Keyboard.addListener('keyboardWillHide', onKeyboardHide)
            );
        } else {
            subscriptions.push(
                Keyboard.addListener('keyboardDidShow', onKeyboardShow),
                Keyboard.addListener('keyboardDidHide', onKeyboardHide)
            );
        }

        return () => {
            subscriptions.forEach((sub) => sub.remove());
        };
    }, [avoidKeyboard, keyboardOffsetAnim]);

    const handleDismiss = () => {
        if (isDismissing.current) return;
        isDismissing.current = true;
        Keyboard.dismiss();

        Animated.parallel([
            Animated.timing(backdropAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(sheetAnim, {
                toValue: screenHeight,
                duration: 240,
                useNativeDriver: true,
            }),
            Animated.timing(keyboardOffsetAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: false,
            }),
        ]).start(() => {
            setModalVisible(false);
            isDismissing.current = false;
            panY.setValue(0);
            setKeyboardHeight(0);
            onClose();
        });
    };

    useEffect(() => {
        if (visible) {
            isDismissing.current = false;
            setModalVisible(true);
            panY.setValue(0);
            keyboardOffsetAnim.setValue(0);
            setKeyboardHeight(0);
            backdropAnim.setValue(0);
            sheetAnim.setValue(screenHeight);
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
            onStartShouldSetPanResponderCapture: () => false,
            // Only claim a downward swipe that isn't a horizontal scroll
            onMoveShouldSetPanResponder: (_: any, gestureState: any) =>
                gestureState.dy > 4 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
            onMoveShouldSetPanResponderCapture: () => false,
            onPanResponderGrant: () => {
                Keyboard.dismiss();
                panY.stopAnimation();
            },
            onPanResponderMove: (_: any, gestureState: any) => {
                if (gestureState.dy > 0) {
                    panY.setValue(gestureState.dy);
                } else {
                    panY.setValue(gestureState.dy * 0.15);
                }
            },
            onPanResponderRelease: (_: any, gestureState: any) => {
                if (gestureState.dy > 70 || gestureState.vy > 0.4) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    handleDismiss();
                } else {
                    Animated.spring(panY, {
                        toValue: 0,
                        damping: 24,
                        stiffness: 260,
                        useNativeDriver: true,
                    }).start();
                }
            },
            onPanResponderTerminate: () => {
                Animated.spring(panY, {
                    toValue: 0,
                    damping: 24,
                    stiffness: 260,
                    useNativeDriver: true,
                }).start();
            },
        })
    ).current;

    const shouldRender = visible || modalVisible;
    if (!shouldRender) return null;

    const translateY = Animated.add(sheetAnim, panY);

    // Coupled backdrop opacity that reacts in real-time to both entrance fade and downward gesture dragging
    const panBackdropOpacity = panY.interpolate({
        inputRange: [0, 240],
        outputRange: [1, 0.3],
        extrapolate: 'clamp',
    });
    const effectiveBackdropOpacity = Animated.multiply(backdropAnim, panBackdropOpacity);

    // Dynamically constrain maxSheetHeight when keyboard is visible so the sheet never clips off top of screen
    const maxSheetHeight = keyboardHeight > 0
        ? Math.max(200, screenHeight - keyboardHeight - insets.top - (Platform.OS === 'ios' ? 24 : 32))
        : screenHeight * maxHeightPercent;

    // Exact safe clearance matching OnboardingScreen comfort when keyboard is closed,
    // and compact clearance above keyboard when keyboard is open
    const bottomSafeMargin = Math.max(insets.bottom, Platform.OS === 'ios' ? 16 : 12) + (Platform.OS === 'ios' ? 12 : 16);
    const activeBottomMargin = keyboardHeight > 0
        ? (Platform.OS === 'ios' ? 8 : 6)
        : bottomSafeMargin;

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
            <View style={styles.sheetInnerWrapper}>
                {/* Top Draggable Area (Handle + Header) */}
                <View style={styles.headerContainer} {...panResponder.panHandlers}>
                    {/* Drag Handle Bar */}
                    <View style={styles.dragHandleArea}>
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
                </View>

                {/* Sheet Content */}
                <BottomSheetContext.Provider value={true}>
                    {scrollable ? (
                        <ScrollView
                            ref={scrollViewRef || internalScrollRef}
                            style={styles.scrollContent}
                            contentContainerStyle={[
                                styles.scrollContentContainer,
                                { paddingBottom: (footer || primaryButtonTitle) ? 16 : activeBottomMargin },
                                contentContainerStyle,
                            ]}
                            showsVerticalScrollIndicator={Platform.OS === 'web'}
                            keyboardShouldPersistTaps="handled"
                            keyboardDismissMode="on-drag"
                            bounces={false}
                            nestedScrollEnabled
                        >
                            {children}
                        </ScrollView>
                    ) : (
                        <View
                            style={[
                                styles.fixedContent,
                                { paddingBottom: (footer || primaryButtonTitle) ? 16 : activeBottomMargin },
                                contentContainerStyle,
                            ]}
                        >
                            {children}
                        </View>
                    )}
                </BottomSheetContext.Provider>

                {/* Sticky Bottom Footer with Extra Navigator Clearance */}
                {(footer || primaryButtonTitle) && (
                    <View
                        style={[
                            styles.footerContainer,
                            {
                                borderTopColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
                                paddingBottom: activeBottomMargin,
                            },
                        ]}
                    >
                        {footer ? (
                            footer
                        ) : (
                            <View style={styles.actionButtonGroup}>
                                <TouchableOpacity
                                    style={[
                                        styles.sheetPrimaryButton,
                                        {
                                            backgroundColor: primaryButtonVariant === 'destructive'
                                                ? theme.colors.status.danger
                                                : primaryButtonVariant === 'secondary'
                                                ? theme.colors.surfaceSubtle
                                                : theme.colors.primary,
                                        },
                                        (primaryButtonDisabled || primaryButtonLoading) && styles.sheetButtonDisabled,
                                    ]}
                                    onPress={onPrimaryButtonPress}
                                    disabled={primaryButtonDisabled || primaryButtonLoading}
                                    activeOpacity={0.85}
                                >
                                    {primaryButtonLoading ? (
                                        <ActivityIndicator
                                            color={primaryButtonVariant === 'secondary' ? theme.colors.textPrimary : '#FFFFFF'}
                                            size="small"
                                        />
                                    ) : (
                                        <View style={styles.buttonInnerRow}>
                                            {primaryButtonIcon && <View style={styles.buttonIconWrapper}>{primaryButtonIcon}</View>}
                                            <Text
                                                style={[
                                                    styles.sheetPrimaryButtonText,
                                                    {
                                                        color: primaryButtonVariant === 'secondary'
                                                            ? theme.colors.textPrimary
                                                            : '#FFFFFF',
                                                    },
                                                ]}
                                            >
                                                {primaryButtonTitle}
                                            </Text>
                                        </View>
                                    )}
                                </TouchableOpacity>

                                {secondaryButtonTitle && onSecondaryButtonPress && (
                                    <TouchableOpacity
                                        style={[
                                            styles.sheetSecondaryButton,
                                            {
                                                backgroundColor: theme.colors.surfaceSubtle,
                                                borderColor: theme.colors.border,
                                            },
                                        ]}
                                        onPress={onSecondaryButtonPress}
                                        activeOpacity={0.75}
                                    >
                                        <Text style={[styles.sheetSecondaryButtonText, { color: theme.colors.textPrimary }]}>
                                            {secondaryButtonTitle}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                    </View>
                )}
            </View>
        </Animated.View>
    );

    return (
        <Modal
            visible={shouldRender}
            transparent
            statusBarTranslucent
            animationType="none"
            onRequestClose={handleDismiss}
            accessibilityViewIsModal={true}
        >
            <View style={styles.modalOverlay}>
                {/* Backdrop Fade with real-time gesture coupling */}
                <Animated.View style={[styles.backdrop, { opacity: effectiveBackdropOpacity }]}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        activeOpacity={1}
                        onPress={handleDismiss}
                        accessibilityLabel="Dismiss modal backdrop"
                        accessibilityRole="button"
                    />
                </Animated.View>

                <Animated.View
                    style={[
                        styles.keyboardContainer,
                        avoidKeyboard && { paddingBottom: keyboardOffsetAnim },
                    ]}
                >
                    {renderSheetBody()}
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        width: '100%',
        height: '100%',
        justifyContent: 'flex-end',
        backgroundColor: 'transparent',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.60)',
        zIndex: 1,
    },
    keyboardContainer: {
        width: '100%',
        maxHeight: '100%',
        flexShrink: 1,
        justifyContent: 'flex-end',
        zIndex: 2,
    },
    sheetContainer: {
        width: '100%',
        maxWidth: 640,
        alignSelf: 'center',
        flexShrink: 1,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        borderTopWidth: 1,
        borderLeftWidth: StyleSheet.hairlineWidth,
        borderRightWidth: StyleSheet.hairlineWidth,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
        elevation: 24,
    },
    sheetInnerWrapper: {
        width: '100%',
        maxHeight: '100%',
        flexShrink: 1,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        overflow: 'hidden',
    },
    headerContainer: {
        flexShrink: 0,
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
        minHeight: 0,
        ...Platform.select({
            web: {
                overflowY: 'auto' as any,
                overscrollBehavior: 'contain' as any,
            },
        }),
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
        paddingTop: 12,
        borderTopWidth: StyleSheet.hairlineWidth,
        flexShrink: 0,
    },
    actionButtonGroup: {
        width: '100%',
        gap: 10,
    },
    sheetPrimaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 52,
        paddingHorizontal: 20,
        borderRadius: 16,
        width: '100%',
    },
    buttonInnerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    buttonIconWrapper: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    sheetPrimaryButtonText: {
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 0.1,
    },
    sheetSecondaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 48,
        paddingHorizontal: 20,
        borderRadius: 16,
        borderWidth: 1,
        width: '100%',
    },
    sheetSecondaryButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    sheetButtonDisabled: {
        opacity: 0.5,
    },
});