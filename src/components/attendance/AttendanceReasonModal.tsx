import React, { useState } from 'react';
import {
    View,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    StyleSheet,
} from 'react-native';
import { AlertCircle, Clock, Check } from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';
import { lightTheme, darkTheme } from '../../styles/theme';
import { AppText } from '../AppText';
import { AppBottomSheet } from '../common/AppBottomSheet';

interface AttendanceReasonModalProps {
    visible: boolean;
    reasonType?: 'late' | 'early_departure' | string;
    delayMinutes?: number;
    isLoading?: boolean;
    onProceed: (reason: string) => void;
    onCancel: () => void;
}

const LATE_PRESETS = [
    { key: 'preset_heavy_traffic', fallback: 'Heavy Traffic' },
    { key: 'preset_vehicle_breakdown', fallback: 'Vehicle Breakdown' },
    { key: 'preset_severe_weather', fallback: 'Severe Weather' },
    { key: 'preset_personal_emergency', fallback: 'Personal Emergency' },
    { key: 'preset_public_transport', fallback: 'Public Transport Delay' },
    { key: 'preset_client_meeting', fallback: 'Client Meeting' },
];

const EARLY_PRESETS = [
    { key: 'preset_medical_appointment', fallback: 'Medical Appointment' },
    { key: 'preset_family_emergency', fallback: 'Family Emergency' },
    { key: 'preset_client_visit', fallback: 'Approved Client Visit' },
    { key: 'preset_feeling_unwell', fallback: 'Feeling Unwell' },
    { key: 'preset_personal_matter', fallback: 'Personal Matter' },
];

export const AttendanceReasonModal: React.FC<AttendanceReasonModalProps> = ({
    visible,
    reasonType = 'late',
    delayMinutes = 0,
    isLoading = false,
    onProceed,
    onCancel,
}) => {
    const { isDark } = useAppTheme();
    const { t } = useTranslation();
    const theme = isDark ? darkTheme : lightTheme;

    const isLate = reasonType === 'late';
    const presets = isLate ? LATE_PRESETS : EARLY_PRESETS;

    const [selectedPreset, setSelectedPreset] = useState<string>('');
    const [customReason, setCustomReason] = useState<string>('');

    const handleSelectPreset = (presetLabel: string) => {
        if (selectedPreset === presetLabel) {
            setSelectedPreset('');
            setCustomReason('');
        } else {
            setSelectedPreset(presetLabel);
            setCustomReason(presetLabel);
        }
    };

    const finalReason = customReason.trim();
    const canSubmit = finalReason.length > 0;

    const handleSubmit = () => {
        if (!canSubmit || isLoading) return;
        onProceed(finalReason);
    };

    const title = isLate
        ? t('late_arrival_reason', 'Late Arrival Reason')
        : t('early_departure_reason', 'Early Departure Reason');

    const subtitle = delayMinutes > 0
        ? (isLate
            ? `${t('shift_delayed_by', 'Shift delayed by')} ~${delayMinutes} ${t('mins', 'mins')}`
            : `${t('departing_early_by', 'Departing')} ~${delayMinutes} ${t('mins_early', 'mins early')}`)
        : undefined;

    return (
        <AppBottomSheet
            visible={visible}
            onClose={onCancel}
            title={title}
            subtitle={subtitle}
            footer={
                <TouchableOpacity
                    style={[
                        styles.submitButton,
                        { backgroundColor: theme.colors.brand },
                        !canSubmit && styles.submitButtonDisabled,
                    ]}
                    onPress={handleSubmit}
                    disabled={!canSubmit || isLoading}
                    activeOpacity={0.85}
                >
                    {isLoading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                        <AppText style={styles.submitButtonText}>
                            {t('confirm_and_submit_attendance', 'Confirm & Submit Attendance')}
                        </AppText>
                    )}
                </TouchableOpacity>
            }
        >
            {/* Policy note */}
            <View style={[styles.infoBox, { backgroundColor: theme.colors.surfaceSubtle, borderColor: theme.colors.border }]}>
                <AppText style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                    {t('policy_reason_note', 'Company policy requires an authorized explanation for attendance adjustments.')}
                </AppText>
            </View>

            {/* Quick Presets */}
            <AppText style={[styles.sectionLabel, { color: theme.colors.textPrimary }]}>
                {t('quick_select_reason', 'Quick Select Reason:')}
            </AppText>
            <View style={styles.presetsGrid}>
                {presets.map((item) => {
                    const localizedLabel = t(item.key, item.fallback);
                    const active = selectedPreset === localizedLabel;
                    return (
                        <TouchableOpacity
                            key={item.key}
                            style={[
                                styles.presetChip,
                                {
                                    backgroundColor: active ? theme.colors.brand : theme.colors.surfaceSubtle,
                                    borderColor: active ? theme.colors.brand : theme.colors.border,
                                },
                            ]}
                            onPress={() => handleSelectPreset(localizedLabel)}
                            activeOpacity={0.7}
                        >
                            {active && <Check size={14} color="#FFFFFF" style={{ marginRight: 4 }} />}
                            <AppText
                                style={[
                                    styles.presetText,
                                    { color: active ? '#FFFFFF' : theme.colors.textPrimary },
                                    active && { fontWeight: '700' },
                                ]}
                            >
                                {localizedLabel}
                            </AppText>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Custom Reason Input */}
            <AppText style={[styles.sectionLabel, { color: theme.colors.textPrimary }]}>
                {t('or_custom_explanation', 'Or specify custom explanation:')}
            </AppText>
            <TextInput
                style={[
                    styles.input,
                    {
                        backgroundColor: theme.colors.surfaceSubtle,
                        borderColor: theme.colors.border,
                        color: theme.colors.textPrimary,
                    },
                ]}
                placeholder={t('enter_detailed_reason', 'Enter detailed reason here...')}
                placeholderTextColor={theme.colors.textDisabled}
                multiline
                numberOfLines={3}
                value={customReason}
                onChangeText={(text: string) => {
                    setCustomReason(text);
                    setSelectedPreset('');
                }}
                maxLength={300}
            />
        </AppBottomSheet>
    );
};

const styles = StyleSheet.create({
    infoBox: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 12,
        marginBottom: 14,
    },
    infoText: {
        fontSize: 12,
        lineHeight: 17,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    presetsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    presetChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
    },
    presetText: {
        fontSize: 13,
    },
    input: {
        borderRadius: 14,
        borderWidth: 1,
        padding: 12,
        fontSize: 14,
        minHeight: 80,
        textAlignVertical: 'top',
        marginBottom: 12,
    },
    submitButton: {
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitButtonDisabled: {
        opacity: 0.45,
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
});
