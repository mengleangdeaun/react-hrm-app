import React, { useState } from 'react';
import {
    View,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { AppText as Text } from '../../components/AppText';
import { Send, MessageSquare, Check } from 'lucide-react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { AppShell } from '../../components/common/AppShell';
import { AppCard } from '../../components/common/AppCard';
import { AppInput } from '../../components/common/AppInput';
import { AppButton } from '../../components/common/AppButton';
import { useTranslation } from '../../context/LanguageContext';
import { profileApi } from '../../api/profile';

export const FeedbackScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const { t } = useTranslation();
    const styles = stylesheet;

    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!subject.trim() || !message.trim()) {
            Alert.alert(t('required', 'Required'), t('enter_subject_and_feedback', 'Please enter a subject and your feedback details.'));
            return;
        }

        setIsSubmitting(true);
        try {
            await profileApi.submitFeedback({
                message: `[${subject.trim()}] ${message.trim()}`,
                comment: message.trim(),
                category: isAnonymous ? 'anonymous_suggestion' : 'suggestion',
            });
            Alert.alert(
                t('feedback_submitted', 'Feedback Submitted! 🙏'),
                t('feedback_submitted_desc', 'Thank you for your valuable feedback. HR management will review it shortly.'),
                [{ text: t('ok', 'OK'), onPress: () => navigation.goBack() }]
            );
        } catch (err: any) {
            Alert.alert(
                t('error', 'Error'),
                err?.response?.data?.message || err?.message || t('submit_feedback_failed', 'Failed to submit feedback. Please try again.')
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AppShell title={t('suggestion_and_feedback', 'Suggestion & Feedback')} onBack={() => navigation.goBack()}>
            <AppCard variant="surface" style={styles.card}>
                <View style={styles.headerInfoRow}>
                    <View style={styles.iconBadge}>
                        <MessageSquare color="#2563EB" size={20} />
                    </View>
                    <View style={styles.headerTextWrapper}>
                        <Text style={styles.cardTitle}>
                            {t('share_your_thoughts', 'Share Your Thoughts')}
                        </Text>
                        <Text style={styles.cardSub}>
                            {t('help_us_improve', 'Help us improve our workplace and operations.')}
                        </Text>
                    </View>
                </View>

                {/* Subject Input */}
                <AppInput
                    label={t('topic_subject', 'Topic / Subject')}
                    value={subject}
                    onChangeText={setSubject}
                    placeholder={t('subject_placeholder', 'e.g., Office cafeteria menu suggestion')}
                />

                {/* Detailed Feedback */}
                <AppInput
                    label={t('detailed_feedback', 'Detailed Feedback')}
                    value={message}
                    onChangeText={setMessage}
                    placeholder={t('feedback_placeholder', 'Provide your constructive feedback or suggestions...')}
                    multiline
                    numberOfLines={5}
                />

                {/* Anonymous Toggle */}
                <TouchableOpacity
                    style={styles.checkboxRow}
                    onPress={() => setIsAnonymous(!isAnonymous)}
                    activeOpacity={0.8}
                >
                    <View style={[styles.checkbox, isAnonymous && styles.checkboxChecked]}>
                        {isAnonymous && <Check color="#FFFFFF" size={12} />}
                    </View>
                    <View style={styles.checkboxLabelWrapper}>
                        <Text style={styles.checkboxLabel}>
                            {t('submit_anonymously', 'Submit Anonymously')}
                        </Text>
                        <Text style={styles.checkboxSub}>
                            {t('anonymous_desc', 'Your name and employee ID will not be attached to this submission.')}
                        </Text>
                    </View>
                </TouchableOpacity>

                {/* Submit Action */}
                <View style={styles.submitWrapper}>
                    <AppButton
                        title={t('submit_feedback', 'Submit Feedback')}
                        onPress={handleSubmit}
                        loading={isSubmitting}
                        icon={<Send color="#FFFFFF" size={18} />}
                    />
                </View>
            </AppCard>
        </AppShell>
    );
};

const stylesheet = StyleSheet.create((theme) => ({
    card: {
        marginTop: 6,
    },
    headerInfoRow: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
        marginBottom: 18,
    },
    iconBadge: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(37, 99, 235, 0.12)',
    },
    headerTextWrapper: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.textPrimary,
    },
    cardSub: {
        fontSize: 12,
        marginTop: 2,
        lineHeight: 16,
        color: theme.colors.textSecondary,
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        marginTop: 4,
        marginBottom: 16,
        gap: 12,
        backgroundColor: theme.colors.surfaceSubtle,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: theme.colors.border,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: {
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.primary,
    },
    checkboxLabelWrapper: {
        flex: 1,
    },
    checkboxLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: theme.colors.textPrimary,
    },
    checkboxSub: {
        fontSize: 11,
        marginTop: 1,
        lineHeight: 14,
        color: theme.colors.textSecondary,
    },
    submitWrapper: {
        marginTop: 6,
    },
}));
