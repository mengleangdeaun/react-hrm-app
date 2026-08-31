import React, { useState } from 'react';
import {
    View,
    TextInput,
    ActivityIndicator,
    Alert,
    Platform,
    Dimensions,
    TouchableOpacity,
    StyleSheet,
} from 'react-native';
import { MessageSquare, Send, Smartphone } from 'lucide-react-native';
import { useAppTheme } from '../context/ThemeContext';
import { useTranslation } from '../context/LanguageContext';
import { lightTheme, darkTheme } from '../styles/theme';
import { profileApi } from '../api/profile';
import { getDeviceId } from '../utils/device';
import { AppText as Text } from './AppText';
import { AppBottomSheet } from './common/AppBottomSheet';

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
            onClose();
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

    return (
        <AppBottomSheet
            visible={visible}
            onClose={onClose}
            title={t('app_feedback', 'App Feedback')}
            footer={
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
                        <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                        <>
                            <Send color="#FFFFFF" size={18} style={styles.btnIcon} />
                            <Text style={styles.submitBtnText}>{t('send_feedback', 'Send Feedback')}</Text>
                        </>
                    )}
                </TouchableOpacity>
            }
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
                        backgroundColor: theme.colors.status.warningSubtle,
                        borderColor: theme.colors.status.warningBorder,
                    },
                ]}
            >
                <Smartphone color={theme.colors.status.warning} size={18} style={styles.infoIcon} />
                <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                    {t(
                        'device_info_hint',
                        'Basic device info (OS, screen resolution) is automatically attached to help us diagnose issues.'
                    )}
                </Text>
            </View>
        </AppBottomSheet>
    );
};

const styles = StyleSheet.create({
    heroWrapper: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    iconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    heroTitle: {
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 4,
        textAlign: 'center',
    },
    heroSub: {
        fontSize: 13,
        textAlign: 'center',
        maxWidth: 280,
        lineHeight: 18,
    },
    inputGroup: {
        marginVertical: 12,
    },
    inputLabel: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    textArea: {
        borderRadius: 14,
        borderWidth: 1,
        padding: 14,
        fontSize: 14,
        minHeight: 110,
        textAlignVertical: 'top',
    },
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        borderRadius: 12,
        borderWidth: 1,
        padding: 12,
        marginBottom: 12,
        gap: 10,
    },
    infoIcon: {
        marginTop: 2,
    },
    infoText: {
        flex: 1,
        fontSize: 12,
        lineHeight: 17,
    },
    submitBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 50,
        borderRadius: 14,
        gap: 8,
    },
    submitBtnDisabled: {
        opacity: 0.5,
    },
    btnIcon: {
        marginRight: 4,
    },
    submitBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
});
