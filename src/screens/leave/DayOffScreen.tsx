import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    Alert,
} from 'react-native';
import { AppText as Text } from '../../components/AppText';
import { format } from 'date-fns';
import { RefreshCw, Calendar, Users, FileText } from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { lightTheme, darkTheme } from '../../styles/theme';
import { AppShell } from '../../components/common/AppShell';
import { AppCard } from '../../components/common/AppCard';
import { AppInput } from '../../components/common/AppInput';
import { AppButton } from '../../components/common/AppButton';
import { NativeDatePickerField } from '../../components/common/NativeDatePickerField';

import { useTranslation } from '../../context/LanguageContext';

export const DayOffScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const { isDark } = useAppTheme();
    const { t } = useTranslation();
    const theme = isDark ? darkTheme : lightTheme;

    const [targetDate, setTargetDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
    const [swapEmployee, setSwapEmployee] = useState('');
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = () => {
        if (!reason.trim()) {
            Alert.alert(t('required', 'Required'), t('enter_swap_reason_alert', 'Please enter a reason for off-day / shift swap request.'));
            return;
        }

        setIsSubmitting(true);
        setTimeout(() => {
            setIsSubmitting(false);
            Alert.alert(
                t('request_sent', 'Request Sent! 🎉'),
                t('swap_submitted_desc', 'Your off-day / shift swap request has been submitted for supervisor review.'),
                [{ text: t('ok', 'OK'), onPress: () => navigation.goBack() }]
            );
        }, 600);
    };

    return (
        <AppShell title={t('off_day_shift_swap', 'Off-Day & Shift Swap')} onBack={() => navigation.goBack()}>
            <AppCard variant="surface" style={styles.card}>
                <View style={styles.headerInfoRow}>
                    <View style={[styles.iconBadge, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
                        <Calendar color="#EF4444" size={20} />
                    </View>
                    <View style={styles.headerTextWrapper}>
                        <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
                            {t('request_rest_day_swap', 'Request Rest Day Swap')}
                        </Text>
                        <Text style={[styles.cardSub, { color: theme.colors.textSecondary }]}>
                            {t('request_rest_day_desc', 'Adjust your assigned rest day or arrange a swap with a teammate.')}
                        </Text>
                    </View>
                </View>

                {/* Target Date Picker */}
                <NativeDatePickerField
                    label={t('target_off_day_date', 'Target Off-Day Date')}
                    value={targetDate}
                    onChange={setTargetDate}
                />

                {/* Substitute Colleague */}
                <AppInput
                    label={t('substitute_colleague_label', 'Substitute Colleague (Shift Swap Optional)')}
                    value={swapEmployee}
                    onChangeText={setSwapEmployee}
                    placeholder={t('enter_colleague_placeholder', 'Enter colleague name or code (optional)')}
                    icon={<Users color={theme.colors.textSecondary} size={18} />}
                />

                {/* Reason Input */}
                <AppInput
                    label={t('reason_for_request', 'Reason for Request')}
                    value={reason}
                    onChangeText={setReason}
                    placeholder={t('explain_swap_reason', 'Explain why you are requesting this off-day / shift swap...')}
                    multiline
                    numberOfLines={4}
                    icon={<FileText color={theme.colors.textSecondary} size={18} />}
                />

                {/* Submit Action */}
                <View style={styles.submitWrapper}>
                    <AppButton
                        title={t('submit_swap_request', 'Submit Swap Request')}
                        onPress={handleSubmit}
                        loading={isSubmitting}
                        icon={<RefreshCw color="#FFFFFF" size={18} />}
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
    submitWrapper: {
        marginTop: 12,
    },
});
