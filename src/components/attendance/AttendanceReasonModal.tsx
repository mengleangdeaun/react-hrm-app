import React, { useState } from 'react';
import {
    View,
    Modal,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
} from 'react-native';
import { AlertCircle, Clock, Check, X } from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { AppText, AppText as Text } from '../AppText';

interface AttendanceReasonModalProps {
    visible: boolean;
    reasonType?: 'late' | 'early_departure' | string;
    delayMinutes?: number;
    isLoading?: boolean;
    onProceed: (reason: string) => void;
    onCancel: () => void;
}

const LATE_PRESETS = [
    'Heavy Traffic',
    'Vehicle Breakdown',
    'Severe Weather',
    'Personal Emergency',
    'Public Transport Delay',
    'Client Meeting',
];

const EARLY_PRESETS = [
    'Medical Appointment',
    'Family Emergency',
    'Approved Client Visit',
    'Feeling Unwell',
    'Personal Matter',
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
    const isLate = reasonType === 'late';
    const presets = isLate ? LATE_PRESETS : EARLY_PRESETS;

    const [selectedPreset, setSelectedPreset] = useState<string>('');
    const [customReason, setCustomReason] = useState<string>('');

    const handleSelectPreset = (preset: string) => {
        if (selectedPreset === preset) {
            setSelectedPreset('');
            setCustomReason('');
        } else {
            setSelectedPreset(preset);
            setCustomReason(preset);
        }
    };

    const finalReason = customReason.trim();
    const canSubmit = finalReason.length > 0;

    const handleSubmit = () => {
        if (!canSubmit || isLoading) return;
        onProceed(finalReason);
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onCancel}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.modalBackdrop}
            >
                <View style={[styles.sheetContent, isDark && styles.sheetContentDark]}>
                    {/* Header */}
                    <View style={styles.headerRow}>
                        <View style={styles.headerLeft}>
                            <View
                                style={[
                                    styles.iconBadge,
                                    isLate ? styles.iconBadgeLate : styles.iconBadgeEarly,
                                ]}
                            >
                                {isLate ? (
                                    <Clock color="#EA580C" size={20} />
                                ) : (
                                    <AlertCircle color="#E11D48" size={20} />
                                )}
                            </View>
                            <View>
                                <AppText style={[styles.title, isDark && styles.textLight]}>
                                    {isLate ? 'Late Arrival Reason' : 'Early Departure Reason'}
                                </AppText>
                                {delayMinutes > 0 && (
                                    <AppText style={styles.subtitle}>
                                        {isLate
                                            ? `Shift delayed by ~${delayMinutes} minutes`
                                            : `Departing ~${delayMinutes} minutes early`}
                                    </AppText>
                                )}
                            </View>
                        </View>
                        <TouchableOpacity
                            style={styles.closeBtn}
                            onPress={onCancel}
                            disabled={isLoading}
                        >
                            <X color={isDark ? '#94A3B8' : '#64748B'} size={20} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollBody}
                    >
                        {/* Policy note */}
                        <View style={[styles.infoBox, isDark && styles.infoBoxDark]}>
                            <AppText style={[styles.infoText, isDark && styles.infoTextDark]}>
                                Company policy requires an authorized reason for {isLate ? 'late check-in' : 'early departure'}.
                            </AppText>
                        </View>

                        {/* Quick Presets */}
                        <AppText style={[styles.sectionLabel, isDark && styles.textLight]}>
                            Quick Select Reason:
                        </AppText>
                        <View style={styles.presetsGrid}>
                            {presets.map((item) => {
                                const active = selectedPreset === item;
                                return (
                                    <TouchableOpacity
                                        key={item}
                                        style={[
                                            styles.presetChip,
                                            isDark && styles.presetChipDark,
                                            active && styles.presetChipActive,
                                        ]}
                                        onPress={() => handleSelectPreset(item)}
                                        activeOpacity={0.7}
                                    >
                                        {active && <Check size={14} color="#FFFFFF" style={{ marginRight: 4 }} />}
                                        <AppText
                                            style={[
                                                styles.presetText,
                                                isDark && styles.textLight,
                                                active && styles.presetTextActive,
                                            ]}
                                        >
                                            {item}
                                        </AppText>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Custom Reason Input */}
                        <AppText style={[styles.sectionLabel, isDark && styles.textLight]}>
                            Or specify custom explanation:
                        </AppText>
                        <TextInput
                            style={[styles.input, isDark && styles.inputDark]}
                            placeholder="Enter detailed reason here..."
                            placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                            multiline
                            numberOfLines={3}
                            value={customReason}
                            onChangeText={(text: string) => {
                                setCustomReason(text);
                                setSelectedPreset('');
                            }}
                            maxLength={300}
                        />

                        {/* Action Buttons */}
                        <TouchableOpacity
                            style={[
                                styles.submitButton,
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
                                    Submit & Record Attendance
                                </AppText>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={onCancel}
                            disabled={isLoading}
                        >
                            <AppText style={styles.cancelButtonText}>Cancel</AppText>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'flex-end',
    },
    sheetContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: Platform.OS === 'ios' ? 36 : 24,
        maxHeight: '88%',
    },
    sheetContentDark: {
        backgroundColor: '#0F172A',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconBadge: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconBadgeLate: {
        backgroundColor: 'rgba(234, 88, 12, 0.15)',
    },
    iconBadgeEarly: {
        backgroundColor: 'rgba(225, 29, 72, 0.15)',
    },
    title: {
        fontSize: 17,
        fontWeight: '700',
        color: '#0F172A',
    },
    subtitle: {
        fontSize: 12,
        color: '#EA580C',
        fontWeight: '600',
        marginTop: 2,
    },
    textLight: {
        color: '#F8FAFC',
    },
    closeBtn: {
        padding: 8,
        borderRadius: 12,
    },
    scrollBody: {
        paddingBottom: 16,
    },
    infoBox: {
        backgroundColor: '#F8FAFC',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 16,
    },
    infoBoxDark: {
        backgroundColor: 'rgba(30, 41, 59, 0.5)',
        borderColor: '#334155',
    },
    infoText: {
        fontSize: 12,
        color: '#475569',
        lineHeight: 16,
    },
    infoTextDark: {
        color: '#94A3B8',
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#334155',
        marginBottom: 10,
        marginTop: 4,
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
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    presetChipDark: {
        backgroundColor: '#1E293B',
        borderColor: '#334155',
    },
    presetChipActive: {
        backgroundColor: '#2563EB',
        borderColor: '#2563EB',
    },
    presetText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#334155',
    },
    presetTextActive: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    input: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderRadius: 16,
        padding: 14,
        fontSize: 14,
        color: '#0F172A',
        minHeight: 80,
        textAlignVertical: 'top',
        marginBottom: 20,
    },
    inputDark: {
        backgroundColor: '#1E293B',
        borderColor: '#334155',
        color: '#F8FAFC',
    },
    submitButton: {
        backgroundColor: '#2563EB',
        borderRadius: 16,
        paddingVertical: 15,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    submitButtonDisabled: {
        backgroundColor: '#94A3B8',
        shadowOpacity: 0,
        elevation: 0,
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
    cancelButton: {
        paddingVertical: 12,
        alignItems: 'center',
        marginTop: 4,
    },
    cancelButtonText: {
        color: '#64748B',
        fontSize: 14,
        fontWeight: '600',
    },
});
