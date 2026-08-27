import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Modal,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    Platform,
    Dimensions,
    ScrollView,
    Animated,
    Easing,
    PanResponder,
    Keyboard,
    StyleSheet,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { MessageSquare, Send, Smartphone, X } from 'lucide-react-native';
import { useAppTheme } from '../context/ThemeContext';
import { useTranslation } from '../context/LanguageContext';
import { lightTheme, darkTheme } from '../styles/theme';
import { profileApi } from '../api/profile';
import { getDeviceId } from '../utils/device';
import { AppText as Text } from './AppText';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface AppFeedbackSheetProps {
    visible: boolean;
    onClose: () => void;
}

export const AppFeedbackSheet: React.FC<AppFeedbackSheetProps> = ({ visible, onClose }) => {
    const { isDark, primaryColor } = useAppTheme();
    const theme = isDark ? darkTheme : lightTheme;
    const { t } = useTranslation();

    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [modalVisible, setModalVisible] = useState(visible);
    const [isScrolledToTop, setIsScrolledToTop] = useState(true);

    const backdropAnim = useRef(new Animated.Value(0)).current;
    const sheetAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const panY = useRef(new Animated.Value(0)).current;
    const keyboardOffsetAnim = useRef(new Animated.Value(0)).current;

    // Track keyboard show/hide to lift the sheet above keyboard
    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

        const showSub = Keyboard.addListener(showEvent, (e: any) => {
            Animated.timing(keyboardOffsetAnim, {
                toValue: e.endCoordinates.height,
                duration: Platform.OS === 'ios' ? (e.duration || 250) : 200,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: false,
            }).start();
        });

        const hideSub = Keyboard.addListener(hideEvent, (e: any) => {
            Animated.timing(keyboardOffsetAnim, {
                toValue: 0,
                duration: Platform.OS === 'ios' ? (e.duration || 200) : 200,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: false,
            }).start();
        });

        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    // Open/Close Animation Lifecycle
    useEffect(() => {
        if (visible) {
            setModalVisible(true);
            panY.setValue(0);
            sheetAnim.setValue(SCREEN_HEIGHT);
            Animated.parallel([
                Animated.timing(backdropAnim, {
                    toValue: 1,
                    duration: 250,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.spring(sheetAnim, {
                    toValue: 0,
                    tension: 70,
                    friction: 11,
                    useNativeDriver: true,
                }),
            ]).start();
        } else if (modalVisible) {
            handleDismiss();
        }
    }, [visible]);

    const handleDismiss = () => {
        Keyboard.dismiss();
        Animated.parallel([
            Animated.timing(backdropAnim, {
                toValue: 0,
                duration: 200,
                easing: Easing.in(Easing.quad),
                useNativeDriver: true,
            }),
            Animated.timing(sheetAnim, {
                toValue: SCREEN_HEIGHT,
                duration: 220,
                easing: Easing.in(Easing.cubic),
                useNativeDriver: true,
            }),
        ]).start(() => {
            setModalVisible(false);
            panY.setValue(0);
            onClose();
        });
    };

    // Native PanResponder for interactive swipe-down-to-dismiss gesture
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_: any, gestureState: any) => {
                // Respond if user drags downwards and scroll is at top
                return gestureState.dy > 6 && isScrolledToTop;
            },
            onPanResponderGrant: () => {
                panY.setValue(0);
            },
            onPanResponderMove: (_: any, gestureState: any) => {
                if (gestureState.dy > 0) {
                    panY.setValue(gestureState.dy);
                    const opacity = Math.max(0, 1 - gestureState.dy / 320);
                    backdropAnim.setValue(opacity);
                }
            },
            onPanResponderRelease: (_: any, gestureState: any) => {
                if (gestureState.dy > 110 || gestureState.vy > 0.6) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    handleDismiss();
                } else {
                    Animated.parallel([
                        Animated.spring(panY, {
                            toValue: 0,
                            tension: 80,
                            friction: 10,
                            useNativeDriver: true,
                        }),
                        Animated.timing(backdropAnim, {
                            toValue: 1,
                            duration: 150,
                            useNativeDriver: true,
                        }),
                    ]).start();
                }
            },
        })
    ).current;

    const handleSubmit = async () => {
        if (!message.trim()) {
            Alert.alert(t('required', 'Required'), t('feedback_message_required', 'Please enter your message first.'));
            return;
        }

        setIsSubmitting(true);
        try {
            const devId = await getDeviceId();
            const windowSize = Dimensions.get('window');

            const deviceInfo = {
                platform: Platform.OS,
                osVersion: String(Platform.Version),
                deviceId: devId,
                screenResolution: `${Math.round(windowSize.width)}x${Math.round(windowSize.height)}`,
                isMobile: true,
                timestamp: new Date().toISOString(),
            };

            await profileApi.submitFeedback({
                message: message.trim(),
                device_info: deviceInfo,
            });

            setMessage('');
            handleDismiss();
            Alert.alert(
                t('feedback_submitted', 'Feedback submitted! 🎉'),
                t('feedback_thanks', 'Thank you for your feedback! Our engineering team will review it.')
            );
        } catch (err: any) {
            Alert.alert(
                t('error', 'Error'),
                err?.response?.data?.message || err?.message || t('feedback_submit_failed', 'Failed to submit feedback.')
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!modalVisible) return null;

    const translateY = Animated.add(sheetAnim, panY);

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
                <Animated.View
                    style={[
                        styles.backdrop,
                        {
                            opacity: backdropAnim,
                        },
                    ]}
                >
                    <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        activeOpacity={1}
                        onPress={handleDismiss}
                    />
                </Animated.View>

                {/* Animated Sheet with Keyboard Offset & Pan Gesture */}
                <Animated.View
                    style={[
                        styles.sheetContainer,
                        {
                            backgroundColor: theme.colors.surface,
                            borderColor: theme.colors.border,
                            transform: [{ translateY }],
                            paddingBottom: Animated.add(
                                keyboardOffsetAnim,
                                new Animated.Value(Platform.OS === 'ios' ? 24 : 16)
                            ),
                        },
                    ]}
                >
                    {/* Swipe Handle Bar with Pan Gesture Attachment */}
                    <View {...panResponder.panHandlers} style={styles.dragHandleArea}>
                        <View
                            style={[
                                styles.dragHandleBar,
                                {
                                    backgroundColor: isDark
                                        ? 'rgba(255, 255, 255, 0.25)'
                                        : 'rgba(0, 0, 0, 0.18)',
                                },
                            ]}
                        />
                    </View>

                    {/* Sheet Header */}
                    <View style={styles.sheetHeader}>
                        <Text style={[styles.sheetTitle, { color: theme.colors.textPrimary }]}>
                            {t('app_feedback', 'App Feedback')}
                        </Text>
                        <TouchableOpacity
                            onPress={handleDismiss}
                            style={[styles.closeBtn, { backgroundColor: theme.colors.surfaceSubtle }]}
                            activeOpacity={0.7}
                        >
                            <X color={theme.colors.textPrimary} size={18} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                        onScroll={(e: any) => {
                            setIsScrolledToTop(e.nativeEvent.contentOffset.y <= 0);
                        }}
                        scrollEventThrottle={16}
                    >
                        {/* Hero Header */}
                        <View style={styles.heroWrapper}>
                            <View style={[styles.iconCircle, { backgroundColor: `${primaryColor}18` }]}>
                                <MessageSquare color={primaryColor} size={28} />
                            </View>
                            <Text style={[styles.heroTitle, { color: theme.colors.textPrimary }]}>
                                {t('help_us_improve', 'Help Us Improve')}
                            </Text>
                            <Text style={[styles.heroSub, { color: theme.colors.textSecondary }]}>
                                {t('feedback_desc', 'Found a bug or have a suggestion? Tell us about it.')}
                            </Text>
                        </View>

                        {/* Input Area */}
                        <View style={styles.inputGroup}>
                            <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                                {t('your_message', 'YOUR MESSAGE')}
                            </Text>
                            <TextInput
                                style={[
                                    styles.textArea,
                                    {
                                        backgroundColor: theme.colors.surfaceSubtle,
                                        borderColor: theme.colors.border,
                                        color: theme.colors.textPrimary,
                                    },
                                ]}
                                value={message}
                                onChangeText={setMessage}
                                placeholder={t('feedback_placeholder', 'Describe your experience or suggestion in detail...')}
                                placeholderTextColor={theme.colors.textDisabled}
                                multiline
                                numberOfLines={5}
                                editable={!isSubmitting}
                                textAlignVertical="top"
                            />
                        </View>

                        {/* Device Info Banner */}
                        <View
                            style={[
                                styles.infoBanner,
                                {
                                    backgroundColor: 'rgba(245, 158, 11, 0.10)',
                                    borderColor: 'rgba(245, 158, 11, 0.25)',
                                },
                            ]}
                        >
                            <Smartphone color="#F59E0B" size={18} style={styles.infoIcon} />
                            <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                                {t(
                                    'device_info_hint',
                                    'Basic device info (OS, screen resolution) is automatically attached to help us diagnose issues.'
                                )}
                            </Text>
                        </View>

                        {/* Submit Button */}
                        <TouchableOpacity
                            style={[
                                styles.submitBtn,
                                { backgroundColor: primaryColor },
                                (!message.trim() || isSubmitting) && styles.submitBtnDisabled,
                            ]}
                            onPress={handleSubmit}
                            disabled={!message.trim() || isSubmitting}
                            activeOpacity={0.85}
                        >
                            {isSubmitting ? (
                                <View style={styles.btnContent}>
                                    <ActivityIndicator color="#FFFFFF" size="small" />
                                    <Text style={styles.submitBtnText}>{t('submitting', 'Submitting...')}</Text>
                                </View>
                            ) : (
                                <View style={styles.btnContent}>
                                    <Send color="#FFFFFF" size={18} />
                                    <Text style={styles.submitBtnText}>{t('send_feedback', 'Send Feedback')}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </ScrollView>
                </Animated.View>
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
    sheetContainer: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        maxHeight: '90%',
        borderTopWidth: 1,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 16,
    },
    dragHandleArea: {
        alignItems: 'center',
        paddingVertical: 12,
        width: '100%',
    },
    dragHandleBar: {
        width: 44,
        height: 5,
        borderRadius: 3,
    },
    sheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    sheetTitle: {
        fontSize: 17,
        fontWeight: '700',
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingBottom: 8,
    },
    heroWrapper: {
        alignItems: 'center',
        marginBottom: 16,
    },
    iconCircle: {
        width: 58,
        height: 58,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    heroTitle: {
        fontSize: 17,
        fontWeight: '800',
        textAlign: 'center',
    },
    heroSub: {
        fontSize: 12,
        fontWeight: '500',
        textAlign: 'center',
        marginTop: 3,
        paddingHorizontal: 16,
        lineHeight: 16,
    },
    inputGroup: {
        marginBottom: 14,
    },
    inputLabel: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 6,
        marginLeft: 2,
    },
    textArea: {
        borderRadius: 14,
        borderWidth: 1.5,
        padding: 14,
        fontSize: 14,
        minHeight: 120,
    },
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        borderRadius: 12,
        padding: 12,
        marginBottom: 18,
        borderWidth: 1,
    },
    infoIcon: {
        marginRight: 8,
        marginTop: 1,
    },
    infoText: {
        flex: 1,
        fontSize: 11,
        lineHeight: 16,
        fontWeight: '500',
    },
    submitBtn: {
        height: 50,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    btnContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    submitBtnDisabled: {
        opacity: 0.5,
    },
    submitBtnText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 15,
    },
});
