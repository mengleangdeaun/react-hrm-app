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

export const DayOffScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const { isDark } = useAppTheme();
    const theme = isDark ? darkTheme : lightTheme;

    const [targetDate, setTargetDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
    const [swapEmployee, setSwapEmployee] = useState('');
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = () => {
        if (!reason.trim()) {
            Alert.alert('Required', 'Please enter a reason for off-day / shift swap request.');
            return;
        }

        setIsSubmitting(true);
        setTimeout(() => {
            setIsSubmitting(false);
            Alert.alert(
                'Request Sent! 🎉',
                'Your off-day / shift swap request has been submitted for supervisor review.',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        }, 600);
    };

    return (
        <AppShell title="Off-Day & Shift Swap" onBack={() => navigation.goBack()}>
            <AppCard variant="surface" style={styles.card}>
                <View style={styles.headerInfoRow}>
                    <View style={[styles.iconBadge, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
                        <Calendar color="#EF4444" size={20} />
                    </View>
                    <View style={styles.headerTextWrapper}>
                        <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
                            Request Rest Day Swap
                        </Text>
                        <Text style={[styles.cardSub, { color: theme.colors.textSecondary }]}>
                            Adjust your assigned rest day or arrange a swap with a teammate.
                        </Text>
                    </View>
                </View>

                {/* Target Date Picker */}
                <NativeDatePickerField
                    label="Target Off-Day Date"
                    value={targetDate}
                    onChange={setTargetDate}
                />

                {/* Substitute Colleague */}
                <AppInput
                    label="Substitute Colleague (Shift Swap Optional)"
                    value={swapEmployee}
                    onChangeText={setSwapEmployee}
                    placeholder="Enter colleague name or code (optional)"
                    icon={<Users color={theme.colors.textSecondary} size={18} />}
                />

                {/* Reason Input */}
                <AppInput
                    label="Reason for Request"
                    value={reason}
                    onChangeText={setReason}
                    placeholder="Explain why you are requesting this off-day / shift swap..."
                    multiline
                    numberOfLines={4}
                    icon={<FileText color={theme.colors.textSecondary} size={18} />}
                />

                {/* Submit Action */}
                <View style={styles.submitWrapper}>
                    <AppButton
                        title="Submit Swap Request"
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
