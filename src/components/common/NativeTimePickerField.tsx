import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    TouchableOpacity,
    StyleSheet,
} from 'react-native';
import { AppText as Text } from '../AppText';
import { AppBottomSheet } from './AppBottomSheet';
import * as Haptics from 'expo-haptics';
import { Clock, X, Check, ChevronUp, ChevronDown } from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { lightTheme, darkTheme } from '../../styles/theme';
import { formatTimeDisplay } from '../../utils/dateTime';

export interface NativeTimePickerFieldProps {
    label?: string;
    value: string; // HH:mm (24-hour format)
    onChange: (timeStr: string) => void;
    containerStyle?: any;
    error?: string;
}

const COMMON_PRESETS = ['08:00', '08:30', '09:00', '12:00', '13:00', '17:00', '17:30', '18:00'];

export const NativeTimePickerField: React.FC<NativeTimePickerFieldProps> = ({
    label,
    value,
    onChange,
    containerStyle,
    error,
}) => {
    const { isDark } = useAppTheme();
    const theme = isDark ? darkTheme : lightTheme;

    const [modalVisible, setModalVisible] = useState(false);

    // Parse Initial HH and mm from value prop safely
    const parsedTime = useMemo(() => {
        const parts = (value || '08:00').split(':');
        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        return {
            hours: isNaN(h) ? 8 : Math.min(23, Math.max(0, h)),
            minutes: isNaN(m) ? 0 : Math.min(59, Math.max(0, m)),
        };
    }, [value]);

    const [hours, setHours] = useState<number>(parsedTime.hours);
    const [minutes, setMinutes] = useState<number>(parsedTime.minutes);

    useEffect(() => {
        setHours(parsedTime.hours);
        setMinutes(parsedTime.minutes);
    }, [parsedTime]);

    const formattedDisplay = value ? formatTimeDisplay(value) : 'Select Time';

    const handleOpen = () => {
        setHours(parsedTime.hours);
        setMinutes(parsedTime.minutes);
        setModalVisible(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    };

    const handleConfirm = () => {
        const hStr = hours < 10 ? `0${hours}` : `${hours}`;
        const mStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
        onChange(`${hStr}:${mStr}`);
        setModalVisible(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    };

    const handlePreset = (preset: string) => {
        const parts = preset.split(':');
        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        setHours(h);
        setMinutes(m);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    };

    const stepHour = (delta: number) => {
        setHours((prev) => {
            let next = (prev + delta) % 24;
            if (next < 0) next += 24;
            return next;
        });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    };

    const stepMinute = (delta: number) => {
        setMinutes((prev) => {
            let next = (prev + delta) % 60;
            if (next < 0) next += 60;
            return next;
        });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    };

    const toggleAmPm = () => {
        setHours((prev) => (prev >= 12 ? prev - 12 : prev + 12));
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    };

    const modalDisplayTime = useMemo(() => {
        const hStr = hours < 10 ? `0${hours}` : `${hours}`;
        const mStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
        return formatTimeDisplay(`${hStr}:${mStr}`);
    }, [hours, minutes]);

    return (
        <View style={[styles.container, containerStyle]}>
            {label && (
                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
                    {label}
                </Text>
            )}

            <TouchableOpacity
                onPress={handleOpen}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={`${label || 'Select Time'}: ${formattedDisplay}`}
                style={[
                    styles.fieldWrapper,
                    {
                        backgroundColor: theme.colors.surface,
                        borderColor: error ? theme.colors.status.danger : theme.colors.border,
                    },
                ]}
            >
                <View style={styles.iconContainer}>
                    <Clock color={theme.colors.primary} size={18} />
                </View>
                <Text
                    style={[
                        styles.fieldText,
                        {
                            color: value ? theme.colors.textPrimary : theme.colors.textDisabled,
                        },
                    ]}
                >
                    {formattedDisplay}
                </Text>
            </TouchableOpacity>

            {error && (
                <Text style={[styles.errorText, { color: theme.colors.status.danger }]}>
                    {error}
                </Text>
            )}

            {/* Native Time Picker Bottom Sheet Modal */}
            <AppBottomSheet
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                title={label || 'Select Time'}
                footer={
                    <TouchableOpacity
                        onPress={handleConfirm}
                        style={[styles.confirmBtn, { backgroundColor: theme.colors.primary }]}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.confirmBtnText}>
                            Select {modalDisplayTime}
                        </Text>
                    </TouchableOpacity>
                }
            >
                {/* Quick Presets */}
                <View style={styles.presetsWrapper}>
                    {COMMON_PRESETS.map((p) => {
                        const isCurrent = value === p;
                        return (
                            <TouchableOpacity
                                key={p}
                                onPress={() => handlePreset(p)}
                                style={[
                                    styles.presetChip,
                                    {
                                        backgroundColor: isCurrent ? theme.colors.primary : theme.colors.surfaceSubtle,
                                        borderColor: isCurrent ? theme.colors.primary : theme.colors.border,
                                    },
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.presetText,
                                        { color: isCurrent ? '#FFFFFF' : theme.colors.textPrimary },
                                    ]}
                                >
                                    {formatTimeDisplay(p)}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Interactive Time Selector */}
                <View style={styles.pickerBody}>
                    {/* Hours Column */}
                    <View style={styles.pickerCol}>
                        <TouchableOpacity
                            onPress={() => stepHour(1)}
                            style={[styles.arrowBtn, { backgroundColor: theme.colors.surfaceSubtle }]}
                            accessibilityRole="button"
                            accessibilityLabel="Increment hour"
                        >
                            <ChevronUp color={theme.colors.textPrimary} size={22} />
                        </TouchableOpacity>

                        <View style={[styles.numberBox, { backgroundColor: theme.colors.surfaceSubtle, borderColor: theme.colors.border }]}>
                            <Text style={[styles.numberText, { color: theme.colors.textPrimary }]}>
                                {hours < 10 ? `0${hours}` : `${hours}`}
                            </Text>
                        </View>

                        <TouchableOpacity
                            onPress={() => stepHour(-1)}
                            style={[styles.arrowBtn, { backgroundColor: theme.colors.surfaceSubtle }]}
                            accessibilityRole="button"
                            accessibilityLabel="Decrement hour"
                        >
                            <ChevronDown color={theme.colors.textPrimary} size={22} />
                        </TouchableOpacity>
                    </View>

                    <Text style={[styles.colonText, { color: theme.colors.textPrimary }]}>:</Text>

                    {/* Minutes Column */}
                    <View style={styles.pickerCol}>
                        <TouchableOpacity
                            onPress={() => stepMinute(5)}
                            style={[styles.arrowBtn, { backgroundColor: theme.colors.surfaceSubtle }]}
                            accessibilityRole="button"
                            accessibilityLabel="Increment minutes by 5"
                        >
                            <ChevronUp color={theme.colors.textPrimary} size={22} />
                        </TouchableOpacity>

                        <View style={[styles.numberBox, { backgroundColor: theme.colors.surfaceSubtle, borderColor: theme.colors.border }]}>
                            <Text style={[styles.numberText, { color: theme.colors.textPrimary }]}>
                                {minutes < 10 ? `0${minutes}` : `${minutes}`}
                            </Text>
                        </View>

                        <TouchableOpacity
                            onPress={() => stepMinute(-5)}
                            style={[styles.arrowBtn, { backgroundColor: theme.colors.surfaceSubtle }]}
                            accessibilityRole="button"
                            accessibilityLabel="Decrement minutes by 5"
                        >
                            <ChevronDown color={theme.colors.textPrimary} size={22} />
                        </TouchableOpacity>
                    </View>

                    {/* AM / PM Toggle */}
                    <TouchableOpacity
                        onPress={toggleAmPm}
                        style={[styles.periodBadge, { backgroundColor: theme.colors.primarySubtle }]}
                        accessibilityRole="button"
                        accessibilityLabel={`Toggle AM PM, currently ${hours >= 12 ? 'PM' : 'AM'}`}
                    >
                        <Text style={[styles.periodText, { color: theme.colors.primary }]}>
                            {hours >= 12 ? 'PM' : 'AM'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </AppBottomSheet>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 14,
        width: '100%',
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 6,
        letterSpacing: 0.2,
    },
    fieldWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 48,
        borderRadius: 12,
        borderWidth: 1.5,
        paddingHorizontal: 12,
    },
    iconContainer: {
        marginRight: 10,
    },
    fieldText: {
        fontSize: 14,
        fontWeight: '600',
    },
    errorText: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 4,
        marginLeft: 2,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        justifyContent: 'flex-end',
    },
    backdropDismiss: {
        flex: 1,
    },
    sheetContainer: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderTopWidth: 1,
        paddingHorizontal: 20,
        paddingBottom: 36,
        paddingTop: 10,
    },
    sheetHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(150, 150, 150, 0.4)',
        alignSelf: 'center',
        marginBottom: 14,
    },
    sheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    circleBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sheetTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    presetsWrapper: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 18,
        justifyContent: 'center',
    },
    presetChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
    },
    presetText: {
        fontSize: 12,
        fontWeight: '600',
    },
    stepperContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
        marginBottom: 20,
    },
    stepperCol: {
        alignItems: 'center',
        gap: 6,
    },
    stepperArrowBtn: {
        width: 44,
        height: 34,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepperValueBox: {
        width: 64,
        height: 58,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepperValueText: {
        fontSize: 26,
        fontWeight: '800',
        lineHeight: 30,
    },
    stepperUnitLabel: {
        fontSize: 9,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    stepperColon: {
        fontSize: 28,
        fontWeight: '800',
    },
    periodBadge: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        alignSelf: 'center',
    },
    periodText: {
        fontSize: 14,
        fontWeight: '800',
    },
    confirmBtn: {
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    confirmBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
});
