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
    KeyboardAvoidingView,
    ScrollView,
    Animated,
    Easing,
} from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { MessageSquare, Send, Smartphone, X } from 'lucide-react-native';
import { useAppTheme } from '../context/ThemeContext';
import { useTranslation } from '../context/LanguageContext';
import { profileApi } from '../api/profile';
import { getDeviceId } from '../utils/device';
import { AppText as Text } from './AppText';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface AppFeedbackSheetProps {
    visible: boolean;
    onClose: () => void;
}

export const AppFeedbackSheet: React.FC<AppFeedbackSheetProps> = ({ visible, onClose }) => {
    const { primaryColor } = useAppTheme();
    const { t } = useTranslation();
    const { theme } = useUnistyles();
    const styles = stylesheet;

    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [modalVisible, setModalVisible] = useState(visible);

    const backdropAnim = useRef(new Animated.Value(0)).current;
    const sheetAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

    useEffect(() => {
        if (visible) {
            setModalVisible(true);
            Animated.parallel([
                Animated.timing(backdropAnim, {
                    toValue: 1,
                    duration: 250,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.spring(sheetAnim, {
                    toValue: 0,
                    tension: 65,
                    friction: 11,
                    useNativeDriver: true,
                }),
            ]).start();
        } else if (modalVisible) {
            handleDismiss();
        }
    }, [visible]);

    const handleDismiss = () => {
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
            onClose();
        });
    };

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
                t('feedback_submitted', 'Feedback submitted!'),
                t('feedback_thanks', 'Thank you for your feedback!')
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

    return (
        <Modal
            visible={modalVisible}
            transparent
            statusBarTranslucent
            animationType="none"
            onRequestClose={handleDismiss}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.modalOverlay}
            >
                {/* Backdrop with 60fps Native Driver Fade Animation */}
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

                {/* Bottom Sheet with 60fps Native Driver Spring Slide Animation */}
                <Animated.View
                    style={[
                        styles.sheetContainer,
                        {
                            transform: [{ translateY: sheetAnim }],
                        },
                    ]}
                >
                    {/* Bottom Sheet Top Drag Handle Bar */}
                    <View style={styles.dragHandleWrapper}>
                        <View style={styles.dragHandleBar} />
                    </View>

                    {/* Header Close Button */}
                    <View style={styles.sheetHeader}>
                        <Text style={styles.sheetTitle}>{t('app_feedback', 'App Feedback')}</Text>
                        <TouchableOpacity
                            onPress={handleDismiss}
                            style={styles.closeBtn}
                            activeOpacity={0.7}
                        >
                            <X color={theme.colors.textPrimary} size={20} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Icon Box Header */}
                        <View style={styles.heroWrapper}>
                            <View style={[styles.iconCircle, { backgroundColor: `${primaryColor}18` }]}>
                                <MessageSquare color={primaryColor} size={32} />
                            </View>
                            <Text style={styles.heroTitle}>{t('help_us_improve', 'Help us improve')}</Text>
                            <Text style={styles.heroSub}>
                                {t('feedback_desc', 'Found a bug or have a suggestion? Tell us about it.')}
                            </Text>
                        </View>

                        {/* Input Area */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>{t('your_message', 'YOUR MESSAGE')}</Text>
                            <TextInput
                                style={styles.textArea}
                                value={message}
                                onChangeText={setMessage}
                                placeholder={t('feedback_placeholder', 'Describe your experience or suggestion...')}
                                placeholderTextColor={theme.colors.textSecondary}
                                multiline
                                numberOfLines={5}
                                editable={!isSubmitting}
                                textAlignVertical="top"
                            />
                        </View>

                        {/* Device Info Warning Banner */}
                        <View style={styles.infoBanner}>
                            <Smartphone color={theme.colors.status.warning} size={20} style={styles.infoIcon} />
                            <Text style={styles.infoText}>
                                {t(
                                    'device_info_hint',
                                    'Basic device info (OS, screen size) is automatically attached to help us debug.'
                                )}
                            </Text>
                        </View>

                        {/* Action Submit Button */}
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
                                <>
                                    <ActivityIndicator color={theme.colors.onPrimary} size="small" />
                                    <Text style={styles.submitBtnText}>{t('submitting', 'Submitting...')}</Text>
                                </>
                            ) : (
                                <>
                                    <Send color={theme.colors.onPrimary} size={19} />
                                    <Text style={styles.submitBtnText}>{t('send_feedback', 'Send Feedback')}</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </ScrollView>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const stylesheet = StyleSheet.create((theme) => ({
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
    },
    sheetContainer: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.lg + 8,
        borderTopRightRadius: theme.borderRadius.lg + 8,
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: Platform.OS === 'ios' ? theme.spacing.xl + 10 : theme.spacing.lg,
        maxHeight: '88%',
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.md,
    },
    dragHandleWrapper: {
        alignItems: 'center',
        paddingVertical: theme.spacing.xs + 6,
    },
    dragHandleBar: {
        width: 40,
        height: 5,
        borderRadius: 3,
        backgroundColor: theme.colors.borderStrong,
    },
    sheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    sheetTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.textPrimary,
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: theme.colors.surfaceSubtle,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingBottom: theme.spacing.md,
    },
    heroWrapper: {
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    heroTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: theme.colors.textPrimary,
        textAlign: 'center',
    },
    heroSub: {
        fontSize: 13,
        fontWeight: '500',
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginTop: 4,
        paddingHorizontal: theme.spacing.md,
    },
    inputGroup: {
        marginBottom: theme.spacing.md,
    },
    inputLabel: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xs,
        marginLeft: 2,
    },
    textArea: {
        backgroundColor: theme.colors.surfaceSubtle,
        borderRadius: theme.borderRadius.md + 2,
        borderWidth: 1,
        borderColor: theme.colors.border,
        color: theme.colors.textPrimary,
        padding: theme.spacing.md,
        fontSize: 14,
        minHeight: 140,
    },
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: theme.colors.status.warning + '12',
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.status.warning + '30',
    },
    infoIcon: {
        marginRight: theme.spacing.sm,
        marginTop: 1,
    },
    infoText: {
        flex: 1,
        fontSize: 11,
        lineHeight: 16,
        fontWeight: '500',
        color: theme.colors.textSecondary,
    },
    submitBtn: {
        height: 52,
        borderRadius: theme.borderRadius.md + 4,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: theme.spacing.sm,
        ...theme.shadows.sm,
    },
    submitBtnDisabled: {
        opacity: 0.5,
    },
    submitBtnText: {
        color: theme.colors.onPrimary,
        fontWeight: '700',
        fontSize: 15,
    },
}));
