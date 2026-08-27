import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { AppText as Text } from '../../components/AppText';
import { Send, MessageSquare, ShieldCheck, Check } from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { lightTheme, darkTheme } from '../../styles/theme';
import { AppShell } from '../../components/common/AppShell';
import { AppCard } from '../../components/common/AppCard';
import { AppInput } from '../../components/common/AppInput';
import { AppButton } from '../../components/common/AppButton';

export const FeedbackScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const { isDark } = useAppTheme();
    const theme = isDark ? darkTheme : lightTheme;

    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = () => {
        if (!subject.trim() || !message.trim()) {
            Alert.alert('Required', 'Please enter a subject and your feedback details.');
            return;
        }

        setIsSubmitting(true);
        setTimeout(() => {
            setIsSubmitting(false);
            Alert.alert(
                'Feedback Submitted! 🙏',
                'Thank you for your valuable feedback. HR management will review it shortly.',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        }, 600);
    };

    return (
        <AppShell title="Suggestion & Feedback" onBack={() => navigation.goBack()}>
            <AppCard variant="surface" style={styles.card}>
                <View style={styles.headerInfoRow}>
                    <View style={[styles.iconBadge, { backgroundColor: 'rgba(37, 99, 235, 0.12)' }]}>
                        <MessageSquare color="#2563EB" size={20} />
                    </View>
                    <View style={styles.headerTextWrapper}>
                        <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
                            Share Your Thoughts
                        </Text>
                        <Text style={[styles.cardSub, { color: theme.colors.textSecondary }]}>
                            Help us improve our workplace and operations.
                        </Text>
                    </View>
                </View>

                {/* Subject Input */}
                <AppInput
                    label="Topic / Subject"
                    value={subject}
                    onChangeText={setSubject}
                    placeholder="e.g., Office cafeteria menu suggestion"
                />

                {/* Detailed Feedback */}
                <AppInput
                    label="Detailed Feedback"
                    value={message}
                    onChangeText={setMessage}
                    placeholder="Provide your constructive feedback or suggestions..."
                    multiline
                    numberOfLines={5}
                />

                {/* Anonymous Toggle */}
                <TouchableOpacity
                    style={[styles.checkboxRow, { backgroundColor: theme.colors.surfaceSubtle }]}
                    onPress={() => setIsAnonymous(!isAnonymous)}
                    activeOpacity={0.8}
                >
                    <View
                        style={[
                            styles.checkbox,
                            {
                                borderColor: isAnonymous ? theme.colors.primary : theme.colors.border,
                                backgroundColor: isAnonymous ? theme.colors.primary : 'transparent',
                            },
                        ]}
                    >
                        {isAnonymous && <Check color="#FFFFFF" size={12} />}
                    </View>
                    <View style={styles.checkboxLabelWrapper}>
                        <Text style={[styles.checkboxLabel, { color: theme.colors.textPrimary }]}>
                            Submit Anonymously
                        </Text>
                        <Text style={[styles.checkboxSub, { color: theme.colors.textSecondary }]}>
                            Your name and employee ID will not be attached to this submission.
                        </Text>
                    </View>
                </TouchableOpacity>

                {/* Submit Action */}
                <View style={styles.submitWrapper}>
                    <AppButton
                        title="Submit Feedback"
                        onPress={handleSubmit}
                        loading={isSubmitting}
                        icon={<Send color="#FFFFFF" size={18} />}
                    />
                </View>
            </AppCard>
        </AppShell>
    );
};

const styles = StyleSheet.create({
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
    },
    headerTextWrapper: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    cardSub: {
        fontSize: 12,
        marginTop: 2,
        lineHeight: 16,
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        marginTop: 4,
        marginBottom: 16,
        gap: 12,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxLabelWrapper: {
        flex: 1,
    },
    checkboxLabel: {
        fontSize: 13,
        fontWeight: '700',
    },
    checkboxSub: {
        fontSize: 11,
        marginTop: 1,
        lineHeight: 14,
    },
    submitWrapper: {
        marginTop: 6,
    },
});
